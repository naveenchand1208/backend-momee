const SessionNotification = require('../models/sessionNotification')
const Auth = require('../models/auth')
const moment = require('moment');
const { uploadToCloudinary, deleteFromCloudinary } = require('../helpers/cloudinary');

exports.add = async (req, res, next) => {
    try {
        const { title, message, userIds } = req.bodyParams;
        if (!title || !message || userIds.length === 0) {
            return res.apiResponse(false, 'Notification params is missing', {}, 400);
        }
        // const checkTitle = await SessionNotification.findOne({ title: title })
        // if (checkTitle) {
        //     return res.apiResponse(false, 'Title already exists', {}, 400);
        // }
        const uniqueId = `SessionNotification-${moment().format('DDMMYYYYHHmmss')}`;
        const newNotify = new SessionNotification({
            title,
            id: uniqueId,
            message,
            userIds,
        });
        await newNotify.save();
        return res.apiResponse(true, "Notification added Success", newNotify, 200);
    } catch (error) {
        console.error("Add Notification Error:", error);
        return res.apiResponse(false, 'Notification Add error', { error }, 500);
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
        // if (requests.status && requests.status !== '') {
        //     match['status'] = requests.status;
        // }
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
        };

        if (pagination === "true") {
            options.sort = { createdAt: 1 };
            SessionNotification.paginate(match, options, async function (err, data) {
                if (err) {
                    return res.apiResponse(false, "Error while fetching lists", {}, 404);
                }

                data.docs = await getAllUsers(data.docs).sort({ createdAt: 1 });;
                return res.apiResponse(true, "Success", data, 200);
            });
        } else {
            const notificationDocs = await SessionNotification.find(match).sort({ [sortField]: sortOrder === 'asc' ? 1 : -1 });
            const docs = await getAllUsers(notificationDocs);
            return res.apiResponse(true, "Success", { docs }, 200);
        }

    } catch (error) {
        return res.apiResponse(false, 'Get list error', {}, 500);
    }
}

exports.view = async (req, res, next) => {
    try {
        const { id } = req.bodyParams;
        if (!id) {
            return res.apiResponse(false, 'Id is missing', {}, 400);
        }
        const notify = await SessionNotification.findOne({ id });
        if (!notify) {
            return res.apiResponse(false, 'Notification not found', {}, 404);
        }
        const users = await getUsers(notify.userIds || []);
        const notifyObj = {
            ...notify.toObject(),
            users,
        };
        return res.apiResponse(true, 'Success', notifyObj, 200);
    } catch (error) {
        console.error(error);
        return res.apiResponse(false, 'Get notification error', {}, 500);
    }
};

// exports.update = async (req, res, next) => {
//     try {
//         if (req.body) {
//             const body = Object(req.body);
//             const { id, public_id, fileChanged } = body;
//             if (id === undefined || id === null) {
//                 return res.apiResponse(false, 'Id is missing', {}, 400);
//             }
//             const updateFields = {};
//             if (req.body.title) updateFields.title = req.body.title;
//             if (!!req.body.momType) updateFields.momType = req.body.momType;
//             if (!!req.body.week) updateFields.week = req.body.week;
//             if (req.body.status) updateFields.status = req.body.status;
//             if (fileChanged && public_id) {
//                 await deleteFromCloudinary(public_id);
//                 if (req.file) {
//                     const { secure_url, public_id } = await uploadToCloudinary(req.file, 'batch');
//                     updateFields.file = secure_url;
//                     updateFields.public_id = public_id;
//                 }
//             }
//             const updatedBatch = await Batch.findOneAndUpdate(
//                 { id },
//                 { $set: updateFields },
//                 { new: true }
//             );
//             if (!updatedBatch) {
//                 return res.apiResponse(false, 'Batch not found', {}, 404);
//             }
//             return res.apiResponse(true, 'Batch updated successfully', updatedBatch, 200);
//         } else {
//             return res.apiResponse(false, 'Payload is missing', {}, 400);
//         }
//     } catch (error) {
//         console.error('Update Error:', error);
//         return res.apiResponse(false, 'Error updating Batch', {}, 500);
//     }

// };

// exports.delete = async (req, res, next) => {
//     try {
//         var requests = req.bodyParams;
//         if (!requests.id) {
//             return res.apiResponse(false, 'Id is missing', {}, 400);
//         }
//         const batch = await Batch.findOne({ id: requests.id })
//         if (!batch) {
//             return res.apiResponse(false, 'Batch not found', {}, 404)
//         }
//         if (batch && batch.public_id) {
//             await deleteFromCloudinary(batch.public_id);
//         }
//         const result = await Batch.deleteOne({ id: requests.id });

//         if (result.deletedCount === 0) {
//             return res.apiResponse(false, 'Batch not found', {}, 404)
//         }
//         return res.apiResponse(true, 'Batch deleted successfully', result, 200)
//     } catch (error) {
//         return res.apiResponse(false, 'Delete Batch error', { error }, 500)
//     }
// }

const getUsers = async (userIds = []) => {
    if (!Array.isArray(userIds) || userIds.length === 0) return [];
    return Auth.find({ id: { $in: userIds } }, 'id userName');
};

const getAllUsers = async (docs = []) => {
    if (!Array.isArray(docs) || docs.length === 0) return [];

    return Promise.all(
        docs.map(async (doc) => {
            const userIds = doc.userIds || [];
            const users = await Auth.find({ id: { $in: userIds } }, 'id userName');
            return {
                ...doc.toObject?.() ?? doc,
                users,
                userCount: users.length,
            };
        })
    );
}