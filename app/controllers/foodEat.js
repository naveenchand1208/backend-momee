const FoodEat = require('../models/foodEat');
const moment = require('moment');
const {
    uploadToCloudinary,
    deleteFromCloudinary
} = require('../helpers/cloudinary');


// ===============================
// ADD FOOD TO EAT
// ===============================
exports.add = async (req, res, next) => {
    try {

        const {
            categoryId,

            title,
            titleTa,

            category,
            categoryTa,

            momType,

            foodType,
            foodTypeTa,

            week,
            month,

            region,

            duration,
            protein,
            energy
        } = req.body;


        // Validation
        if (
            !categoryId ||
            !title ||
            !titleTa ||
            !category ||
            !categoryTa ||
            !momType ||
            !foodType ||
            !foodTypeTa ||
            !req.file ||
            !region ||
            !duration ||
            !protein ||
            !energy
        ) {
            return res.apiResponse(
                false,
                'Food Eat params is missing',
                {},
                400
            );
        }


        // Preg Mom requires week
        if (
            momType === 'pregMom' &&
            !week
        ) {
            return res.apiResponse(
                false,
                'Week is required',
                {},
                400
            );
        }


        // New Mom requires month
        if (
            momType === 'newMom' &&
            !month
        ) {
            return res.apiResponse(
                false,
                'Month is required',
                {},
                400
            );
        }


        // Upload thumbnail
        const {
            secure_url,
            public_id
        } = await uploadToCloudinary(
            req.file,
            'foodsEat'
        );


        const uniqueId =
            `FoodEat-${moment().format('DDMMYYYYHHmmss')}`;


        // Create Food
        const newFood = new FoodEat({

            id: uniqueId,

            title: title,

            categoryId: categoryId,

            momType: momType,

            foodType: foodType,

            file: secure_url,

            public_id: public_id,

            week: week,

            month: month,

            energy: energy,

            duration: duration,

            protein: protein,

            region: region,


            // =========================
            // ENGLISH + TAMIL
            // =========================
            translations: {

                en: {
                    title: title || '',
                    category: category || '',
                    foodType: foodType || ''
                },

                ta: {
                    title: titleTa || '',
                    category: categoryTa || '',
                    foodType: foodTypeTa || ''
                }

            }

        });


        await newFood.save();


        return res.apiResponse(
            true,
            'Food added Success',
            newFood,
            200
        );


    } catch (error) {

        console.error(
            'Food Eat Add Error:',
            error
        );

        return res.apiResponse(
            false,
            'Food Add error',
            { error },
            500
        );
    }
};


// ===============================
// LIST FOOD TO EAT
// ===============================
exports.list = async (req, res, next) => {
    try {

        const requests = req.bodyParams;

        const page =
            requests.page || 1;

        const per_page =
            requests.limit || 10;

        const pagination =
            requests.pagination || 'true';

        const skip =
            (page - 1) * per_page;

        const match = {};

        const sortField =
            requests.sortField || 'createdAt';

        const sortOrder =
            requests.sortOrder === 'asc'
                ? 1
                : -1;


        if (
            requests.id &&
            requests.id !== ''
        ) {
            match.id = requests.id;
        }


        if (
            req.userDetails &&
            req.userDetails.momType
        ) {
            match.momType =
                req.userDetails.momType;
        }


        if (
            requests.categoryId &&
            requests.categoryId !== ''
        ) {
            match.categoryId =
                requests.categoryId;
        }


        if (
            requests.momType &&
            requests.momType !== ''
        ) {
            match.momType =
                requests.momType;
        }


        if (
            requests.foodType &&
            requests.foodType !== ''
        ) {
            match.foodType =
                requests.foodType;
        }


        if (
            requests.status &&
            requests.status !== ''
        ) {
            match.status =
                requests.status;
        }


        if (
            requests.week &&
            requests.week !== ''
        ) {
            match.week =
                requests.week;
        }


        if (
            requests.month &&
            requests.month !== ''
        ) {
            match.month =
                requests.month;
        }


        if (
            requests.region &&
            requests.region !== ''
        ) {
            match.region = {
                $in: [
                    requests.region,
                    'both'
                ]
            };
        }


        if (
            requests.fromDate ||
            requests.toDate
        ) {

            let startDate =
                moment(requests.fromDate);

            let endDate =
                moment(requests.toDate);


            if (
                startDate.isValid() &&
                endDate.isValid()
            ) {

                match.createdAt = {
                    $gte:
                        startDate
                            .startOf('day')
                            .toDate(),

                    $lte:
                        endDate
                            .endOf('day')
                            .toDate()
                };

            } else if (
                startDate.isValid() &&
                !endDate.isValid()
            ) {

                match.createdAt = {
                    $gte:
                        startDate
                            .startOf('day')
                            .toDate(),

                    $lte:
                        startDate
                            .endOf('day')
                            .toDate()
                };
            }
        }


        if (
            requests.searchKey !== undefined &&
            requests.searchKey.trim() !== ''
        ) {

            const searchTerm =
                requests.searchKey.trim();

            match.title = {
                $regex: searchTerm,
                $options: 'i'
            };
        }


        const options = {

            page: page,

            limit: per_page,

            skip: skip,

            sort: {
                [sortField]: sortOrder
            },

            populate: 'category'
        };


        if (
            pagination === 'true'
        ) {

            FoodEat.paginate(
                match,
                options,
                function (err, data) {

                    if (err) {

                        return res.apiResponse(
                            false,
                            'Error while fetching lists',
                            {},
                            404
                        );
                    }


                    return res.apiResponse(
                        true,
                        'Success',
                        data,
                        200
                    );
                }
            );

        } else {

            let Foods = [];


            if (
                Object.keys(match).length === 0
            ) {

                Foods =
                    await FoodEat
                        .find({})
                        .populate('category');

            } else {

                Foods =
                    await FoodEat
                        .find(match)
                        .populate('category');
            }


            return res.apiResponse(
                true,
                'Success',
                { docs: Foods },
                200
            );
        }


    } catch (error) {

        console.error(
            'Food Eat List Error:',
            error
        );

        return res.apiResponse(
            false,
            'Get list error',
            {},
            500
        );
    }
};


