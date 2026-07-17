const mongoose = require('mongoose')
const mongoosePaginate = require('mongoose-paginate-v2')

const moodQuotesSchema = new mongoose.Schema({
    id: String,
    date: String,
    quotes: Object,
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    timestamps: true
})
moodQuotesSchema.virtual('user', {
    ref: 'Auth',
    localField: 'userId',
    foreignField: 'id',
    justOne: true
})
moodQuotesSchema.plugin(mongoosePaginate)

module.exports = mongoose.model('MoodQuotes', moodQuotesSchema)