const mongoose = require('mongoose')
const mongoosePaginate = require('mongoose-paginate-v2')

const consumptionCountSchema = new mongoose.Schema({
    id: String,
    volume: Number,
    userId: String,
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    timestamps: true
})
consumptionCountSchema.plugin(mongoosePaginate)

module.exports = mongoose.model('Consumption', consumptionCountSchema)