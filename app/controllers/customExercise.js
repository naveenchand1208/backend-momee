const CustomExercise = require('../models/customExercise')
const Auth = require('../models/auth')
const moment = require('moment');
const MasterExercise = require('../models/masterExercise');

exports.add = async (req, res, next) => {
    try {
        const { date, time, userId, exerciseId, sets, reps } = req.bodyParams;
        if (!date || !time || !userId || !exerciseId || !sets || !reps ) {
            return res.apiResponse(false, 'Exercise details are missing', {}, 400);
        }
        const user = await Auth.findOne({ id: userId });
        if (!user) {
            return res.apiResponse(false, 'User Not Found', {}, 404);
        }

        const exercise = await MasterExercise.findOne({ id: exerciseId });
        console.log('exercise', exercise)
        if (!exercise) {
            return res.apiResponse(false, 'Exercise Not Found', {}, 404);
        }
        const uniqueId = `CustomExercise-${moment().format('DDMMYYYYHHmmss')}`;
        const newCustomExercise = new CustomExercise({
            id: uniqueId,
            date,
            time,
            userId,
            exerciseId,
            sets,
            reps,
        })
        await newCustomExercise.save();
        return res.apiResponse(true, "Exercises added successfully", newCustomExercise, 200);
    } catch (error) {
        console.error(error);
        return res.apiResponse(false, 'Add subscription error', {}, 500);
    }

}

exports.list = async (req, res, next) => {
    try {
        const requests = req.bodyParams;
        const page = parseInt(requests.page, 10) || 1;
        const per_page = parseInt(requests.limit, 10) || 10;
        const pagination = requests.pagination || "true";
        const skip = (page - 1) * per_page;
        const match = {};
        const sortField = requests.sortField || 'createdAt';
        const sortOrder = requests.sortOrder === 'asc' ? 1 : -1;
        if (requests.id && requests.id !== '') {
            match['id'] = requests.id;
        }
        // match['userId'] = requests.userId ||  req.userDetails.id;
        // }
        if (requests.userId && requests.userId !== '') {
            match['userId'] = requests.userId;
        }
        if (requests.exerciseId && requests.exerciseId !== '') {
            match['exerciseId'] = requests.exerciseId;
        }
        if (requests.date && requests.date !== '') {
            match['date'] = requests.date;
        }
        if (requests.status && requests.status !== '') {
            match['status'] = requests.status;
        }

        const options = {
            page: page,
            limit: per_page,
            skip: skip,
            sort: { [sortField]: sortOrder },
            populate: [
                {
                    path: 'user',
                    select: 'userName id'
                },
                {
                    path: 'exercise'
                },
            ],
        };
        if (pagination === "true") {
            options.sort = { createdAt: 1 };
            CustomExercise.paginate(match, options, async (err, data) => {
                if (err) {
                    return res.apiResponse(false, "Error while fetching lists", {}, 404);
                }
                await CustomExercise.populate(data.docs, [
                    { path: 'user', select: 'userName id' },
                    { path: 'exercise' },
                ]);
                return res.apiResponse(true, "Success", data, 200);
            });
        } else {
            const query = Object.keys(match).length === 0
                ? CustomExercise.find({})
                : CustomExercise.find(match);
            const exercises = await query
                .sort({ createdAt: 1 })
                .populate([
                    { path: 'user', select: 'userName id' },
                    { path: 'exercise' },
                ]);
            return res.apiResponse(true, "Success", { docs: exercises }, 200);
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
        const exercise = await CustomExercise.findOne({ id: requests.id })
        if (!exercise) {
            return res.apiResponse(false, 'exercise not found', {}, 404);
        }
        return res.apiResponse(true, 'Success', exercise, 200);
    } catch (error) {
        return res.apiResponse(false, 'get exercise error', {}, 500)
    }
}

exports.update = async (req, res, next) => {
    try {
        const requests = req.bodyParams;
        if (!requests.id) {
            return res.apiResponse(false, 'Id is missing', {}, 400);
        }
        if (requests.exerciseId) {
            const exercise = await MasterExercise.findOne({ id: requests.exerciseId });
            if (!exercise) {
                return res.apiResponse(false, 'Exercise Not Found', {}, 404);
            }
        }
        const updateFields = { ...requests };
        console.log('Update Fields:', updateFields);

        const custom = await CustomExercise.findOneAndUpdate(
            { id: requests.id },
            updateFields,
            { new: true }
        );
        if (!custom) {
            return res.apiResponse(false, 'Exercise not found', {}, 404);
        }
        return res.apiResponse(true, 'Exercise updated successfully', custom, 200);

    } catch (error) {
        return res.apiResponse(false, 'Error updating  Exercise', {}, 500);
    }
};

exports.delete = async (req, res, next) => {
    try {
        var requests = req.bodyParams;
        if (!requests.id) {
            return res.apiResponse(false, 'Id is missing', {}, 400);
        }
        const result = await CustomExercise.deleteOne({ id: requests.id });

        if (result.deletedCount === 0) {
            return res.apiResponse(false, 'Exercise not found', {}, 404)
        }
        return res.apiResponse(true, 'Exercise deleted successfully', result, 200)
    } catch (error) {
        return res.apiResponse(false, 'delete Exercise error', {}, 500)
    }
}

exports.dateWiseExerciseList = async (req, res, next) => {
    try {
        const { pagination = "true", page = 1, limit = 10, userId } = req.bodyParams;
        if (!userId) {
            return res.apiResponse(false, "User not found in request", {}, 400);
        }
        const user = await Auth.findOne({ id: userId });
        if (!user) {
            return res.apiResponse(false, 'User Not Found', {}, 404);
        }

        // Fetch all docs
        let docs = await CustomExercise.find({})
            .populate([
                { path: 'user', select: 'userName id' },
                { path: 'exercise' }
            ])
            .sort({ createdAt: -1 });

        // Filter only current user's docs
        docs = docs.filter(doc => doc.userId === userId);

        // Group by date
        const groupedMap = new Map();

        for (const doc of docs) {
            const dateKey = doc.date || moment(doc.createdAt).format('DD-MM-YYYY');
            if (!groupedMap.has(dateKey)) {
                groupedMap.set(dateKey, []);
            }
            groupedMap.get(dateKey).push(doc);
        }

        const groupedArray = Array.from(groupedMap.entries()).map(([date, exercises]) => ({ date, exercises }));

        const pageNumber = parseInt(page);
        const perPage = parseInt(limit);
        const skip = (pageNumber - 1) * perPage;
        const totalDocs = groupedArray.length;
        const totalPages = Math.ceil(totalDocs / perPage);

        const paginatedData = pagination === "true"
            ? groupedArray.slice(skip, skip + perPage)
            : groupedArray;

        return res.apiResponse(true, "Grouped exercises fetched successfully", {
            page: pageNumber,
            limit: perPage,
            total_docs: totalDocs,
            total_pages: totalPages,
            data: paginatedData
        }, 200);

    } catch (error) {
        console.error(error);
        return res.apiResponse(false, "Server error", { error }, 500);
    }
};
