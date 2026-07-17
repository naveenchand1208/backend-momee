const FoodTemplate = require('../models/foodTemplate')
const moment = require('moment');
const { uploadToCloudinary, deleteFromCloudinary } = require('../helpers/cloudinary');

exports.add = async (req, res, next) => {
    try {
        const { name } = req.body;
        if (!name || !req.file) {
            return res.apiResponse(false, 'Template params is missing', {}, 400);
        }
        const checkTitle = await FoodTemplate.findOne({ name: name })
        if (checkTitle) {
            return res.apiResponse(false, 'Title already exists', {}, 400);
        }
        const { secure_url, public_id } = await uploadToCloudinary(req.file, 'foodTemplates');
        const uniqueId = `FoodTemplate-${moment().format('DDMMYYYYHHmmss')}`;
        const newTemplate = new FoodTemplate({
            name,
            file: secure_url,
            public_id: public_id,
            id: uniqueId,
        });
        await newTemplate.save();
        return res.apiResponse(true, "Template added Success", newTemplate, 200);
    } catch (error) {
        console.error("Add Template Error:", error);
        return res.apiResponse(false, 'Template Add error', { error }, 500);
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
            match['name'] = { $regex: searchTerm, $options: 'i' };
        }
        const options = {
            page: page,
            limit: per_page,
            skip: skip,
            sort: { [sortField]: sortOrder },
        };
        if (pagination === "true") {
            FoodTemplate.paginate(match, options, function (err, data) {
                if (err) {
                    return res.apiResponse(false, "Error while fetching lists", {}, 404);
                }
                return res.apiResponse(true, "Success", data, 200);
            });
        } else {
            let FoodTemplates = [];
            if (Object.keys(match).length === 0) {
                FoodTemplates = await FoodTemplate.find({});
            } else {
                FoodTemplates = await FoodTemplate.find(match);
            }
            return res.apiResponse(true, "Success", { docs: FoodTemplates }, 200);
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
        const template = await FoodTemplate.findOne({ id: requests.id })
        if (!template) {
            return res.apiResponse(false, 'Template not found', {}, 404);
        }
        return res.apiResponse(true, 'Success', template, 200);
    } catch (error) {
        return res.apiResponse(false, 'get Template error', {}, 500)
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
            if (req.body.name) {
                const checkTitle = await FoodTemplate.findOne({ name: req.body.name })
                if (checkTitle && checkTitle.id !== id) {
                    return res.apiResponse(false, 'Title already exists', {}, 400);
                }
                updateFields.name = req.body.name;
            }
            if (req.body.status) updateFields.status = req.body.status;
            if (fileChanged && public_id) {
                await deleteFromCloudinary(public_id);
                if (req.file) {
                    const { secure_url, public_id } = await uploadToCloudinary(req.file, 'foodTemplates');
                    updateFields.file = secure_url;
                    updateFields.public_id = public_id;
                }
            }
            const updatedTeplate = await FoodTemplate.findOneAndUpdate(
                { id },
                { $set: updateFields },
                { new: true }
            );
            if (!updatedTeplate) {
                return res.apiResponse(false, 'Template not found', {}, 404);
            }
            return res.apiResponse(true, 'Template updated successfully', updatedTeplate, 200);
        } else {
            return res.apiResponse(false, 'Payload is missing', {}, 400);
        }
    } catch (error) {
        console.error('Update Error:', error);
        return res.apiResponse(false, 'Error updating Template', {}, 500);
    }

};

exports.delete = async (req, res, next) => {
    try {
        var requests = req.bodyParams;
        if (!requests.id) {
            return res.apiResponse(false, 'Id is missing', {}, 400);
        }
        const template = await FoodTemplate.findOne({ id: requests.id })
        if (!template) {
            return res.apiResponse(false, 'Template not found', {}, 404)
        }
        const result = await FoodTemplate.deleteOne({ id: requests.id });

        if (result.deletedCount === 0) {
            return res.apiResponse(false, 'Template not found', {}, 404)
        }
        if (template && template.public_id) {
            await deleteFromCloudinary(template.public_id);
        }
        return res.apiResponse(true, 'Template deleted successfully', result, 200)
    } catch (error) {
        return res.apiResponse(false, 'Delete Template error', { error }, 500)
    }
}