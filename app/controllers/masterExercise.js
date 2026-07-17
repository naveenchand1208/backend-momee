const MasterExercise = require('../models/masterExercise')
const moment = require('moment');
const { uploadToCloudinary, deleteFromCloudinary } = require('../helpers/cloudinary');

exports.add = async (req, res, next) => {
    try {
        const { name } = req.body;
        if (!name || !req.file) {
            return res.apiResponse(false, 'Exercise params is missing', {}, 400);
        }
        const checkTitle = await MasterExercise.findOne({ name: name })
        if (checkTitle) {
            return res.apiResponse(false, 'Exercise already exists', {}, 400);
        }
        const { secure_url, public_id } = await uploadToCloudinary(req.file, 'masterExercise');
        const uniqueId = `MasterExercise-${moment().format('DDMMYYYYHHmmss')}`;
        const newExercise = new MasterExercise({
            name,
            file: secure_url,
            public_id: public_id,
            id: uniqueId,
        });
        await newExercise.save();
        return res.apiResponse(true, "Exercise added Success", newExercise, 200);
    } catch (error) {
        console.error("Add Exercise Error:", error);
        return res.apiResponse(false, 'Exercise Add error', { error }, 500);
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
            MasterExercise.paginate(match, options, function (err, data) {
                if (err) {
                    return res.apiResponse(false, "Error while fetching lists", {}, 404);
                }
                return res.apiResponse(true, "Success", data, 200);
            });
        } else {
            let masterExercises = [];
            if (Object.keys(match).length === 0) {
                masterExercises = await MasterExercise.find({});
            } else {
                masterExercises = await MasterExercise.find(match);
            }
            return res.apiResponse(true, "Success", { docs: masterExercises }, 200);
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
        const exercise = await MasterExercise.findOne({ id: requests.id })
        if (!exercise) {
            return res.apiResponse(false, 'Exercise not found', {}, 404);
        }
        return res.apiResponse(true, 'Success', exercise, 200);
    } catch (error) {
        return res.apiResponse(false, 'get Exercise error', {}, 500)
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
                const checkTitle = await MasterExercise.findOne({ name: req.body.name })
                if (checkTitle && checkTitle.id !== id) {
                    return res.apiResponse(false, 'Title already exists', {}, 400);
                }
                updateFields.name = req.body.name;
            }
            if (req.body.status) updateFields.status = req.body.status;
            if (fileChanged && public_id) {
                await deleteFromCloudinary(public_id);
                if (req.file) {
                    const { secure_url, public_id } = await uploadToCloudinary(req.file, 'masterExercise');
                    updateFields.file = secure_url;
                    updateFields.public_id = public_id;
                }
            }
            const updatedTeplate = await MasterExercise.findOneAndUpdate(
                { id },
                { $set: updateFields },
                { new: true }
            );
            if (!updatedTeplate) {
                return res.apiResponse(false, 'Exercise not found', {}, 404);
            }
            return res.apiResponse(true, 'Exercise updated successfully', updatedTeplate, 200);
        } else {
            return res.apiResponse(false, 'Payload is missing', {}, 400);
        }
    } catch (error) {
        console.error('Update Error:', error);
        return res.apiResponse(false, 'Error updating Exercise', {}, 500);
    }

};

exports.delete = async (req, res, next) => {
    try {
        var requests = req.bodyParams;
        if (!requests.id) {
            return res.apiResponse(false, 'Id is missing', {}, 400);
        }
        const exercise = await MasterExercise.findOne({ id: requests.id })
        if (!exercise) {
            return res.apiResponse(false, 'Exercise not found', {}, 404)
        }
        const result = await MasterExercise.deleteOne({ id: requests.id });

        if (result.deletedCount === 0) {
            return res.apiResponse(false, 'Exercise not found', {}, 404)
        }
        if (exercise && exercise.public_id) {
            await deleteFromCloudinary(exercise.public_id);
        }
        return res.apiResponse(true, 'Exercise deleted successfully', result, 200)
    } catch (error) {
        return res.apiResponse(false, 'Delete Exercise error', { error }, 500)
    }
}