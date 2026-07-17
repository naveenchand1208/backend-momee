const mongoose = require('mongoose')
const mongoosePaginate = require('mongoose-paginate-v2')

const applePaymentHistorySchema = new mongoose.Schema({
    id: String,
    userId: String,
    module: String,
    subscriptionId: String,
    paymentId: String,
    environment: String,
    paymentStatus: String,
    logStatus: String,
    amount: Number,

    // productId: String,
    // originalTransactionId: String,
    // eventType: String,
    // purchaseDate: String,
    // expiryDate: String,
    // rawData: String,
    // classId: String,
    // orderId: String,
    // paymentId: String,
    // paymentStatus: String,
    // method: {
    //     type: String,
    //     default: ""
    // },
    // amount: Number,
    // module: {
    //     type: String,
    //     enum: ["DIET", "EXERCISE", "CLASS", "UNKNOWN"],
    //     default: "UNKNOWN",
    // },
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    timestamps: true
})

applePaymentHistorySchema.virtual('user', {
    ref: 'Auth',
    localField: 'userId',
    foreignField: 'id',
    justOne: true
})

applePaymentHistorySchema.plugin(mongoosePaginate)

module.exports = mongoose.model('ApplePaymentHistory', applePaymentHistorySchema)