const mongoose = require('mongoose')
const mongoosePaginate = require('mongoose-paginate-v2')

const bookSchema = new mongoose.Schema({
    id: String,
    title: String,
    translations: {
            type: mongoose.Schema.Types.Mixed,
            default: () => ({
                en: {},
                ta: {}
            })
        },
    file: String,
    public_id: String,
    book: String,
    link: String,
    book_public_id: String,
    momType: String,
    status: {
        type: String,
        default: "Active",
    },
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    timestamps: true
})

bookSchema.plugin(mongoosePaginate)

module.exports = mongoose.model('Book', bookSchema)