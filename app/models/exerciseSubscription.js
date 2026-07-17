const mongoose = require('mongoose')
const mongoosePaginate = require('mongoose-paginate-v2')

const exerciseSubscriptionSchema = new mongoose.Schema({
    id: String,
    planName: String,
    planAmount: String,
    durationMonths: String,
    // features: Array,
    deviceType: {
        type: String,
        enum: ['android', 'ios'],
        default: 'android',
    },
    status: {
        type: String,
        default: "Active",
    },
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    timestamps: true
})

exerciseSubscriptionSchema.plugin(mongoosePaginate)

module.exports = mongoose.model('ExercisePlan', exerciseSubscriptionSchema)