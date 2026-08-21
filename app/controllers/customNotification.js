const fireBaseNotification = require('../helpers/pushNotification');
const CustomNotification = require('../models/customNotification')
const Auth = require('../models/auth')
const moment = require('moment');
const NotificationLogs = require('../models/notificationLogs');
const { uploadToCloudinary } = require('../helpers/cloudinary');
const notifyUsers = require('../helpers/notifyUsers');

exports.add = async (req, res, next) => {
    try {
        console.log('req.body', req.body)
        const { title, userIds, message } = req.body;
        if (!title || !Array.isArray(userIds) || userIds.length === 0 || !message) {
            return res.apiResponse(false, 'Notifications params are missing', {}, 400);
        }
        let fileUpload;
        if (req.file) {
            fileUpload = await uploadToCloudinary(req.file, 'CustomNotification');
        }

        const now = moment().format('DDMMYYYYHHmmss');
        const uniqueId = `CustomNotification-${now}`;

        const userNotifications = [];

        // Collect all notification sending tasks
        const tasks = userIds.map(async (userId) => {
            try {
                const user = await Auth.findOne({ id: userId }).select('userName deviceInfos');

                if (!user) {
                    userNotifications.push({
                        userId,
                        userName: null,
                        success: false,
                        reason: 'User not found'
                    });
                    return;
                }

                const deviceInfo = user.deviceInfos?.find(info => info.logout === false);
                const fcmToken = deviceInfo?.fcmToken;

                if (!fcmToken) {
                    userNotifications.push({
                        userId,
                        userName: user.userName,
                        success: false,
                        reason: 'FCM token not available or user logged out'
                    });
                    return;
                }

                await fireBaseNotification(fcmToken, {
                    title,
                    body: message,
                    image: fileUpload.secure_url,
                    data: {
                        type: 'custom-notifications',
                    }
                });

                userNotifications.push({
                    userId,
                    userName: user.userName,
                    success: true,
                    reason: 'Success'
                });
            } catch (err) {
                userNotifications.push({
                    userId,
                    userName: null,
                    success: false,
                    reason: err.message || 'Unknown error while sending notification'
                });
            }
        });

        // Run all tasks, even if some fail
        await Promise.allSettled(tasks);

        // Save notification in DB
        const newNotification = new CustomNotification({
            title,
            userIds,
            message,
            file: fileUpload.secure_url,
            public_id: fileUpload.public_id,
            id: uniqueId,
            userNotifications
        });
        await newNotification.save();

        const logId = `NotificationLog-${now}`;
        const newClickCount = new NotificationLogs({
            id: logId,
            title: title,
            message: message,
            file: fileUpload.secure_url,
            public_id: fileUpload.public_id,
        })
        await newClickCount.save();

        // Persist one per-user notification row so it shows up in the
        // app's Notifications screen (/api/notification/list), independent
        // of whether the FCM push above actually reached the device.
        try {
            await notifyUsers(userIds, { title, message, type: 'custom_notification' });
        } catch (err) {
            console.error("Failed to persist per-user notifications:", err);
        }

        return res.apiResponse(true, "Notifications processed", {
            notification: newNotification,
            userNotifications
        }, 200);

    } catch (error) {
        console.error("Notification Send Error:", error);
        return res.apiResponse(false, 'Notifications send error', {}, 500);
    }
};

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
        // if (requests.searchKey !== undefined && requests.searchKey.trim() !== '') {
        //     const searchTerm = requests.searchKey.trim();
        //     match['name'] = { $regex: searchTerm, $options: 'i' };
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
        const options = {
            page: page,
            limit: per_page,
            skip: skip,
            sort: { [sortField]: sortOrder },
        };
        if (pagination === "true") {
            options.sort = { createdAt: -1 };
            CustomNotification.paginate(match, options, function (err, data) {
                if (err) {
                    return res.apiResponse(false, "Error while fetching lists", {}, 404);
                }
                return res.apiResponse(true, "Success", data, 200);
            });
        } else {
            let notifications = [];
            const query = Object.keys(match).length === 0
                ? CustomNotification.find({})
                : CustomNotification.find(match);

            notifications = await query
                // .populate({
                //     path: 'user',
                //     select: 'id user'
                // })
                .sort({ createdAt: -1 });
            return res.apiResponse(true, "Success", { docs: notifications }, 200);
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
        const notification = await CustomNotification.findOne({ id });
        if (!notification) {
            return res.apiResponse(false, 'Notification not found', {}, 404);
        }
        const users = await Auth.find({ id: { $in: notification.userIds } }).select('id userName');
        return res.apiResponse(true, 'Success', {
            ...notification.toObject(),
            usersArray: users
        }, 200);
    } catch (error) {
        return res.apiResponse(false, 'Get notification error', {}, 500);
    }
};

