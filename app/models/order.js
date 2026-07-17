const mongoose = require('mongoose')
const mongoosePaginate = require('mongoose-paginate-v2')

const orderSchema = new mongoose.Schema({
    id: String,
    userId: String,
    productId: String,
    // orderId: String,
    quantity: Number,
    amount: Number,
    paymentId: String,
    status:{
        type: String,
        default: "Ordered",
    }
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    timestamps: true
})

orderSchema.virtual('user', {
    ref: 'Auth',
    localField: 'userId',
    foreignField: 'id',
    justOne: true
})

orderSchema.virtual('product', {
    ref: 'Product',
    localField: 'productId',
    foreignField: 'id',
    justOne: true
})

orderSchema.plugin(mongoosePaginate)

module.exports = mongoose.model('Order', orderSchema)