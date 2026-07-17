const mongoose = require('mongoose')
const mongoosePaginate = require('mongoose-paginate-v2')

const articleSearchSchema = new mongoose.Schema({
    id: String,
    searchKey: String,
    searchCount: Number,
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    timestamps: true
})

articleSearchSchema.plugin(mongoosePaginate)

module.exports = mongoose.model('ArticleSearch', articleSearchSchema)