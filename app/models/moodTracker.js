const mongoose = require('mongoose')
const mongoosePaginate = require('mongoose-paginate-v2')

const moodTrackerSchema = new mongoose.Schema({
    id: String,
    dateAndTime: String,
    userId: String,
    score: String,
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    timestamps: true
})
moodTrackerSchema.virtual('user', {
    ref: 'Auth',
    localField: 'userId',
    foreignField: 'id',
    justOne: true
})
moodTrackerSchema.plugin(mongoosePaginate)

module.exports = mongoose.model('MoodTracker', moodTrackerSchema)