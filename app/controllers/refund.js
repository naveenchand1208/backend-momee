const Refund = require('../models/refund')
const moment = require('moment');

exports.add = async (req, res, next) => {
    try {
        const { description } = req.bodyParams;
        if (!description) {
            return res.apiResponse(false, 'Refund params is missing', {}, 400);
        }
        const uniqueId = `Refund-${moment().format('DDMMYYYYHHmmss')}`;
        const newRefund = new Refund({
            description,
            id: uniqueId,
        });
        await newRefund.save();
        return res.apiResponse(true, "Refund added Success", newRefund, 200);
    } catch (error) {
        console.error("Add Refund Error:", error);
        return res.apiResponse(false, 'Refund Add error', { error }, 500);
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
            Refund.paginate(match, options, function (err, data) {
                if (err) {
                    return res.apiResponse(false, "Error while fetching lists", {}, 404);
                }
                return res.apiResponse(true, "Success", data, 200);
            });
        } else {
            let refunds = [];
            if (Object.keys(match).length === 0) {
                refunds = await Refund.find({});
            } else {
                refunds = await Refund.find(match);
            }
            return res.apiResponse(true, "Success", { docs: refunds }, 200);
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
        const refund = await Refund.findOne({ id: requests.id })
        if (!refund) {
            return res.apiResponse(false, 'Refund not found', {}, 404);
        }
        return res.apiResponse(true, 'Success', refund, 200);
    } catch (error) {
        return res.apiResponse(false, 'get Refund error', {}, 500)
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

        const refund = await Refund.findOneAndUpdate(
            { id: requests.id },
            updateFields,
            { new: true }
        );
        if (!refund) {
            return res.apiResponse(false, 'Refund not found', {}, 404);
        }
        return res.apiResponse(true, 'Refund updated successfully', refund, 200);

    } catch (error) {
        return res.apiResponse(false, 'Error updating  Refund', {}, 500);
    }
};

exports.delete = async (req, res, next) => {
    try {
        var requests = req.bodyParams;
        if (!requests.id) {
            return res.apiResponse(false, 'Id is missing', {}, 400);
        }
        const result = await Refund.deleteOne({ id: requests.id });

        if (result.deletedCount === 0) {
            return res.apiResponse(false, 'Refund not found', {}, 404)
        }
        return res.apiResponse(true, 'Refund deleted successfully', result, 200)
    } catch (error) {
        return res.apiResponse(false, 'Delete Refund error', { error }, 500)
    }
}