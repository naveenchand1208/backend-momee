const mongoose = require('mongoose')
const mongoosePaginate = require('mongoose-paginate-v2')

const batchSchema = new mongoose.Schema({
    id: String,
    title: String,
    file: String,
    public_id: String,
    momType: String,
    week: String,
    month: String,
    status: {
        type: String,
        default: "Active",
    },
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    timestamps: true
})
batchSchema.plugin(mongoosePaginate)

module.exports = mongoose.model('Batch', batchSchema)