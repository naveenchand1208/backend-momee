const mongoose = require('mongoose')
const mongoosePaginate = require('mongoose-paginate-v2')

const userExerciseSubscriptionSchema = new mongoose.Schema({
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
    validityStartDate: String,
    validityEndDate: String,
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    timestamps: true
})

userExerciseSubscriptionSchema.virtual('user', {
    ref: 'Auth',
    localField: 'userId',
    foreignField: 'id',
    justOne: true
})
userExerciseSubscriptionSchema.virtual('subscribedPlan', {
    ref: 'ExercisePlan',
    localField: 'subscriptionId',
    foreignField: 'id',
    justOne: true
})

userExerciseSubscriptionSchema.plugin(mongoosePaginate)

module.exports = mongoose.model('UserExercisePlan', userExerciseSubscriptionSchema)