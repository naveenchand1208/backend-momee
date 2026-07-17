const mongoose = require('mongoose')
const mongoosePaginate = require('mongoose-paginate-v2')

const notificationLogSchema = new mongoose.Schema({
    id: String,
    title: String,
    message: String,
    counts: {
        type: Number,
        default: 0,
    },
    file: String,
    public_id: String,
    status: {
        type: String,
        default: "Active",
    },
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    timestamps: true
})

notificationLogSchema.plugin(mongoosePaginate)

module.exports = mongoose.model('NotificationLogs', notificationLogSchema)