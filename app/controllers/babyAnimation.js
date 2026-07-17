const BabyAnimation = require('../models/babyAnimation')
const moment = require('moment');
const { uploadToCloudinary, deleteFromCloudinary } = require('../helpers/cloudinary');

exports.add = async (req, res, next) => {
    try {
        const { name, babySize, babyWeight } = req.body;
        if (!name || !babySize || !babyWeight || !req.file) {
            return res.apiResponse(false, 'Params is missing', {}, 400);
        }
        const allowedType = 'image/gif';
        if (req.file.mimetype !== allowedType) {
            return res.apiResponse(false, 'Only GIF files are allowed', {}, 400);
        }
        const checkTitle = await BabyAnimation.findOne({ name })
        if (checkTitle) {
            return res.apiResponse(false, 'Name already exists', {}, 400);
        }
        const { secure_url, public_id } = await uploadToCloudinary(req.file, 'babyAnimation');
        const uniqueId = `BabyAnimation-${moment().format('DDMMYYYYHHmmss')}`;
        const newAnimation = new BabyAnimation({
            name,
            babySize,
            babyWeight,
            file: secure_url,
            public_id: public_id,
            id: uniqueId,
        });
        await newAnimation.save();
        return res.apiResponse(true, "BabyAnimation added Success", newAnimation, 200);
    } catch (error) {
        console.error("Add BabyAnimation Error:", error);
        return res.apiResponse(false, 'BabyAnimation Add error', { error }, 500);
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
            BabyAnimation.paginate(match, options, function (err, data) {
                if (err) {
                    return res.apiResponse(false, "Error while fetching lists", {}, 404);
                }
                return res.apiResponse(true, "Success", data, 200);
            });
        } else {
            let animations = [];
            if (Object.keys(match).length === 0) {
                animations = await BabyAnimation.find({});
            } else {
                animations = await BabyAnimation.find(match);
            }
            return res.apiResponse(true, "Success", { docs: animations }, 200);
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
        const animations = await BabyAnimation.findOne({ id: requests.id })
        if (!animations) {
            return res.apiResponse(false, 'BabyAnimation not found', {}, 404);
        }
        return res.apiResponse(true, 'Success', animations, 200);
    } catch (error) {
        return res.apiResponse(false, 'get BabyAnimation error', {}, 500)
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
            if (req.body.babySize) updateFields.babySize = req.body.babySize;
            if (req.body.babyWeight) updateFields.babyWeight = req.body.babyWeight;
            if (req.body.status) updateFields.status = req.body.status;
            if (fileChanged && public_id) {
                await deleteFromCloudinary(public_id);
                if (req.file) {
                    const { secure_url, public_id } = await uploadToCloudinary(req.file, 'babyAnimation');
                    updateFields.file = secure_url;
                    updateFields.public_id = public_id;
                }
            }
            const updatedAnimation = await BabyAnimation.findOneAndUpdate(
                { id },
                { $set: updateFields },
                { new: true }
            );
            if (!updatedAnimation) {
                return res.apiResponse(false, 'Animation not found', {}, 404);
            }
            return res.apiResponse(true, 'Animation updated successfully', updatedAnimation, 200);
        } else {
            return res.apiResponse(false, 'Payload is missing', {}, 400);
        }
    } catch (error) {
        console.error('Update Error:', error);
        return res.apiResponse(false, 'Error updating Animation', {}, 500);
    }

};
exports.delete = async (req, res, next) => {
    try {
        var requests = req.bodyParams;
        if (!requests.id) {
            return res.apiResponse(false, 'Id is missing', {}, 400);
        }
        const animation = await BabyAnimation.findOne({ id: requests.id })
        if (!animation) {
            return res.apiResponse(false, 'BabyAnimation not found', {}, 404)
        }
        if (animation && animation.public_id) {
            await deleteFromCloudinary(animation.public_id);
        }
        const result = await BabyAnimation.deleteOne({ id: requests.id });

        if (result.deletedCount === 0) {
            return res.apiResponse(false, 'BabyAnimation not found', {}, 404)
        }
        return res.apiResponse(true, 'BabyAnimation deleted successfully', result, 200)
    } catch (error) {
        return res.apiResponse(false, 'Delete BabyAnimation error', { error }, 500)
    }
}