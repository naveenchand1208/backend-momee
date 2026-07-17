const mongoose = require('mongoose')
const mongoosePaginate = require('mongoose-paginate-v2')

const comCategorySchema = new mongoose.Schema({
    id: String,
    title: String,
    file: String,
    public_id: String,
    color: String,
    momType: String,
    // momTypes: Array,
    status: {
        type: String,
        default: "Active",
    },
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    timestamps: true
})

comCategorySchema.plugin(mongoosePaginate)

module.exports = mongoose.model('ComCategory', comCategorySchema)