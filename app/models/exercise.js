const mongoose = require('mongoose')
const mongoosePaginate = require('mongoose-paginate-v2')

const exerciseSchema = new mongoose.Schema({
    id: String,
    collectionName: String,
    duration: String,
    burnCalories: String,
    week: String,
    month: String,
    file: String,
    public_id: String,
    exercises: [
        {
            exerciseName: String,
            exerciseId: String,
            sets: Number,
            seconds: Number,
            file: String,
            public_id: String
          }
    ],
    momType: String,
    status: {
        type: String,
        default: "Active",
    },
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    timestamps: true
})

exerciseSchema.plugin(mongoosePaginate)

module.exports = mongoose.model('Exercise', exerciseSchema)