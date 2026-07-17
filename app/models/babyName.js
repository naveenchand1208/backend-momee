const mongoose = require('mongoose')
const mongoosePaginate = require('mongoose-paginate-v2')

const babyNameSchema = new mongoose.Schema({
    id: String,
    name: String,
    type: String,
    status: {
        type: String,
        default: "Active",
    },
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    timestamps: true
})
babyNameSchema.plugin(mongoosePaginate)

module.exports = mongoose.model('BabyName', babyNameSchema)