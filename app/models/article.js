const mongoose = require('mongoose')
const mongoosePaginate = require('mongoose-paginate-v2')

const articleSchema = new mongoose.Schema({
    id: String,
    title: String,
    file: String,
    public_id: String,
    banner: String,
    banner_public_id: String,
    categoryId: String,
    description: String,
    translations: {
        type: mongoose.Schema.Types.Mixed,
        default: () => ({
            en: {},
            ta: {}
        })
    },
    momType: String,
    week: String,
    month: String,
    index: Number,
    views: Array,
    viewsCount: {
        type: Number,
        default: 0,
    },
    duration: {
        type: Number,
        default: 0,
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

articleSchema.virtual('category', {
    ref: 'ArticleCategory',
    localField: 'categoryId',
    foreignField: 'id',
    justOne: true
})

articleSchema.index({ createdAt: -1 });
articleSchema.index({ index: 1 });
articleSchema.index({ categoryId: 1 });
articleSchema.index({ momType: 1 });
articleSchema.index({ status: 1 });
articleSchema.index({ week: 1 });
articleSchema.index({ month: 1 });
articleSchema.index({ title: 'text' });

articleSchema.plugin(mongoosePaginate)

module.exports = mongoose.model('Article', articleSchema)

