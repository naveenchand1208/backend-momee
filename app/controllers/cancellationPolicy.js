const CancellationPolicy = require('../models/cancellationPolicy')
const moment = require('moment');

exports.add = async (req, res, next) => {
    try {
        const { description } = req.bodyParams;
        if (!description) {
            return res.apiResponse(false, 'Terms params is missing', {}, 400);
        }
        const uniqueId = `CancellationPolicy-${moment().format('DDMMYYYYHHmmss')}`;
        const newCancellationPolicy = new CancellationPolicy({
            description,
            id: uniqueId,
        });
        await newCancellationPolicy.save();
        return res.apiResponse(true, "CancellationPolicy added Success", newCancellationPolicy, 200);
    } catch (error) {
        console.error("Add CancellationPolicy Error:", error);
        return res.apiResponse(false, 'CancellationPolicy Add error', { error }, 500);
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
        const options = {
            page: page,
            limit: per_page,
            skip: skip,
            sort: { [sortField]: sortOrder },
        };
        if (pagination === "true") {
            CancellationPolicy.paginate(match, options, function (err, data) {
                if (err) {
                    return res.apiResponse(false, "Error while fetching lists", {}, 404);
                }
                return res.apiResponse(true, "Success", data, 200);
            });
        } else {
            let policies = [];
            if (Object.keys(match).length === 0) {
                policies = await CancellationPolicy.find({});
            } else {
                policies = await CancellationPolicy.find(match);
            }
            return res.apiResponse(true, "Success", { docs: policies }, 200);
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
        const policy = await CancellationPolicy.findOne({ id: requests.id })
        if (!policy) {
            return res.apiResponse(false, 'CancellationPolicy not found', {}, 404);
        }
        return res.apiResponse(true, 'Success', policy, 200);
    } catch (error) {
        return res.apiResponse(false, 'get CancellationPolicy error', {}, 500)
    }
}

exports.update = async (req, res, next) => {
    try {
        const requests = req.bodyParams;
        if (!requests.id) {
            return res.apiResponse(false, 'Id is missing', {}, 400);
        }
        const updateFields = { ...requests };
        // console.log('Update Fields:', updateFields);

        const policy = await CancellationPolicy.findOneAndUpdate(
            { id: requests.id },
            updateFields,
            { new: true }
        );
        if (!policy) {
            return res.apiResponse(false, 'CancellationPolicy not found', {}, 404);
        }
        return res.apiResponse(true, 'CancellationPolicy updated successfully', policy, 200);

    } catch (error) {
        return res.apiResponse(false, 'Error updating  CancellationPolicy', {}, 500);
    }
};

exports.delete = async (req, res, next) => {
    try {
        var requests = req.bodyParams;
        if (!requests.id) {
            return res.apiResponse(false, 'Id is missing', {}, 400);
        }
        const result = await CancellationPolicy.deleteOne({ id: requests.id });

        if (result.deletedCount === 0) {
            return res.apiResponse(false, 'CancellationPolicy not found', {}, 404)
        }
        return res.apiResponse(true, 'CancellationPolicy deleted successfully', result, 200)
    } catch (error) {
        return res.apiResponse(false, 'Delete CancellationPolicy error', { error }, 500)
    }
}