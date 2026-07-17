const mongoose = require('mongoose')
const mongoosePaginate = require('mongoose-paginate-v2')

const masterExerciseSchema = new mongoose.Schema({
    id: String,
    name: String,
    file: String,
    public_id: String,
    status: {
        type: String,
        default: "Active",
    },
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    timestamps: true
})
masterExerciseSchema.plugin(mongoosePaginate)

module.exports = mongoose.model('MasterExercise', masterExerciseSchema)