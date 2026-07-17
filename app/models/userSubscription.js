const mongoose = require('mongoose')
const mongoosePaginate = require('mongoose-paginate-v2')

const userSubscriptionSchema = new mongoose.Schema({
    id: String,
    userId: String,
    planName: String,
    planAmount: String,
    subscriptionId: String,
    paymentId: String,
    activePlan: {
        type: Boolean,
        default: false
    },
    expired: {
        type: Boolean,
        default: false
    },
    // subscribedPlan: Object,
    // subscribedPlan: {
    //     type: Object,
    //     required: false, // or remove `required`
    //     default: undefined
    // },
    validityStartDate: String,
    validityEndDate: String,
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    timestamps: true
})

userSubscriptionSchema.virtual('user', {
    ref: 'Auth',
    localField: 'userId',
    foreignField: 'id',
    justOne: true
})
userSubscriptionSchema.virtual('subscribedPlan', {
    ref: 'Plan',
    localField: 'subscriptionId',
    foreignField: 'id',
    justOne: true
})

userSubscriptionSchema.plugin(mongoosePaginate)

module.exports = mongoose.model('UserPlan', userSubscriptionSchema)