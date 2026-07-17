const FoodAvoid = require('../models/foodAvoid')
const moment = require('moment');
const { uploadToCloudinary, deleteFromCloudinary } = require('../helpers/cloudinary');

exports.add = async (req, res, next) => {
    try {
        const { categoryId, title, momType, foodType, symptoms, week, month, region, description } = req.body;
        if (!categoryId || !title || !momType || !foodType || !req.file || !region || symptoms.length === 0 || !description) {
            return res.apiResponse(false, 'Food Avoid params is missing', {}, 400);
        }
        // const checkTitle = await FoodAvoid.findOne({ title: title })
        // if (checkTitle) {
        //     return res.apiResponse(false, 'Title already exists', {}, 400);
        // }
        if (momType === 'pregMom' && !week) {
            return res.apiResponse(false, 'Week is required', {}, 400);
        }
        if (momType === 'newMom' && !month) {
            return res.apiResponse(false, 'Month is required', {}, 400);
        }
        const { secure_url, public_id } = await uploadToCloudinary(req.file, 'foodsAvoid');
        const uniqueId = `FoodAvoid-${moment().format('DDMMYYYYHHmmss')}`;
        const newFood = new FoodAvoid({
            title,
            categoryId,
            momType,
            foodType,
            symptoms: safeParse(symptoms),
            file: secure_url,
            public_id: public_id,
            id: uniqueId,
            week,
            month,
            region,
            description
        });
        await newFood.save();
        return res.apiResponse(true, "Food added Success", newFood, 200);
    } catch (error) {
        console.error("Add Food Error:", error);
        return res.apiResponse(false, 'Food Add error', { error }, 500);
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
        if (requests.categoryId && requests.categoryId !== '') {
            match['categoryId'] = requests.categoryId;
        }
        if (requests.momType && requests.momType !== '') {
            match['momType'] = requests.momType;
        }
        if (requests.foodType && requests.foodType !== '') {
            match['foodType'] = requests.foodType;
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
        // if (requests.region && requests.region !== '') {
        //     match['region'] = requests.region;
        // }
        if (requests.region && requests.region !== '') {
            match['region'] = { $in: [requests.region, "both"] };
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
            populate: 'category',
        };
        if (pagination === "true") {
            FoodAvoid.paginate(match, options, function (err, data) {
                if (err) {
                    return res.apiResponse(false, "Error while fetching lists", {}, 404);
                }
                return res.apiResponse(true, "Success", data, 200);
            });
        } else {
            let Foods = [];
            if (Object.keys(match).length === 0) {
                Foods = await FoodAvoid.find({}).populate('category');
            } else {
                Foods = await FoodAvoid.find(match).populate('category');
            }
            return res.apiResponse(true, "Success", { docs: Foods }, 200);
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
        const food = await FoodAvoid.findOne({ id: requests.id })
        if (!food) {
            return res.apiResponse(false, 'Food not found', {}, 404);
        }
        return res.apiResponse(true, 'Success', food, 200);
    } catch (error) {
        return res.apiResponse(false, 'get Food error', {}, 500)
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
            if (req.body.title) {
                // const checkTitle = await FoodAvoid.findOne({ title: req.body.title, momType: req.body.momType })
                // if (checkTitle && checkTitle.id !== id) {
                //     return res.apiResponse(false, 'Title already exists', {}, 400);
                // }
                updateFields.title = req.body.title;
            }
            if (req.body.title) updateFields.title = req.body.title;
            if (req.body.categoryId) updateFields.categoryId = req.body.categoryId;
            if (req.body.momType) updateFields.momType = req.body.momType;
            if (req.body.foodType) updateFields.foodType = req.body.foodType;
            if (req.body.symptoms) updateFields.symptoms = safeParse(req.body.symptoms);
            if (req.body.region) updateFields.region = req.body.region;
            if (!!req.body.week) updateFields.week = req.body.week;
            if (!!req.body.month) updateFields.month = req.body.month;
            if (req.body.status) updateFields.status = req.body.status;
            if (req.body.description) updateFields.description = req.body.description;
            if (fileChanged && public_id) {
                await deleteFromCloudinary(public_id);
                if (req.file) {
                    const { secure_url, public_id } = await uploadToCloudinary(req.file, 'foodsAvoid');
                    updateFields.file = secure_url;
                    updateFields.public_id = public_id;
                }
            }
            const updatedFood = await FoodAvoid.findOneAndUpdate(
                { id },
                { $set: updateFields },
                { new: true }
            );
            if (!updatedFood) {
                return res.apiResponse(false, 'Food not found', {}, 404);
            }
            return res.apiResponse(true, 'Food updated successfully', updatedFood, 200);
        } else {
            return res.apiResponse(false, 'Payload is missing', {}, 400);
        }
    } catch (error) {
        console.error('Update Error:', error);
        return res.apiResponse(false, 'Error updating Food', {}, 500);
    }

};

exports.delete = async (req, res, next) => {
    try {
        var requests = req.bodyParams;
        if (!requests.id) {
            return res.apiResponse(false, 'Id is missing', {}, 400);
        }
        const result = await FoodAvoid.deleteOne({ id: requests.id });

        if (result.deletedCount === 0) {
            return res.apiResponse(false, 'Food not found', {}, 404)
        }
        return res.apiResponse(true, 'Food deleted successfully', result, 200)
    } catch (error) {
        return res.apiResponse(false, 'Delete Food error', { error }, 500)
    }
}

function safeParse(value) {
    try {
        if (typeof value === 'string') {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed : [parsed];
        } else if (Array.isArray(value)) {
            // Convert stringified numbers to actual numbers if possible
            return value.map((v) => {
                if (typeof v === 'string' && !isNaN(v)) {
                    return Number(v);
                }
                return v;
            });
        } else {
            return [value];
        }
    } catch {
        return [];
    }
}