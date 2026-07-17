const Terms = require('../models/termsPolicy')
const moment = require('moment');

exports.add = async (req, res, next) => {
    try {
        const { description } = req.bodyParams;
        if (!description) {
            return res.apiResponse(false, 'Terms params is missing', {}, 400);
        }
        const uniqueId = `Terms-${moment().format('DDMMYYYYHHmmss')}`;
        const newTerms = new Terms({
            description,
            id: uniqueId,
        });
        await newTerms.save();
        return res.apiResponse(true, "Terms added Success", newTerms, 200);
    } catch (error) {
        console.error("Add Terms Error:", error);
        return res.apiResponse(false, 'Terms Add error', { error }, 500);
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
            Terms.paginate(match, options, function (err, data) {
                if (err) {
                    return res.apiResponse(false, "Error while fetching lists", {}, 404);
                }
                return res.apiResponse(true, "Success", data, 200);
            });
        } else {
            let terms = [];
            if (Object.keys(match).length === 0) {
                terms = await Terms.find({});
            } else {
                terms = await Terms.find(match);
            }
            return res.apiResponse(true, "Success", { docs: terms }, 200);
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
        const term = await Terms.findOne({ id: requests.id })
        if (!term) {
            return res.apiResponse(false, 'Terms not found', {}, 404);
        }
        return res.apiResponse(true, 'Success', term, 200);
    } catch (error) {
        return res.apiResponse(false, 'get Terms error', {}, 500)
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

        const term = await Terms.findOneAndUpdate(
            { id: requests.id },
            updateFields,
            { new: true }
        );
        if (!term) {
            return res.apiResponse(false, 'Terms not found', {}, 404);
        }
        return res.apiResponse(true, 'Terms updated successfully', term, 200);

    } catch (error) {
        return res.apiResponse(false, 'Error updating  Term', {}, 500);
    }
};

exports.delete = async (req, res, next) => {
    try {
        var requests = req.bodyParams;
        if (!requests.id) {
            return res.apiResponse(false, 'Id is missing', {}, 400);
        }
        const result = await Terms.deleteOne({ id: requests.id });

        if (result.deletedCount === 0) {
            return res.apiResponse(false, 'Terms not found', {}, 404)
        }
        return res.apiResponse(true, 'Terms deleted successfully', result, 200)
    } catch (error) {
        return res.apiResponse(false, 'Delete Terms error', { error }, 500)
    }
}