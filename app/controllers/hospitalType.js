const { localizedApiResponse } = require('./controllerLocalization');
const HospitalType = require('../models/hospitalType')
const moment = require('moment');

exports.add = async (req, res, next) => {
    try {
        const { name, status, translations } = req.bodyParams;
        if (!name) {
            return localizedApiResponse(req, res, false, 'Name is missing', {}, 400);
        }
        const checkTitle = await HospitalType.findOne({ name: name })
        if (checkTitle) {
            return localizedApiResponse(req, res, false, 'Name already exists', {}, 400);
        }
        const uniqueId = `HospitalType-${moment().format('DDMMYYYYHHmmss')}`;
        let parsedTranslations = translations;
        if (typeof parsedTranslations === 'string') {
            try {
                parsedTranslations = JSON.parse(parsedTranslations);
            } catch (e) {
                parsedTranslations = null;
            }
        }

        const newType = new HospitalType({
            name,
            status,
            translations: parsedTranslations || {
                en: { name },
                ta: { name: '' }
            },
            id: uniqueId,
        })
        await newType.save()
        return localizedApiResponse(req, res, true, "Type added Success", newType, 200);
    } catch (error) {
        console.error("Add Type Error:", error);
        return localizedApiResponse(req, res, false, 'Type Add error', { error }, 500);
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
            options.sort = { createdAt: -1 };
            HospitalType.paginate(match, options, function (err, data) {
                if (err) {
                    return localizedApiResponse(req, res, false, "Error while fetching lists", {}, 404);
                }
                return localizedApiResponse(req, res, true, "Success", data, 200);
            });
        } else {
            let types = [];
            if (Object.keys(match).length === 0) {
                types = await HospitalType.find({});
            } else {
                types = await HospitalType.find(match);
            }
            return localizedApiResponse(req, res, true, "Success", { docs: types }, 200);
        }

    } catch (error) {
        return localizedApiResponse(req, res, false, 'Get list error', {}, 500);
    }
}

exports.view = async (req, res, next) => {
    try {
        var requests = req.bodyParams;
        if (!requests.id) {
            return localizedApiResponse(req, res, false, 'Id is missing', {}, 400);
        }
        const type = await HospitalType.findOne({ id: requests.id })
        if (!type) {
            return localizedApiResponse(req, res, false, 'Type not found', {}, 404);
        }
        return localizedApiResponse(req, res, true, 'Success', type, 200);
    } catch (error) {
        return localizedApiResponse(req, res, false, 'get Type error', {}, 500)
    }
}

exports.update = async (req, res, next) => {
    try {
        if (req.body) {
            const { id, name, translations } = req.bodyParams;
            if (id === undefined || id === null) {
                return localizedApiResponse(req, res, false, 'Id is missing', {}, 400);
            }
            const updateFields = {};
            if (req.bodyParams.name) updateFields.name = req.bodyParams.name;
            if (req.bodyParams.status) updateFields.status = req.bodyParams.status;
            if (req.bodyParams.translations) {
                let parsedTranslations = req.bodyParams.translations;
                if (typeof parsedTranslations === 'string') {
                    try {
                        parsedTranslations = JSON.parse(parsedTranslations);
                    } catch (e) {
                        parsedTranslations = null;
                    }
                }
                if (parsedTranslations) updateFields.translations = parsedTranslations;
            }
            const updatedType = await HospitalType.findOneAndUpdate(
                { id },
                { $set: updateFields },
                { new: true }
            );
            if (!updatedType) {
                return localizedApiResponse(req, res, false, 'Type not found', {}, 404);
            }
            return localizedApiResponse(req, res, true, 'Type updated successfully', updatedType, 200);
        } else {
            return localizedApiResponse(req, res, false, 'Payload is missing', {}, 400);
        }
    } catch (error) {
        console.error('Update Error:', error);
        return localizedApiResponse(req, res, false, 'Error updating Type', { error }, 500);
    }

};

exports.delete = async (req, res, next) => {
    try {
        var requests = req.bodyParams;
        if (!requests.id) {
            return localizedApiResponse(req, res, false, 'Id is missing', {}, 400);
        }
        const result = await HospitalType.deleteOne({ id: requests.id });
        if (result.deletedCount === 0) {
            return localizedApiResponse(req, res, false, 'Type not found', {}, 404)
        }
        return localizedApiResponse(req, res, true, 'Type deleted successfully', result, 200)
    } catch (error) {
        return localizedApiResponse(req, res, false, 'Delete Type error', { error }, 500)
    }
}