const mongoose = require('mongoose')
const mongoosePaginate = require('mongoose-paginate-v2')

const babyAnimationSchema = new mongoose.Schema({
    id: String,
    name: String,
    babySize: Number,
    babyWeight: Number,
    file: String,
    public_id: String,
    status: {
        type: String,
        default: "Active",
    },
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    timestamps: true
})
babyAnimationSchema.plugin(mongoosePaginate)

module.exports = mongoose.model('BabyAnimation', babyAnimationSchema)