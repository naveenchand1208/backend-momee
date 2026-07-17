const mongoose = require('mongoose')
const mongoosePaginate = require('mongoose-paginate-v2')

const sosSchema = new mongoose.Schema({
    id: String,
    userId: String,
    message: String,
    count: Number,
    date: String,
    sosMembers: Array,
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    timestamps: true
})

sosSchema.virtual('user', {
    ref: 'Auth',
    localField: 'userId',
    foreignField: 'id',
    justOne: true
})

sosSchema.plugin(mongoosePaginate)

module.exports = mongoose.model('SOS', sosSchema)