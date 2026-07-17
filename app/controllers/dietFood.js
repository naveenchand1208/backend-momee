const DietFood = require('../models/dietFood')
const Auth = require('../models/auth')
const moment = require('moment');
const FoodEatCategory = require('../models/foodEatCategory');
const FoodTemplate = require('../models/foodTemplate');

exports.add = async (req, res, next) => {
    try {
        const { date, time, userId, templateId, categoryId, calorie, duration, weight, description } = req.bodyParams;
        if (!date || !time || !userId || !templateId || !categoryId || !calorie || !duration || !weight || !description) {
            return res.apiResponse(false, 'Food details are missing', {}, 400);
        }
        const user = await Auth.findOne({ id: userId });
        if (!user) {
            return res.apiResponse(false, 'User Not Found', {}, 404);
        }
        const category = await FoodEatCategory.findOne({ id: categoryId });
        if (!category) {
            return res.apiResponse(false, 'Category Not Found', {}, 404);
        }
        const template = await FoodTemplate.findOne({ id: templateId });
        if (!template) {
            return res.apiResponse(false, 'Template Not Found', {}, 404);
        }
        const uniqueId = `DietFood-${moment().format('DDMMYYYYHHmmss')}`;
        const newDietFood = new DietFood({
            id: uniqueId,
            date,
            time,
            userId,
            templateId,
            categoryId,
            calorie,
            duration,
            weight,
            description
        })
        await newDietFood.save();
        return res.apiResponse(true, "Foods added successfully", newDietFood, 200);
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
        if (requests.categoryId && requests.categoryId !== '') {
            match['categoryId'] = requests.categoryId;
        }
        if (requests.templateId && requests.templateId !== '') {
            match['templateId'] = requests.templateId;
        }
        if (requests.date && requests.date !== '') {
            match['date'] = requests.date;
        }
        if (requests.status && requests.status !== '') {
            match['status'] = requests.status;
        }
        // if (requests.searchKey !== undefined && requests.searchKey.trim() !== '') {
        //     const searchTerm = requests.searchKey.trim();
        //     match['FoodName'] = { $regex: searchTerm, $options: 'i' };
        // }
        // if (requests.fromDate && requests.toDate) {
        //     let startDate = moment(requests.fromDate);
        //     let endDate = moment(requests.toDate);
        //     if (startDate.isValid() && endDate.isValid()) {
        //         match.createdAt = {
        //             $gte: startDate.startOf('day').toDate(),
        //             $lte: endDate.endOf('day').toDate()
        //         };
        //     }
        // }

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
                    path: 'category',
                    select: 'title id'
                },
                {
                    path: 'template',
                },
            ],
        };
        if (pagination === "true") {
            options.sort = { createdAt: 1 };
            DietFood.paginate(match, options, async (err, data) => {
                if (err) {
                    return res.apiResponse(false, "Error while fetching lists", {}, 404);
                }
                await DietFood.populate(data.docs, [
                    { path: 'user', select: 'userName id' },
                    { path: 'category', select: 'title id' },
                    { path: 'template' },
                ]);
                return res.apiResponse(true, "Success", data, 200);
            });
        } else {
            const query = Object.keys(match).length === 0
                ? DietFood.find({})
                : DietFood.find(match);
            const foods = await query
                .sort({ createdAt: 1 })
                .populate([
                    { path: 'user', select: 'userName id' },
                    { path: 'category', select: 'title id' },
                    { path: 'template' },
                ]);
            return res.apiResponse(true, "Success", { docs: foods }, 200);
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
        const food = await DietFood.findOne({ id: requests.id })
        if (!food) {
            return res.apiResponse(false, 'food not found', {}, 404);
        }
        return res.apiResponse(true, 'Success', food, 200);
    } catch (error) {
        return res.apiResponse(false, 'get food error', {}, 500)
    }
}

