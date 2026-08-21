const Notification = require('../models/notification')

/**
 * Write one persisted per-user Notification row for each userId.
 * Kept as a standalone helper (no dependency on push/email/etc.) so any
 * producer — CustomNotification broadcasts, post-approval, subscription
 * events, ... — can call it without pulling in unrelated integrations,
 * and so it can be exercised in isolation.
 *
 * @param {string[]} userIds
 * @param {{title: string, message: string, type?: string}} payload
 * @returns {Promise<import('mongoose').Document[]>} the inserted docs
 */
async function notifyUsers(userIds, { title, message, type = 'general' }) {
    if (!Array.isArray(userIds) || userIds.length === 0) return [];
    if (!title || !message) return [];

    const docs = userIds.map((userId) => ({
        userId: String(userId),
        title,
        message,
        type,
        isRead: false,
    }));

    return Notification.insertMany(docs);
}

module.exports = notifyUsers;
