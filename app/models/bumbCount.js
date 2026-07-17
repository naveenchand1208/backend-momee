const mongoose = require('mongoose')
const mongoosePaginate = require('mongoose-paginate-v2')

const bumbCountSchema = new mongoose.Schema({
    id: String,
    count: Number,
    userId: String,
    date: String,
    time: String,
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    timestamps: true
})
bumbCountSchema.plugin(mongoosePaginate)

module.exports = mongoose.model('BumbCount', bumbCountSchema)