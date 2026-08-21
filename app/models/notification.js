const mongoose = require('mongoose')
const mongoosePaginate = require('mongoose-paginate-v2')

// Per-user notification inbox. Distinct from CustomNotification (which is
// the admin-facing broadcast/push-log record with no per-user read/delete
// state) — this is what backs the mobile app's Notifications screen for
// anything other than the locally-synthesized admin-chat entries.
const notificationSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        index: true,
    },
    title: {
        type: String,
        required: true,
    },
    message: {
        type: String,
        required: true,
    },
    type: {
        type: String,
        default: 'general',
    },
    isRead: {
        type: Boolean,
        default: false,
    },
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    timestamps: true
})

notificationSchema.plugin(mongoosePaginate)

module.exports = mongoose.model('Notification', notificationSchema)
