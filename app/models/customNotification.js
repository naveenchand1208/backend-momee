const mongoose = require('mongoose')
const mongoosePaginate = require('mongoose-paginate-v2')

const customNotificationSchema = new mongoose.Schema({
    id: String,
    title: String,
    message: String,
    userIds: Array,
    userNotifications: Array,
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

customNotificationSchema.virtual('user', {
    ref: 'Auth',
    localField: 'userId',
    foreignField: 'id',
    justOne: true
})


customNotificationSchema.plugin(mongoosePaginate)

module.exports = mongoose.model('CustomNotification', customNotificationSchema)