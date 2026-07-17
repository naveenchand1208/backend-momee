const mongoose = require('mongoose')
const mongoosePaginate = require('mongoose-paginate-v2')

const bannerSchema = new mongoose.Schema({
    id: String,
    type: {
        type: String,
        default: "",
    },
    url: {
        type: String,
        default: "",
    },
    file: {
        type: String,
        default: "",
    },
    public_id: {
        type: String,
        default: "",
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

bannerSchema.plugin(mongoosePaginate)

module.exports = mongoose.model('Banner', bannerSchema)