const mongoose = require('mongoose')
const mongoosePaginate = require('mongoose-paginate-v2')

const userLiveClassSubscriptionSchema = new mongoose.Schema({
    id: String,
    userId: String,
    name: String,
    amount: String,
    classId: String,
    paymentId: String,
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    timestamps: true
})

userLiveClassSubscriptionSchema.virtual('user', {
    ref: 'Auth',
    localField: 'userId',
    foreignField: 'id',
    justOne: true
})
// userLiveClassSubscriptionSchema.virtual('subscribedPlan', {
//     ref: 'Plan',
//     localField: 'subscriptionId',
//     foreignField: 'id',
//     justOne: true
// })

userLiveClassSubscriptionSchema.plugin(mongoosePaginate)

module.exports = mongoose.model('UserLiveClassSubscription', userLiveClassSubscriptionSchema)