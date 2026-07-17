const mongoose = require('mongoose')
const mongoosePaginate = require('mongoose-paginate-v2')

const assetsSchema = new mongoose.Schema({
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
assetsSchema.plugin(mongoosePaginate)

module.exports = mongoose.model('Assets', assetsSchema)