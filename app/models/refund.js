const mongoose = require('mongoose')
const mongoosePaginate = require('mongoose-paginate-v2')

const refundSchema = new mongoose.Schema({
    id: String,
    description: String,
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    timestamps: true
})

refundSchema.plugin(mongoosePaginate)

module.exports = mongoose.model('Refund', refundSchema)