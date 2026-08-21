const Notification = require('../models/notification')

// List the current user's notifications (paginated). Scoped to req.user
// (set by the authorization middleware from the JWT) so one user can never
// see another user's notifications.
exports.list = async (req, res) => {
    try {
        const requests = req.bodyParams || {};
        const page = requests.page || 1;
        const per_page = requests.limit || 10;
        const pagination = requests.pagination || "true";
        const sortOrder = requests.sortOrder === 'asc' ? 1 : -1;

        const userId = String(req.user.userid);
        const match = { userId };

        if (pagination === "true") {
            const options = {
                page,
                limit: per_page,
                sort: { createdAt: sortOrder },
                lean: true,
            };

            // Promise form (no callback) so this handler actually waits for
            // the query before responding, instead of returning early while
            // the callback is still pending.
            const data = await Notification.paginate(match, options);
            return res.apiResponse(true, "Success", data, 200);
        } else {
            const docs = await Notification.find(match).sort({ createdAt: -1 }).lean();
            return res.apiResponse(true, "Success", { docs }, 200);
        }
    } catch (error) {
        console.error("Notification list error:", error);
        return res.apiResponse(false, 'Get notification list error', {}, 500);
    }
};

// Mark one of the current user's notifications as read.
exports.markRead = async (req, res) => {
    try {
        const { notificationId } = req.bodyParams || {};
        if (!notificationId) {
            return res.apiResponse(false, 'notificationId is missing', {}, 400);
        }

        const userId = String(req.user.userid);
        const notification = await Notification.findOneAndUpdate(
            { _id: notificationId, userId },
            { $set: { isRead: true } },
            { new: true }
        );

        if (!notification) {
            return res.apiResponse(false, 'Notification not found', {}, 404);
        }

        return res.apiResponse(true, 'Notification marked as read', notification, 200);
    } catch (error) {
        console.error("Notification markRead error:", error);
        return res.apiResponse(false, 'Mark notification read error', {}, 500);
    }
};

// Delete one of the current user's notifications.
exports.delete = async (req, res) => {
    try {
        const { notificationId } = req.bodyParams || {};
        if (!notificationId) {
            return res.apiResponse(false, 'notificationId is missing', {}, 400);
        }

        const userId = String(req.user.userid);
        const result = await Notification.deleteOne({ _id: notificationId, userId });

        if (!result.deletedCount) {
            return res.apiResponse(false, 'Notification not found', {}, 404);
        }

        return res.apiResponse(true, 'Notification deleted successfully', {}, 200);
    } catch (error) {
        console.error("Notification delete error:", error);
        return res.apiResponse(false, 'Delete notification error', {}, 500);
    }
};
