const mongoose = require('mongoose')
const mongoosePaginate = require('mongoose-paginate-v2')

const mediaGallerySchema = new mongoose.Schema({
    id: String,
    userId: String,
    title: String,
    description: String,
    fileType: String,
    driveId: String,
    webViewLink: String,
    webContentLink: String,
    status: {
        type: String,
        default: "Active",
    },
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    timestamps: true
})

mediaGallerySchema.virtual('category', {
    ref: 'FoodEatCategory',
    localField: 'categoryId',
    foreignField: 'id',
    justOne: true
})

mediaGallerySchema.plugin(mongoosePaginate)

module.exports = mongoose.model('MediaGallery', mediaGallerySchema)