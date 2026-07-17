const mongoose = require('mongoose')
const mongoosePaginate = require('mongoose-paginate-v2')

const userArticleSchema = new mongoose.Schema({
    id: String,
    articleId: String,
    article: Object,
    userId: String,
    userName: String,
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    timestamps: true
})

userArticleSchema.virtual('articles', {
    ref: 'Article',
    localField: 'articleId',
    foreignField: 'id',
    justOne: true
})
userArticleSchema.virtual('user', {
    ref: 'Auth',
    localField: 'userId',
    foreignField: 'id',
    justOne: true
})

userArticleSchema.plugin(mongoosePaginate)

module.exports = mongoose.model('UserArticle', userArticleSchema)