const mongoose = require('mongoose')
const mongoosePaginate = require('mongoose-paginate-v2')

const applePaymentLogSchema = new mongoose.Schema({
    id: String,
    userId: String,
    productId: String,
    transactionId: String,
    originalTransactionId: String,
    eventType: String,
    purchaseDate: String,
    expiryDate: String,
    environment: String,
    // rawData: String,
    module: String,
    logStatus: String,
    subscriptionId: String,
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    timestamps: true
})

applePaymentLogSchema.virtual('user', {
    ref: 'Auth',
    localField: 'userId',
    foreignField: 'id',
    justOne: true
})

applePaymentLogSchema.plugin(mongoosePaginate)

module.exports = mongoose.model('ApplePaymentLogs', applePaymentLogSchema)