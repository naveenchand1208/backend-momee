const MediaGallery = require('../models/mediaGallery')
const moment = require('moment');
const { uploadToCloudinary, deleteFromCloudinary } = require('../helpers/cloudinary');

exports.add = async (req, res, next) => {
    try {
        const { title, description, fileType, driveId, webViewLink, webContentLink } = req.bodyParams;
        console.log('req.bodyParams', req.bodyParams)
        if (!title || !description || !fileType || !driveId || !webViewLink || !webContentLink) {
            return res.apiResponse(false, 'Gallery params is missing', {}, 400);
        }

        const uniqueId = `MediaGallery-${moment().format('DDMMYYYYHHmmss')}`;
        const newMedia = new MediaGallery({
            title,
            description,
            fileType,
            driveId,
            webViewLink,
            webContentLink,
            id: uniqueId,
            userId: req.userDetails.id
        });
        console.log('newMedia', newMedia)

        await newMedia.save();
        return res.apiResponse(true, "Gallery added Success", newMedia, 200);
    } catch (error) {
        console.error("Add Gallery Error:", error);
        return res.apiResponse(false, 'Gallery Add error', { error }, 500);
    }
}

exports.list = async (req, res, next) => {
    try {
        const requests = req.bodyParams;
        const page = requests.page || 1;
        const per_page = requests.limit || 10;
        const pagination = requests.pagination || "true";
        const skip = (page - 1) * per_page;
        const match = {};
        const sortField = requests.sortField || 'createdAt';
        const sortOrder = requests.sortOrder === 'asc' ? 1 : -1;

        match['userId'] = req.userDetails.id;

        if (requests.id && requests.id !== '') {
            match['id'] = requests.id;
        }
        if (req.userDetails && req.userDetails.momType) {
            match['momType'] = req.userDetails.momType;
        }
        if (requests.status && requests.status !== '') {
            match['status'] = requests.status;
        }
        if (requests.fileType && requests.fileType !== '') {
            match['fileType'] = requests.fileType;
        }
        if (requests.fromDate || requests.toDate) {
            let startDate = moment(requests.fromDate);
            let endDate = moment(requests.toDate);
            if (startDate.isValid() && endDate.isValid()) {
                match.createdAt = {
                    $gte: startDate.startOf('day').toDate(),
                    $lte: endDate.endOf('day').toDate()
                };
            } else if (startDate.isValid() && !endDate.isValid()) {
                match.createdAt = {
                    $gte: startDate.startOf('day').toDate(),
                    $lte: startDate.endOf('day').toDate()
                };
            }
        }
        if (requests.searchKey !== undefined && requests.searchKey.trim() !== '') {
            const searchTerm = requests.searchKey.trim();
            match['title'] = { $regex: searchTerm, $options: 'i' };
        }
        const options = {
            page: page,
            limit: per_page,
            skip: skip,
            sort: { [sortField]: sortOrder },
        };
        if (pagination === "true") {
            options.sort = { createdAt: -1 };
            MediaGallery.paginate(match, options, function (err, data) {
                if (err) {
                    return res.apiResponse(false, "Error while fetching lists", {}, 404);
                }
                return res.apiResponse(true, "Success", data, 200);
            });
        } else {
            let galleries = [];
            const query = Object.keys(match).length === 0
                ? MediaGallery.find({})
                : MediaGallery.find(match);
            galleries = await query.sort({ createdAt: -1 });
            return res.apiResponse(true, "Success", { docs: galleries }, 200);
        }
    } catch (error) {
        return res.apiResponse(false, 'Get list error', {}, 500);
    }
}

exports.view = async (req, res, next) => {
    try {
        var requests = req.bodyParams;
        if (!requests.id) {
            return res.apiResponse(false, 'Id is missing', {}, 400);
        }
        const gallery = await MediaGallery.findOne({ id: requests.id })
        if (!gallery) {
            return res.apiResponse(false, 'Gallery not found', {}, 404);
        }
        return res.apiResponse(true, 'Success', gallery, 200);
    } catch (error) {
        return res.apiResponse(false, 'get Gallery error', {}, 500)
    }
}

exports.update = async (req, res, next) => {
    try {
        if (req.bodyParams) {
            const body = Object(req.bodyParams);
            const { id } = body;
            if (id === undefined || id === null) {
                return res.apiResponse(false, 'Id is missing', {}, 400);
            }
            const updateFields = {};
            if (req.bodyParams.title) updateFields.title = req.bodyParams.title;
            if (req.bodyParams.description) updateFields.description = req.bodyParams.description;
            if (req.bodyParams.fileType) updateFields.fileType = req.bodyParams.fileType;
            if (req.bodyParams.driveId) updateFields.driveId = req.bodyParams.driveId;
            if (req.bodyParams.webViewLink) updateFields.webViewLink = req.bodyParams.webViewLink;
            if (req.bodyParams.webContentLink) updateFields.webContentLink = req.bodyParams.webContentLink;
            if (req.bodyParams.status) updateFields.status = req.bodyParams.status;
            const updatedGallery = await MediaGallery.findOneAndUpdate(
                { id },
                { $set: updateFields },
                { new: true }
            );
            if (!updatedGallery) {
                return res.apiResponse(false, 'Gallery not found', {}, 404);
            }
            return res.apiResponse(true, 'Gallery updated successfully', updatedGallery, 200);
        } else {
            return res.apiResponse(false, 'Payload is missing', {}, 400);
        }
    } catch (error) {
        console.error('Update Error:', error);
        return res.apiResponse(false, 'Error updating Gallery', {}, 500);
    }

};

exports.delete = async (req, res, next) => {
    try {
        var requests = req.bodyParams;
        if (!requests.id) {
            return res.apiResponse(false, 'Id is missing', {}, 400);
        }
        const gallery = await MediaGallery.findOne({ id: requests.id })
        if (!gallery) {
            return res.apiResponse(false, 'Gallery not found', {}, 404)
        }
        const result = await MediaGallery.deleteOne({ id: requests.id });

        if (result.deletedCount === 0) {
            return res.apiResponse(false, 'Gallery not found', {}, 404)
        }
        return res.apiResponse(true, 'Gallery deleted successfully', result, 200)
    } catch (error) {
        return res.apiResponse(false, 'Delete Gallery error', { error }, 500)
    }
}