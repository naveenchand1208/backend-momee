const Exercise = require('../models/exercise')
const { uploadToCloudinary, deleteFromCloudinary } = require('../helpers/cloudinary');
const moment = require('moment');

exports.add = async (req, res, next) => {
    try {
        const { collectionName, duration, burnCalories, momType, status, week, month } = req.body;
        if (!collectionName || !duration || !burnCalories || !momType) {
            return res.apiResponse(false, 'CollectionName, duration, burnCalories, or momType is missing', {}, 400);
        }

        if (momType === 'pregMom' && !week) {
            return res.apiResponse(false, 'Week is required', {}, 400);
        }

        if (momType === 'newMom' && !month) {
            return res.apiResponse(false, 'Month is required', {}, 400);
        }
        let secure_url, public_id;
        if (req.file) {
            ({ secure_url, public_id } = await uploadToCloudinary(req.file, 'exercise'));
        }

        const id = `ExCollection-${moment().format('DDMMYYYYHHmmss')}`;
        const newExCollection = new Exercise({
            id,
            collectionName,
            duration,
            burnCalories,
            momType,
            status: status || 'Active',
            week,
            month,
            file: secure_url,
            public_id: public_id,
        });
        await newExCollection.save();
        return res.apiResponse(true, 'Exercise collection added successfully', newExCollection, 200);
    } catch (error) {
        return res.apiResponse(false, 'Collection Add error', { error }, 500);
    }
}
exports.addExercise = async (req, res, next) => {
    try {
        const { collectionId, exerciseName, sets, seconds } = req.body;
        if (!collectionId || !exerciseName || !sets || !seconds) {
            return res.apiResponse(false, 'Exercise details are missing', {}, 400);
        }
        if (!req.file) {
            return res.apiResponse(false, 'GIF file is required', {}, 400);
        }
        const mimeType = req.file.mimetype;
        if (mimeType !== 'image/gif') {
            return res.apiResponse(false, 'Only GIF files are allowed', {}, 400);
        }
        const collection = await Exercise.findOne({ id: collectionId })
        if (!collection) {
            return res.apiResponse(false, 'Collection not found', {}, 404);
        }
        const { secure_url, public_id } = await uploadToCloudinary(req.file, 'exercise');
        const exerciseId = `Exercise-${moment().format('DDMMYYYYHHmmss')}`;
        const exercise = {
            exerciseId,
            collectionId,
            exerciseName,
            sets,
            seconds,
            file: secure_url,
            public_id
        }
        collection.exercises.push(exercise)
        // community.markModified('exercises');
        await collection.save()
        return res.apiResponse(true, 'Exercise added successfully', collection, 200);
    } catch (error) {
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
            match['collectionName'] = { $regex: searchTerm, $options: 'i' };
        }
        const options = {
            page: page,
            limit: per_page,
            skip: skip,
            sort: { [sortField]: sortOrder },
        };
        if (pagination === "true") {
            Exercise.paginate(match, options, function (err, data) {
                if (err) {
                    return res.apiResponse(false, "Error while fetching lists", {}, 404);
                }
                return res.apiResponse(true, "Success", data, 200);
            });
        } else {
            let ExCollections = [];
            if (Object.keys(match).length === 0) {
                ExCollections = await Exercise.find({});
            } else {
                ExCollections = await Exercise.find(match);
            }
            return res.apiResponse(true, "Success", { docs: ExCollections }, 200);
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
        const collection = await Exercise.findOne({ id: requests.id })
        if (!collection) {
            return res.apiResponse(false, 'collection not found', {}, 404);
        }
        return res.apiResponse(true, 'Success', collection, 200);
    } catch (error) {
        return res.apiResponse(false, 'get collection error', {}, 500)
    }
}
exports.viewExercise = async (req, res, next) => {
    try {
        var { id, exerciseId } = req.bodyParams;
        if (!id || !exerciseId) {
            return res.apiResponse(false, 'Id or exerciseId is missing', {}, 400);
        }
        const collection = await Exercise.findOne({ id })
        if (!collection) {
            return res.apiResponse(false, 'collection not found', {}, 404);
        }
        const exercise = collection.exercises.find(ex => ex.exerciseId === exerciseId)
        if (!exercise) {
            return res.apiResponse(false, 'exercise not found', {}, 404);
        }
        return res.apiResponse(true, 'Success', exercise, 200);
    } catch (error) {
        return res.apiResponse(false, 'get exercise error', { error }, 500)
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
            if (req.body.collectionName) updateFields.collectionName = req.body.collectionName;
            if (req.body.duration) updateFields.duration = req.body.duration;
            if (req.body.burnCalories) updateFields.burnCalories = req.body.burnCalories;
            if (req.body.momType) updateFields.momType = req.body.momType;
            if (!!req.body.week) updateFields.week = req.body.week;
            if (!!req.body.month) updateFields.month = req.body.month;
            if (req.body.status) updateFields.status = req.body.status;

            if (fileChanged && public_id) {
                await deleteFromCloudinary(public_id);
                if (req.file) {
                    const result = await uploadToCloudinary(req.file, 'exercise');
                    updateFields.file = result.secure_url;
                    updateFields.public_id = result.public_id;
                }
            }

            const updatedCollection = await Exercise.findOneAndUpdate(
                { id: id },
                { $set: updateFields },
                { new: true }
            );
            if (!updatedCollection) {
                return res.apiResponse(false, 'Collection not found', {}, 404);
            }
            return res.apiResponse(true, 'Collection updated successfully', updatedCollection, 200);
        } else {
            return res.apiResponse(false, 'Payload is missing', {}, 400);
        }
    } catch (error) {
        console.error('Update Error:', error);
        return res.apiResponse(false, 'Error updating Collection', {}, 500);
    }

};
exports.updateExercise = async (req, res, next) => {
    try {
        const { collectionId, exerciseId, public_id, fileChanged } = req.body;

        if (!collectionId || !exerciseId) {
            return res.apiResponse(false, 'collectionId or exerciseId is missing', {}, 400);
        }

        const collection = await Exercise.findOne({ id: collectionId });
        if (!collection) {
            return res.apiResponse(false, 'Collection not found', {}, 404);
        }

        const exercise = collection.exercises.find(ex => ex.exerciseId === exerciseId);
        if (!exercise) {
            return res.apiResponse(false, 'Exercise not found', {}, 404);
        }

        // Update fields
        if (req.body.exerciseName) exercise.exerciseName = req.body.exerciseName;
        if (req.body.sets) exercise.sets = req.body.sets;
        if (req.body.seconds) exercise.seconds = req.body.seconds;

        // Handle file change
        if (fileChanged && public_id && req.file) {
            await deleteFromCloudinary(public_id);
            const { secure_url, public_id: newId } = await uploadToCloudinary(req.file, 'exercise');
            exercise.file = secure_url;
            exercise.public_id = newId;
        }

        collection.markModified('exersices');
        await collection.save();

        return res.apiResponse(true, 'Exercise updated successfully', exercise, 200);

    } catch (error) {
        console.error('Update Exercise Error:', error);
        return res.apiResponse(false, 'Error updating exercise', {}, 500);
    }
};
exports.delete = async (req, res, next) => {
    try {
        var requests = req.bodyParams;
        if (!requests.id) {
            return res.apiResponse(false, 'Id is missing', {}, 400);
        }
        const result = await Exercise.deleteOne({ id: requests.id });

        if (result.deletedCount === 0) {
            return res.apiResponse(false, 'Collection not found', {}, 404)
        }
        return res.apiResponse(true, 'Collection deleted successfully', result, 200)
    } catch (error) {
        return res.apiResponse(false, 'Delete Collection error', { error }, 500)
    }
}
exports.deleteExercise = async (req, res) => {
    try {
        const { id, exerciseId } = req.bodyParams;
        if (!id || !exerciseId) return res.apiResponse(false, 'id or exerciseId is missing', {}, 400);

        const collection = await Exercise.findOne({ id });
        if (!collection) return res.apiResponse(false, 'Collection not found', {}, 404);

        const index = collection.exercises.findIndex(ex => ex.exerciseId === exerciseId);
        if (index === -1) return res.apiResponse(false, 'Exercise not found', {}, 404);

        collection.exercises.splice(index, 1);
        collection.markModified('exercises');
        await collection.save();

        return res.apiResponse(true, 'Exercise deleted successfully', {}, 200);
    } catch (error) {
        return res.apiResponse(false, 'Delete exercise error', { error }, 500);
    }
};
