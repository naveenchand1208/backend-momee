const mongoose = require('mongoose')
const mongoosePaginate = require('mongoose-paginate-v2')

const sessionNotificationSchema = new mongoose.Schema({
    id: String,
    title: String,
    message: String,
    userIds: Array,
    // users: {
    //     type: Array,
    //     default: [],
    // },
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    timestamps: true
})

sessionNotificationSchema.plugin(mongoosePaginate)

module.exports = mongoose.model('SessionNotification', sessionNotificationSchema)