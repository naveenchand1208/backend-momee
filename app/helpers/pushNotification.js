const admin = require("../config/firebase"); // or wherever you initialized firebase-admin

/**
 * Send push notification to a device using its FCM token
 * @param {string} fcmToken - The Firebase Cloud Messaging token of the device
 * @param {object} options - Notification options
 * @param {string} options.title - Notification title
 * @param {string} options.body - Notification body
 * @param {object} options.data - Optional custom data payload
 */
const fireBaseNotification = async (fcmToken, { title, body, data = {} }) => {
    if (!fcmToken) throw new Error("Missing FCM token");

    const message = {
        token: fcmToken,
        notification: {
            title: title || "Momee Notification",
            body: body || "You've got something new!"
        },
        android: {
            priority: "high"
        },
        data
    };

    try {
        const response = await admin.messaging().send(message);
        console.log(" Notification sent:", response);
        return response;
    } catch (error) {
        console.error("❌ Failed to send notification:", error.message);
        throw error;
    }
};

module.exports = fireBaseNotification;
