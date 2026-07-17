const mongoose = require('mongoose')
const mongoosePaginate = require('mongoose-paginate-v2')

const customExerciseSchema = new mongoose.Schema({
    id: String,
    userId: String,
    date: String,
    time: String,
    exerciseId: String,
    sets: Number,
    reps: Number,
    status: {
        type: String,
        default: "Active"
    }
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    timestamps: true
})

customExerciseSchema.virtual('exercise', {
    ref: 'MasterExercise',
    localField: 'exerciseId',
    foreignField: 'id',
    justOne: true
})
customExerciseSchema.virtual('user', {
    ref: 'Auth',
    localField: 'userId',
    foreignField: 'id',
    justOne: true
})

customExerciseSchema.plugin(mongoosePaginate)

module.exports = mongoose.model('CustomExercise', customExerciseSchema)