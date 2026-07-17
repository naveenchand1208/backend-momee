const Journey = require('../models/journey')
const moment = require('moment');
const { uploadToCloudinary, deleteFromCloudinary } = require('../helpers/cloudinary');

exports.add = async (req, res, next) => {
    try {
        const { name, trimesterId, momType, status, weight, height, week, month, babyFruitSize, description, notes, link } = req.body;
        if (!momType) {
            return res.apiResponse(false, 'Mom Type are missing', {}, 400);
        }
        if (momType === 'newMom' && (!name || !status || !description || !link || notes.length === 0 || !req.file)
        ) {
            return res.apiResponse(false, 'Journey New Mom params are missing', {}, 400);
        }
        if (momType === 'pregMom' && (!name || !trimesterId || !weight || !height || !momType || !status || !babyFruitSize || !description || !link || notes.length === 0 || !req.file)
        ) {
            return res.apiResponse(false, 'Journey Preg Mom params are missing', {}, 400);
        }
        if (momType === 'pregMom' && !week) {
            return res.apiResponse(false, 'Week is required', {}, 400);
        }
        if (momType === 'newMom' && !month) {
            return res.apiResponse(false, 'Month is required', {}, 400);
        }
        let parsedNotes = notes;
        if (typeof notes === 'string') {
            try {
                parsedNotes = JSON.parse(notes);
            } catch (err) {
                return res.apiResponse(false, 'Invalid notes format. Must be JSON.', {}, 400);
            }
        }
        const fileUpload = await uploadToCloudinary(req.file, 'journey');
        const uniqueId = `Journey-${moment().format('DDMMYYYYHHmmss')}`;
        const newJourney = new Journey({
            name,
            trimesterId,
            status,
            description,
            link,
            file: fileUpload.secure_url,
            public_id: fileUpload.public_id,
            id: uniqueId,
            momType,
            week,
            month,
            weight,
            height,
            babyFruitSize,
            description,
            link,
            notes: parsedNotes,
        });
        await newJourney.save()
        return res.apiResponse(true, "Journey added Success", newJourney, 200);
    } catch (error) {
        return res.apiResponse(false, 'Journey Add error', { error }, 500);
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
        if (requests.trimesterId && requests.trimesterId !== '') {
            match['trimesterId'] = requests.trimesterId;
        }
        if (requests.momType && requests.momType !== '') {
            match['momType'] = requests.momType;
        }
        if (requests.week && requests.week !== '') {
            match['week'] = requests.week;
        }
        if (requests.month && requests.month !== '') {
            match['month'] = requests.month;
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
            Journey.paginate(match, options, function (err, data) {
                if (err) {
                    return res.apiResponse(false, "Error while fetching lists", {}, 404);
                }
                return res.apiResponse(true, "Success", data, 200);
            });
        } else {
            let journeys = [];
            if (Object.keys(match).length === 0) {
                journeys = await Journey.find({});
            } else {
                journeys = await Journey.find(match);
            }
            return res.apiResponse(true, "Success", { docs: journeys }, 200);
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
        const journey = await Journey.findOne({ id: requests.id })
        if (!journey) {
            return res.apiResponse(false, 'Journey not found', {}, 404);
        }
        return res.apiResponse(true, 'Success', journey, 200);
    } catch (error) {
        return res.apiResponse(false, 'get Journey error', {}, 500)
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
            if (req.body.name) updateFields.name = req.body.name;
            if (req.body.description) updateFields.description = req.body.description;
            if (req.body.trimesterId) updateFields.trimesterId = req.body.trimesterId;
            if (req.body.status) updateFields.status = req.body.status;
            if (req.body.link) updateFields.link = req.body.link;
            if (req.body.weight) updateFields.weight = req.body.weight;
            if (req.body.height) updateFields.height = req.body.height;
            if (!!req.body.week) updateFields.week = req.body.week;
            if (!!req.body.month) updateFields.month = req.body.month;
            if (req.body.momType) updateFields.momType = req.body.momType;
            if (req.body.babyFruitSize) updateFields.babyFruitSize = req.body.babyFruitSize;
            if (req.body.notes) {
                if (typeof req.body.notes === 'string') {
                    updateFields.notes = JSON.parse(req.body.notes);
                } else {
                    updateFields.notes = req.body.notes;
                }
            }
            // if (req.body.notes) updateFields.notes = req.body.notes;
            if (fileChanged && public_id && req.file) {
                await deleteFromCloudinary(public_id);
                const result = await uploadToCloudinary(req.file, 'journey');
                updateFields.file = result.secure_url;
                updateFields.public_id = result.public_id;
            }
            const updatedJourney = await Journey.findOneAndUpdate(
                { id: id },
                { $set: updateFields },
                { new: true }
            );
            if (!updatedJourney) {
                return res.apiResponse(false, 'Journey not found', {}, 404);
            }
            return res.apiResponse(true, 'Journey updated successfully', updatedJourney, 200);
        } else {
            return res.apiResponse(false, 'Payload is missing', {}, 400);
        }
    } catch (error) {
        console.error('Update Error:', error);
        return res.apiResponse(false, 'Error updating Journey', {}, 500);
    }
};

exports.delete = async (req, res, next) => {
    try {
        var requests = req.bodyParams;
        if (!requests.id) {
            return res.apiResponse(false, 'Id is missing', {}, 400);
        }
        const journey = await Journey.findOne({ id: requests.id });
        if (!journey) {
            return res.apiResponse(false, 'Journey not found', {}, 404)
        }
        await deleteFromCloudinary(journey?.public_id);
        const result = await Journey.deleteOne({ id: requests.id });
        return res.apiResponse(true, 'Journey deleted successfully', result, 200)
    } catch (error) {
        return res.apiResponse(false, 'Delete Journey error', { error }, 500)
    }
}