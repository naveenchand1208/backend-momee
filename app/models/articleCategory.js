const mongoose = require('mongoose')
const mongoosePaginate = require('mongoose-paginate-v2')

const articleCategorySchema = new mongoose.Schema({
    id: String,
    title: String,
    file: String,
    public_id: String,
    color: String,
    momType: String,
    momTypes: Array,
    index: Number,
    fileChanged: {
        type: Boolean,
        default: false,
    },
    status: {
        type: String,
        default: "Active",
    },
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    timestamps: true
})

articleCategorySchema.plugin(mongoosePaginate)

module.exports = mongoose.model('ArticleCategory', articleCategorySchema)