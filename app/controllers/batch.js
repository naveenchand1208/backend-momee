const Batch = require('../models/batch')
const moment = require('moment');
const { uploadToCloudinary, deleteFromCloudinary } = require('../helpers/cloudinary');

exports.add = async (req, res, next) => {
    try {
        const { title, momType, week, month } = req.body;
        if (!title || !momType || !req.file) {
            return res.apiResponse(false, 'Batch params is missing', {}, 400);
        }
        const checkTitle = await Batch.findOne({ title: title })
        if (checkTitle) {
            return res.apiResponse(false, 'Title already exists', {}, 400);
        }
        if (momType === 'pregMom' && !week) {
            return res.apiResponse(false, 'Week is required', {}, 400);
        }
        if (momType === 'newMom' && !month) {
            return res.apiResponse(false, 'Month is required', {}, 400);
        }
        const { secure_url, public_id } = await uploadToCloudinary(req.file, 'batch');
        const uniqueId = `Batch-${moment().format('DDMMYYYYHHmmss')}`;
        const newBatch = new Batch({
            title,
            momType,
            file: secure_url,
            public_id: public_id,
            id: uniqueId,
            week,
            month,
        });
        await newBatch.save();
        return res.apiResponse(true, "Batch added Success", newBatch, 200);
    } catch (error) {
        console.error("Add Batch Error:", error);
        return res.apiResponse(false, 'Batch Add error', { error }, 500);
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
        if (req.userDetails && req.userDetails.momType) {
            match['momType'] = req.userDetails.momType;
        }
        if (requests.momType && requests.momType !== '') {
            match['momType'] = requests.momType;
        }
        if (requests.status && requests.status !== '') {
            match['status'] = requests.status;
        }
        if (requests.week && requests.week !== '') {
            match['week'] = requests.week;
        }
        if (requests.month && requests.month !== '') {
            match['month'] = requests.month;
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
            Batch.paginate(match, options, function (err, data) {
                if (err) {
                    return res.apiResponse(false, "Error while fetching lists", {}, 404);
                }
                return res.apiResponse(true, "Success", data, 200);
            });
        } else {
            let batches = [];
            if (Object.keys(match).length === 0) {
                batches = await Batch.find({});
            } else {
                batches = await Batch.find(match);
            }
            return res.apiResponse(true, "Success", { docs: batches }, 200);
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
        const batch = await Batch.findOne({ id: requests.id })
        if (!batch) {
            return res.apiResponse(false, 'Batch not found', {}, 404);
        }
        return res.apiResponse(true, 'Success', batch, 200);
    } catch (error) {
        return res.apiResponse(false, 'get Batch error', {}, 500)
    }
}

exports.update = async (req, res, next) => {
    try {
        if (req.body) {
            const body = Object(req.body);
            const { id, public_id, fileChanged } = body;
            if (id === undefined || id === null) {
                return res.apiResponse(false, 'Id is missing', {}, 400);
            }
            const updateFields = {};
            if (req.body.title) updateFields.title = req.body.title;
            if (!!req.body.momType) updateFields.momType = req.body.momType;
            if (!!req.body.week) updateFields.week = req.body.week;
            if (req.body.status) updateFields.status = req.body.status;
            if (fileChanged && public_id) {
                await deleteFromCloudinary(public_id);
                if (req.file) {
                    const { secure_url, public_id } = await uploadToCloudinary(req.file, 'batch');
                    updateFields.file = secure_url;
                    updateFields.public_id = public_id;
                }
            }
            const updatedBatch = await Batch.findOneAndUpdate(
                { id },
                { $set: updateFields },
                { new: true }
            );
            if (!updatedBatch) {
                return res.apiResponse(false, 'Batch not found', {}, 404);
            }
            return res.apiResponse(true, 'Batch updated successfully', updatedBatch, 200);
        } else {
            return res.apiResponse(false, 'Payload is missing', {}, 400);
        }
    } catch (error) {
        console.error('Update Error:', error);
        return res.apiResponse(false, 'Error updating Batch', {}, 500);
    }

};

exports.delete = async (req, res, next) => {
    try {
        var requests = req.bodyParams;
        if (!requests.id) {
            return res.apiResponse(false, 'Id is missing', {}, 400);
        }
        const batch = await Batch.findOne({ id: requests.id })
        if (!batch) {
            return res.apiResponse(false, 'Batch not found', {}, 404)
        }
        if (batch && batch.public_id) {
            await deleteFromCloudinary(batch.public_id);
        }
        const result = await Batch.deleteOne({ id: requests.id });

        if (result.deletedCount === 0) {
            return res.apiResponse(false, 'Batch not found', {}, 404)
        }
        return res.apiResponse(true, 'Batch deleted successfully', result, 200)
    } catch (error) {
        return res.apiResponse(false, 'Delete Batch error', { error }, 500)
    }
}