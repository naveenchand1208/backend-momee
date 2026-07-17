const mongoose = require('mongoose')
const mongoosePaginate = require('mongoose-paginate-v2')

const userDietSubscriptionSchema = new mongoose.Schema({
    id: String,
    userId: String,
    planName: String,
    planAmount: String,
    subscriptionId: String,
    paymentId: String,
    environment: String,
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
    purchasedDate: String,
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    timestamps: true
})

userDietSubscriptionSchema.virtual('user', {
    ref: 'Auth',
    localField: 'userId',
    foreignField: 'id',
    justOne: true
})
userDietSubscriptionSchema.virtual('subscribedPlan', {
    ref: 'DietPlan',
    localField: 'subscriptionId',
    foreignField: 'id',
    justOne: true
})

userDietSubscriptionSchema.plugin(mongoosePaginate)

module.exports = mongoose.model('UserDietPlan', userDietSubscriptionSchema)