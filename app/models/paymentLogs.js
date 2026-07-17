const mongoose = require('mongoose')
const mongoosePaginate = require('mongoose-paginate-v2')

const paymentLogSchema = new mongoose.Schema({
    id: String,
    module: String,
    userId: String,
    orderId: String,
    subscriptionId: String,
    productId: String,
    classId: String,
    paymentId: String,
    paymentStatus: String,
    method: {
        type: String,
        default: ""
    },
    logStatus: String,
    amount: Number,
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    timestamps: true
})

paymentLogSchema.virtual('user', {
    ref: 'Auth',
    localField: 'userId',
    foreignField: 'id',
    justOne: true
})

paymentLogSchema.plugin(mongoosePaginate)

module.exports = mongoose.model('PaymentLogs', paymentLogSchema)