// exports.update = async (req, res, next) => {
//     try {
//         if (req.body) {
//             const { id, public_id, fileChanged } = req.body;
//             if (id === undefined || id === null) {
//                 return res.apiResponse(false, 'Id is missing', {}, 400);
//             }
//             const updateFields = {};
//             if (req.body.type) updateFields.type = req.body.type;
//             if (req.body.url) updateFields.url = req.body.url;
//             if (req.body.status) updateFields.status = req.body.status;
//             if (fileChanged && public_id) {
//                 await deleteFromCloudinary(public_id);
//                 if (req.file) {
//                     const { secure_url, public_id } = await uploadToCloudinary(req.file, 'hospitals');
//                     updateFields.file = secure_url;
//                     updateFields.public_id = public_id;
//                 }
//             }
//             const updatedBanner = await Banner.findOneAndUpdate(
//                 { id },
//                 { $set: updateFields },
//                 { new: true }
//             );
//             if (!updatedBanner) {
//                 return res.apiResponse(false, 'Banner not found', {}, 404);
//             }
//             return res.apiResponse(true, 'Banner updated successfully', updatedBanner, 200);
//         } else {
//             return res.apiResponse(false, 'Payload is missing', {}, 400);
//         }
//     } catch (error) {
//         console.error('Update Error:', error);
//         return res.apiResponse(false, 'Error updating Banner', {}, 500);
//     }

// };

exports.delete = async (req, res, next) => {
    try {
        var requests = req.bodyParams;
        if (!requests.id) {
            return res.apiResponse(false, 'Id is missing', {}, 400);
        }
        const result = await CustomNotification.deleteOne({ id: requests.id });
        if (!result) {
            return res.apiResponse(false, 'Notification Not Found', {}, 404);
        }
        return res.apiResponse(true, 'Notification deleted successfully', result, 200)
    } catch (error) {
        return res.apiResponse(false, 'Delete Notification error', { error }, 500)
    }
}

exports.logList = async (req, res, next) => {
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
        // if (requests.searchKey !== undefined && requests.searchKey.trim() !== '') {
        //     const searchTerm = requests.searchKey.trim();
        //     match['name'] = { $regex: searchTerm, $options: 'i' };
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
        const options = {
            page: page,
            limit: per_page,
            skip: skip,
            sort: { [sortField]: sortOrder },
        };
        if (pagination === "true") {
            options.sort = { createdAt: -1 };
            NotificationLogs.paginate(match, options, function (err, data) {
                if (err) {
                    return res.apiResponse(false, "Error while fetching lists", {}, 404);
                }
                return res.apiResponse(true, "Success", data, 200);
            });
        } else {
            let notifications = [];
            const query = Object.keys(match).length === 0
                ? NotificationLogs.find({})
                : NotificationLogs.find(match);

            notifications = await query
                // .populate({
                //     path: 'user',
                //     select: 'id user'
                // })
                .sort({ createdAt: -1 });
            return res.apiResponse(true, "Success", { docs: notifications }, 200);
        }

    } catch (error) {
        return res.apiResponse(false, 'Get list error', {}, 500);
    }
}