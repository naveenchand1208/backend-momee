const Banner = require('../models/banner')
const moment = require('moment');
const { uploadToCloudinary, deleteFromCloudinary } = require('../helpers/cloudinary');

exports.add = async (req, res, next) => {
    try {
        const { type, url } = req.body;
        if (!type || !req.file) {
            return res.apiResponse(false, 'Banner params is missing', {}, 400);
        }
        const { secure_url, public_id } = await uploadToCloudinary(req.file, 'banners');
        const now = moment().format('DDMMYYYYHHmmss');
        const uniqueId = `Banner-${now}`;
        const newBanner = new Banner({
            type,
            url: url? url : "",
            file: secure_url,
            public_id: public_id,
            id: uniqueId
        });
        await newBanner.save()
        return res.apiResponse(true, "Banner added Success", newBanner, 200);
    } catch (error) {
        return res.apiResponse(false, 'Banner Add error', {}, 500);
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

        if (requests.id && requests.id !== '') {
            match['id'] = requests.id;
        }
        if (requests.status && requests.status !== '') {
            match['status'] = requests.status;
        }
        if (requests.type && requests.type !== '') {
            match['type'] = requests.type;
        }
        // if (requests.searchKey !== undefined && requests.searchKey.trim() !== '') {
        //     const searchTerm = requests.searchKey.trim();
        //     match['name'] = { $regex: searchTerm, $options: 'i' };
        // }
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
        const options = {
            page: page,
            limit: per_page,
            skip: skip,
            sort: { [sortField]: sortOrder },
        };
        if (pagination === "true") {
            options.sort = { createdAt: -1 };
            Banner.paginate(match, options, function (err, data) {
                if (err) {
                    return res.apiResponse(false, "Error while fetching lists", {}, 404);
                }
                return res.apiResponse(true, "Success", data, 200);
            });
        } else {
            let Banners = [];
            const query = Object.keys(match).length === 0
                ? Banner.find({})
                : Banner.find(match);

            Banners = await query
                .populate({
                    path: 'category',
                    select: 'title color file'
                })
                .sort({ createdAt: -1 });
            return res.apiResponse(true, "Success", { docs: Banners }, 200);
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
        const banner = await Banner.findOne({ id: requests.id })
        if (!banner) {
            return res.apiResponse(false, 'Banner not found', {}, 404);
        }
        return res.apiResponse(true, 'Success', banner, 200);
    } catch (error) {
        return res.apiResponse(false, 'get Banner error', {}, 500)
    }
}

exports.update = async (req, res, next) => {
    try {
        if (req.body) {
            const { id, public_id, fileChanged } = req.body;
            if (id === undefined || id === null) {
                return res.apiResponse(false, 'Id is missing', {}, 400);
            }
            const updateFields = {};
            if (req.body.type) updateFields.type = req.body.type;
            if (req.body.url) updateFields.url = req.body.url;
            if (req.body.status) updateFields.status = req.body.status;
            if (fileChanged && public_id) {
                await deleteFromCloudinary(public_id);
                if (req.file) {
                    const { secure_url, public_id } = await uploadToCloudinary(req.file, 'hospitals');
                    updateFields.file = secure_url;
                    updateFields.public_id = public_id;
                }
            }
            const updatedBanner = await Banner.findOneAndUpdate(
                { id },
                { $set: updateFields },
                { new: true }
            );
            if (!updatedBanner) {
                return res.apiResponse(false, 'Banner not found', {}, 404);
            }
            return res.apiResponse(true, 'Banner updated successfully', updatedBanner, 200);
        } else {
            return res.apiResponse(false, 'Payload is missing', {}, 400);
        }
    } catch (error) {
        console.error('Update Error:', error);
        return res.apiResponse(false, 'Error updating Banner', {}, 500);
    }

};

exports.delete = async (req, res, next) => {
    try {
        var requests = req.bodyParams;
        if (!requests.id) {
            return res.apiResponse(false, 'Id is missing', {}, 400);
        }
        const banner = await Banner.findOne({ id: requests.id });
        if (!banner) {
            return res.apiResponse(false, 'Banner not found', {}, 404)
        }
        const result = await Banner.deleteOne({ id: requests.id });

        if (result && banner.public_id) {
            await deleteFromCloudinary(banner.public_id);
        }

        return res.apiResponse(true, 'Banner deleted successfully', result, 200)
    } catch (error) {
        return res.apiResponse(false, 'Delete Banner error', { error }, 500)
    }
}