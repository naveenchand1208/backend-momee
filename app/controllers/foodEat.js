const FoodEat = require('../models/foodEat')
const moment = require('moment');
const { uploadToCloudinary, deleteFromCloudinary } = require('../helpers/cloudinary');

exports.add = async (req, res, next) => {
    try {
        const { categoryId, title, momType, foodType, week, month, region, duration, protein, energy } = req.body;
        if (!categoryId || !title || !momType || !foodType || !req.file
            || !region || !duration || !protein || !energy
        ) {
            return res.apiResponse(false, 'Food Eat params is missing', {}, 400);
        }
        if (momType === 'pregMom' && !week) {
            return res.apiResponse(false, 'Week is required', {}, 400);
        }

        if (momType === 'newMom' && !month) {
            return res.apiResponse(false, 'Month is required', {}, 400);
        }
        const { secure_url, public_id } = await uploadToCloudinary(req.file, 'foodsEat');
        const uniqueId = `FoodEat-${moment().format('DDMMYYYYHHmmss')}`;
        const newFood = new FoodEat({
            title,
            categoryId,
            momType,
            foodType,
            file: secure_url,
            public_id: public_id,
            id: uniqueId,
            week,
            month,
            energy,
            duration,
            protein,
            region,
        });
        await newFood.save()
        return res.apiResponse(true, "Food added Success", newFood, 200);
    } catch (error) {
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
            FoodEat.paginate(match, options, function (err, data) {
                if (err) {
                    return res.apiResponse(false, "Error while fetching lists", {}, 404);
                }
                return res.apiResponse(true, "Success", data, 200);
            });
        } else {
            let Foods = [];
            if (Object.keys(match).length === 0) {
                Foods = await FoodEat.find({}).populate('category');
            } else {
                Foods = await FoodEat.find(match).populate('category');
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
        const food = await FoodEat.findOne({ id: requests.id })
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
            if (req.body.title) updateFields.title = req.body.title;
            if (req.body.categoryId) updateFields.categoryId = req.body.categoryId;
            if (req.body.momType) updateFields.momType = req.body.momType;
            if (req.body.foodType) updateFields.foodType = req.body.foodType;
            if (req.body.foodNames) updateFields.foodNames = req.body.foodNames;
            if (!!req.body.week) updateFields.week = req.body.week;
            if (!!req.body.month) updateFields.month = req.body.month;
            if (req.body.energy) updateFields.energy = req.body.energy;
            if (req.body.duration) updateFields.duration = req.body.duration;
            if (req.body.protein) updateFields.protein = req.body.protein;
            if (req.body.region) updateFields.region = req.body.region;
            if (req.body.status) updateFields.status = req.body.status;
            if (fileChanged && public_id) {
                await deleteFromCloudinary(public_id);
                if (req.file) {
                    const { secure_url, public_id } = await uploadToCloudinary(req.file, 'foodsEat');
                    updateFields.file = secure_url;
                    updateFields.public_id = public_id;
                }
            }
            const updatedFood = await FoodEat.findOneAndUpdate(
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
        const result = await FoodEat.deleteOne({ id: requests.id });

        if (result.deletedCount === 0) {
            return res.apiResponse(false, 'Food not found', {}, 404)
        }
        return res.apiResponse(true, 'Food deleted successfully', result, 200)
    } catch (error) {
        return res.apiResponse(false, 'Delete Food error', { error }, 500)
    }
}