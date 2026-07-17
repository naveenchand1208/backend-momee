const BabyName = require('../models/babyName')
const FavouritesName = require('../models/favouritesName')
const Auth = require('../models/auth')
const moment = require('moment');

exports.add = async (req, res, next) => {
    try {
        const { name, type } = req.bodyParams;
        if (!name || !type) {
            return res.apiResponse(false, 'Params is missing', {}, 400);
        }
        const checkTitle = await BabyName.findOne({ name, type });
        if (checkTitle) {
            return res.apiResponse(false, 'Name already exists', {}, 400);
        }
        const uniqueId = `BabyName-${moment().format('DDMMYYYYHHmmss')}`;
        const newBabyName = new BabyName({
            name,
            type,
            id: uniqueId,
        });
        await newBabyName.save();
        return res.apiResponse(true, "BabyName added Success", newBabyName, 200);
    } catch (error) {
        console.error("Add BabyName Error:", error);
        return res.apiResponse(false, 'BabyName Add error', { error }, 500);
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
        if (requests.name && requests.name !== '') {
            match['name'] = requests.name;
        }
        if (requests.type && requests.type !== '') {
            match['type'] = requests.type;
        }
        if (requests.status && requests.status !== '') {
            match['status'] = requests.status;
        }
        if (requests.fromDate && requests.toDate) {
            let startDate = moment(requests.fromDate);
            let endDate = moment(requests.toDate);
            if (startDate.isValid() && endDate.isValid()) {
                match.createdAt = {
                    $gte: startDate.startOf('day').toDate(),
                    $lte: endDate.endOf('day').toDate()
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
            BabyName.paginate(match, options, function (err, data) {
                if (err) {
                    return res.apiResponse(false, "Error while fetching lists", {}, 404);
                }
                return res.apiResponse(true, "Success", data, 200);
            });
        } else {
            let names = [];
            if (Object.keys(match).length === 0) {
                names = await BabyName.find({});
            } else {
                names = await BabyName.find(match);
            }
            return res.apiResponse(true, "Success", { docs: names }, 200);
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
        const names = await BabyName.findOne({ id: requests.id })
        if (!names) {
            return res.apiResponse(false, 'BabyName not found', {}, 404);
        }
        return res.apiResponse(true, 'Success', names, 200);
    } catch (error) {
        return res.apiResponse(false, 'get BabyName error', {}, 500)
    }
}
exports.update = async (req, res, next) => {
    try {
        const { id } = req.bodyParams;
        if (id === undefined || id === null) {
            return res.apiResponse(false, 'Id is missing', {}, 400);
        }
        const updateFields = {};
        if (req.bodyParams.name) updateFields.name = req.bodyParams.name;
        if (req.bodyParams.status) updateFields.status = req.bodyParams.status;
        const updatedBabyName = await BabyName.findOneAndUpdate(
            { id },
            { $set: updateFields },
            { new: true }
        );
        if (!updatedBabyName) {
            return res.apiResponse(false, 'BabyName not found', {}, 404);
        }
        return res.apiResponse(true, 'BabyName updated successfully', updatedBabyName, 200);
    } catch (error) {
        console.error('Update Error:', error);
        return res.apiResponse(false, 'Error updating BabyName', {}, 500);
    }

};
exports.delete = async (req, res, next) => {
    try {
        var requests = req.bodyParams;
        if (!requests.id) {
            return res.apiResponse(false, 'Id is missing', {}, 400);
        }
        const name = await BabyName.findOne({ id: requests.id })
        if (!name) {
            return res.apiResponse(false, 'BabyName not found', {}, 404)
        }
        const result = await BabyName.deleteOne({ id: requests.id });
        if (result.deletedCount === 0) {
            return res.apiResponse(false, 'BabyName not found', {}, 404)
        }
        return res.apiResponse(true, 'BabyName deleted successfully', result, 200)
    } catch (error) {
        return res.apiResponse(false, 'Delete BabyName error', { error }, 500)
    }
}
exports.favoriteName = async (req, res, next) => {
    try {
        const { nameId, userId } = req.bodyParams;
        if (!nameId || !userId) {
            return res.apiResponse(false, 'Required Parsms is Missing', 400)
        }
        const checkName = await BabyName.findOne({ id: nameId });
        if (!checkName) {
            return res.apiResponse(false, 'Name Not Found', {}, 404);
        }
        const user = await Auth.findOne({ id: userId });
        if (!user) {
            return res.apiResponse(false, 'User not found', {}, 404)
        }
        const type = checkName.type;
        const name = checkName.name;
        // Find existing favorites for that user and type
        let favDoc = await FavouritesName.findOne({ userId, type });

        // If not found, create new doc with this name
        if (!favDoc) {
            favDoc = await FavouritesName.create({
                userId,
                type,
                names: [nameId]
            });
            return res.apiResponse(true, 'Name added to favorites', favDoc, 200);
        }

        // If exists, toggle the name
        const nameIndex = favDoc.names.indexOf(nameId);

        if (nameIndex > -1) {
            // Remove name (unfavorite)
            favDoc.names.splice(nameIndex, 1);
            await favDoc.save();
            return res.apiResponse(true, 'Name removed from favorites', favDoc, 200);
        } else {
            // Add name (favorite)
            if (favDoc.names.length >= 6) {
                return res.apiResponse(false, 'Maximum 6 favorite names allowed', {}, 400);
            }
            favDoc.names.push(nameId);
            await favDoc.save();
            return res.apiResponse(true, 'Name added to favorites', favDoc, 200);
        }

    } catch (error) {
        console.error(error);
        return res.apiResponse(false, 'Favorite BabyName error', { error: error.message }, 500);
    }
};
exports.favoritesNamelist = async (req, res, next) => {
    try {
        const requests = req.bodyParams;
        if (!requests.userId) {
            return res.apiResponse(false, 'UserId is required', {}, 400)
        }
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
        match['userId'] = requests.userId;
        if (requests.name && requests.name !== '') {
            match['name'] = requests.name;
        }
        if (requests.type && requests.type !== '') {
            match['type'] = requests.type;
        }
        if (requests.status && requests.status !== '') {
            match['status'] = requests.status;
        }
        if (requests.fromDate && requests.toDate) {
            let startDate = moment(requests.fromDate);
            let endDate = moment(requests.toDate);
            if (startDate.isValid() && endDate.isValid()) {
                match.createdAt = {
                    $gte: startDate.startOf('day').toDate(),
                    $lte: endDate.endOf('day').toDate()
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
            FavouritesName.paginate(match, options, function (err, data) {
                if (err) {
                    return res.apiResponse(false, "Error while fetching lists", {}, 404);
                }
                return res.apiResponse(true, "Success", data, 200);
            });
        } else {
            let names = [];
            if (Object.keys(match).length === 0) {
                names = await FavouritesName.find({});
            } else {
                names = await FavouritesName.find(match);
            }
            return res.apiResponse(true, "Success", { docs: names }, 200);
        }

    } catch (error) {
        return res.apiResponse(false, 'Get list error', {}, 500);
    }
}
exports.getFavorites = async (req, res) => {
    try {
        const { userId } = req.bodyParams;
        if (!userId) {
            return res.apiResponse(false, 'UserId is required', {}, 400)
        }
        const favorite = await FavouritesName.find({ userId })
            .populate('babyNames')
            .populate({
                path: 'babyNames',
                select: 'name type id'
            })

        return res.apiResponse(true, 'Fetched successfully', favorite, 200);
    } catch (err) {
        console.error('Get Favorites Error:', err);
        return res.apiResponse(false, 'Error fetching favorites', {}, 500);
    }
};