exports.update = async (req, res, next) => {
    try {
        const requests = req.bodyParams;
        if (!requests.id) {
            return res.apiResponse(false, 'Id is missing', {}, 400);
        }
        const category = await FoodEatCategory.findOne({ id: requests.categoryId });
        if (!category) {
            return res.apiResponse(false, 'Category Not Found', {}, 404);
        }
        const template = await FoodTemplate.findOne({ id: requests.templateId });
        if (!template) {
            return res.apiResponse(false, 'Template Not Found', {}, 404);
        }
        const updateFields = { ...requests };
        console.log('Update Fields:', updateFields);

        const food = await DietFood.findOneAndUpdate(
            { id: requests.id },
            updateFields,
            { new: true }
        );
        if (!food) {
            return res.apiResponse(false, 'Food not found', {}, 404);
        }
        return res.apiResponse(true, 'Food updated successfully', food, 200);

    } catch (error) {
        return res.apiResponse(false, 'Error updating  Food', {}, 500);
    }
};

exports.delete = async (req, res, next) => {
    try {
        var requests = req.bodyParams;
        if (!requests.id) {
            return res.apiResponse(false, 'Id is missing', {}, 400);
        }
        const result = await DietFood.deleteOne({ id: requests.id });

        if (result.deletedCount === 0) {
            return res.apiResponse(false, 'Food not found', {}, 404)
        }
        return res.apiResponse(true, 'Food deleted successfully', result, 200)
    } catch (error) {
        return res.apiResponse(false, 'delete Food error', {}, 500)
    }
}

// exports.dateWiseFoodList = async (req, res, next) => {
//     try {
//         const { pagination = "true", page = 1, limit = 10, userId } = req.bodyParams;
//         if (!userId) {
//             return res.apiResponse(false, "User not found in request", {}, 400);
//         }
//         const user = await Auth.findOne({ id: userId });
//         if (!user) {
//             return res.apiResponse(false, 'User Not Found', {}, 404);
//         }
//         // Fetch all docs
//         let docs = await DietFood.find({})
//             .populate([
//                 { path: 'user', select: 'userName id' },
//                 { path: 'category', select: 'title id' },
//                 { path: 'template' }
//             ])
//             .sort({ createdAt: -1 });

//         // Filter only current user's docs
//         docs = docs.filter(doc => doc.userId === userId);

//         // Group by date
//         const grouped = {};
//         for (const doc of docs) {
//             const dateKey = doc.date; // Assuming format 'DD-MM-YYYY'
//             if (!grouped[dateKey]) {
//                 grouped[dateKey] = { date: dateKey, foods: [] };
//             }
//             grouped[dateKey].foods.push(doc);
//         }

//         const groupedArray = Object.values(grouped).sort((a, b) => {
//             return moment(b.date, 'DD-MM-YYYY').toDate() - moment(a.date, 'DD-MM-YYYY').toDate();
//         });

//         const pageNumber = parseInt(page);
//         const perPage = parseInt(limit);
//         const skip = (pageNumber - 1) * perPage;
//         const totalDocs = groupedArray.length;
//         const totalPages = Math.ceil(totalDocs / perPage);

//         const paginatedData = pagination === "true"
//             ? groupedArray.slice(skip, skip + perPage)
//             : groupedArray;

//         return res.apiResponse(true, "Grouped foods fetched successfully", {
//             page: pageNumber,
//             limit: perPage,
//             total_docs: totalDocs,
//             total_pages: totalPages,
//             data: paginatedData
//         }, 200);

//     } catch (error) {
//         console.error(error);
//         return res.apiResponse(false, "Server error", { error }, 500);
//     }
// };

exports.dateWiseFoodList = async (req, res, next) => {
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
        let docs = await DietFood.find({})
            .populate([
                { path: 'user', select: 'userName id' },
                { path: 'category', select: 'title id' },
                { path: 'template' }
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

        const groupedArray = Array.from(groupedMap.entries()).map(([date, foods]) => ({ date, foods }));

        const pageNumber = parseInt(page);
        const perPage = parseInt(limit);
        const skip = (pageNumber - 1) * perPage;
        const totalDocs = groupedArray.length;
        const totalPages = Math.ceil(totalDocs / perPage);

        const paginatedData = pagination === "true"
            ? groupedArray.slice(skip, skip + perPage)
            : groupedArray;

        return res.apiResponse(true, "Grouped foods fetched successfully", {
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
