const mongoose = require('mongoose')
const mongoosePaginate = require('mongoose-paginate-v2')

const userFeedbackSchema = new mongoose.Schema({
    id: String,
    title: String,
    files: Array,
    description: String,
    status: {
        type: String,
        default: "Active",
    }
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    timestamps: true
})

userFeedbackSchema.plugin(mongoosePaginate)

module.exports = mongoose.model('UserFeedback', userFeedbackSchema)