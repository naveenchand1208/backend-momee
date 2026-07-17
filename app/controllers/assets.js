const Assets = require('../models/assets')
const moment = require('moment');
const { uploadToCloudinary, deleteFromCloudinary } = require('../helpers/cloudinary');

exports.add = async (req, res, next) => {
    try {
        console.log('req.body', req.body)
        const { name } = req.body;
        if (!name || !req.file) {
            return res.apiResponse(false, 'Asset params is missing', {}, 400);
        }
        const checkTitle = await Assets.findOne({ name })
        if (checkTitle) {
            return res.apiResponse(false, 'Title already exists', {}, 400);
        }
        const { secure_url, public_id } = await uploadToCloudinary(req.file, 'assets');
        const uniqueId = `Assets-${moment().format('DDMMYYYYHHmmss')}`;
        const newAsset = new Assets({
            name,
            file: secure_url,
            public_id: public_id,
            id: uniqueId,
        });
        await newAsset.save();
        return res.apiResponse(true, "Asset added Success", newAsset, 200);
    } catch (error) {
        console.error("Add Asset Error:", error);
        return res.apiResponse(false, 'Asset Add error', { error }, 500);
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
            Assets.paginate(match, options, function (err, data) {
                if (err) {
                    return res.apiResponse(false, "Error while fetching lists", {}, 404);
                }
                return res.apiResponse(true, "Success", data, 200);
            });
        } else {
            let assets = [];
            if (Object.keys(match).length === 0) {
                assets = await Assets.find({});
            } else {
                assets = await Assets.find(match);
            }
            return res.apiResponse(true, "Success", { docs: assets }, 200);
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
        const asset = await Assets.findOne({ id: requests.id })
        if (!asset) {
            return res.apiResponse(false, 'Asset not found', {}, 404);
        }
        return res.apiResponse(true, 'Success', asset, 200);
    } catch (error) {
        return res.apiResponse(false, 'get Asset error', {}, 500)
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
            if (req.body.name) updateFields.name = req.body.name;
            if (req.body.status) updateFields.status = req.body.status;
            if (fileChanged && public_id) {
                await deleteFromCloudinary(public_id);
                if (req.file) {
                    const { secure_url, public_id } = await uploadToCloudinary(req.file, 'assets');
                    updateFields.file = secure_url;
                    updateFields.public_id = public_id;
                }
            }
            const updatedAsset = await Assets.findOneAndUpdate(
                { id },
                { $set: updateFields },
                { new: true }
            );
            if (!updatedAsset) {
                return res.apiResponse(false, 'Asset not found', {}, 404);
            }
            return res.apiResponse(true, 'Asset updated successfully', updatedAsset, 200);
        } else {
            return res.apiResponse(false, 'Payload is missing', {}, 400);
        }
    } catch (error) {
        console.error('Update Error:', error);
        return res.apiResponse(false, 'Error updating Asset', {}, 500);
    }

};

exports.delete = async (req, res, next) => {
    try {
        var requests = req.bodyParams;
        if (!requests.id) {
            return res.apiResponse(false, 'Id is missing', {}, 400);
        }
        const asset = await Assets.findOne({ id: requests.id })
        if (!asset) {
            return res.apiResponse(false, 'Asset not found', {}, 404)
        }
        if (asset && asset.public_id) {
            await deleteFromCloudinary(asset.public_id);
        }
        const result = await Assets.deleteOne({ id: requests.id });

        if (result.deletedCount === 0) {
            return res.apiResponse(false, 'Asset not found', {}, 404)
        }
        return res.apiResponse(true, 'Asset deleted successfully', result, 200)
    } catch (error) {
        return res.apiResponse(false, 'Delete Asset error', { error }, 500)
    }
}