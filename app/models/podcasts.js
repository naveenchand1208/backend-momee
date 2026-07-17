const mongoose = require('mongoose')
const mongoosePaginate = require('mongoose-paginate-v2')

const podCastsSchema = new mongoose.Schema({
    id: String,
    title: String,
    file: String,
    public_id: String,
    music: String,
    music_public_id: String,
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

podCastsSchema.plugin(mongoosePaginate)

module.exports = mongoose.model('PodCasts', podCastsSchema)