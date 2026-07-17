const mongoose = require('mongoose')
const mongoosePaginate = require('mongoose-paginate-v2')

const termsSchema = new mongoose.Schema({
    id: String,
    description: String,
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    timestamps: true
})

termsSchema.plugin(mongoosePaginate)

module.exports = mongoose.model('Terms', termsSchema)