// ===============================
// VIEW FOOD TO EAT
// ===============================
exports.view = async (req, res, next) => {
    try {

        const requests =
            req.bodyParams;


        if (!requests.id) {

            return res.apiResponse(
                false,
                'Id is missing',
                {},
                400
            );
        }


        const food =
            await FoodEat
                .findOne({
                    id: requests.id
                })
                .lean();


        if (!food) {

            return res.apiResponse(
                false,
                'Food not found',
                {},
                404
            );
        }


        // Admin can receive both
        // English + Tamil
        if (requests.admin === true) {
            food.__skipLocalization = true;
        }


        return res.apiResponse(
            true,
            'Success',
            food,
            200
        );


    } catch (error) {

        console.error(
            'Get Food Eat Error:',
            error
        );

        return res.apiResponse(
            false,
            'get Food error',
            {},
            500
        );
    }
};


// ===============================
// UPDATE FOOD TO EAT
// ===============================
exports.update = async (req, res, next) => {
    try {

        if (!req.body) {

            return res.apiResponse(
                false,
                'Payload is missing',
                {},
                400
            );
        }


        const {
            id,
            public_id,
            fileChanged,

            title,
            titleTa,

            categoryId,
            category,
            categoryTa,

            momType,

            foodType,
            foodTypeTa,

            week,
            month,

            region,

            energy,
            duration,
            protein,

            status
        } = req.body;


        // ID
        if (
            id === undefined ||
            id === null ||
            id === ''
        ) {

            return res.apiResponse(
                false,
                'Id is missing',
                {},
                400
            );
        }


        // Required fields
        if (
            !title ||
            !titleTa ||
            !categoryId ||
            !category ||
            !categoryTa ||
            !foodType ||
            !foodTypeTa ||
            !momType ||
            !region ||
            !energy ||
            !duration ||
            !protein
        ) {

            return res.apiResponse(
                false,
                'Food Eat params is missing',
                {},
                400
            );
        }


        // Preg Mom
        if (
            momType === 'pregMom' &&
            !week
        ) {

            return res.apiResponse(
                false,
                'Week is required',
                {},
                400
            );
        }


        // New Mom
        if (
            momType === 'newMom' &&
            !month
        ) {

            return res.apiResponse(
                false,
                'Month is required',
                {},
                400
            );
        }


        const updateFields = {};


        // Main fields
        updateFields.title =
            title;

        updateFields.categoryId =
            categoryId;

        updateFields.momType =
            momType;

        updateFields.foodType =
            foodType;

        updateFields.region =
            region;

        updateFields.energy =
            energy;

        updateFields.duration =
            duration;

        updateFields.protein =
            protein;


        // Week / month
        updateFields.week =
            week || '';

        updateFields.month =
            month || '';


        // Status
        if (status) {
            updateFields.status =
                status;
        }


        // =========================
        // ENGLISH + TAMIL
        // =========================
        updateFields.translations = {

            en: {
                title: title || '',
                category: category || '',
                foodType: foodType || ''
            },

            ta: {
                title: titleTa || '',
                category: categoryTa || '',
                foodType: foodTypeTa || ''
            }

        };


        // =========================
        // FILE UPDATE
        // =========================
        if (
            fileChanged &&
            public_id
        ) {

            await deleteFromCloudinary(
                public_id
            );


            if (req.file) {

                const result =
                    await uploadToCloudinary(
                        req.file,
                        'foodsEat'
                    );


                updateFields.file =
                    result.secure_url;

                updateFields.public_id =
                    result.public_id;
            }
        }


        const updatedFood =
            await FoodEat.findOneAndUpdate(

                { id: id },

                {
                    $set: updateFields
                },

                {
                    new: true,
                    runValidators: true
                }
            );


        if (!updatedFood) {

            return res.apiResponse(
                false,
                'Food not found',
                {},
                404
            );
        }


        return res.apiResponse(
            true,
            'Food updated successfully',
            updatedFood,
            200
        );


    } catch (error) {

        console.error(
            'Food Eat Update Error:',
            error
        );

        return res.apiResponse(
            false,
            'Error updating Food',
            {},
            500
        );
    }
};


// ===============================
// DELETE FOOD TO EAT
// ===============================
exports.delete = async (req, res, next) => {
    try {

        const requests =
            req.bodyParams;


        if (!requests.id) {

            return res.apiResponse(
                false,
                'Id is missing',
                {},
                400
            );
        }


        const result =
            await FoodEat.deleteOne({
                id: requests.id
            });


        if (
            result.deletedCount === 0
        ) {

            return res.apiResponse(
                false,
                'Food not found',
                {},
                404
            );
        }


        return res.apiResponse(
            true,
            'Food deleted successfully',
            result,
            200
        );


    } catch (error) {

        console.error(
            'Food Eat Delete Error:',
            error
        );

        return res.apiResponse(
            false,
            'Delete Food error',
            { error },
            500
        );
    }
};