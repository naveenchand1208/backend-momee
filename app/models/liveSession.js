const mongoose = require('mongoose')
const mongoosePaginate = require('mongoose-paginate-v2')

const liveSessionSchema = new mongoose.Schema({
    id: String,
    name: String,
    file: String,
    public_id: String,
    fromDate: String,
    toDate: String,
    startTime: String,
    endTime: String,
    momType: String,
    performedBy: String,
    amount: String,
    description: String,
    MeetingLink: String,
    users: {
        type: Array,
        default: [],
    },
    deviceType: {
        type: String,
        enum: ['android', 'ios'],
        default: 'android',
    },
    status: {
        type: String,
        default: "Active",
    }
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    timestamps: true
})

liveSessionSchema.plugin(mongoosePaginate)

module.exports = mongoose.model('LiveSession', liveSessionSchema)