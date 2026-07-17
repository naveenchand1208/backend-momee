const mongoose = require('mongoose')
const mongoosePaginate = require('mongoose-paginate-v2')

const cancellationPolicySchema = new mongoose.Schema({
    id: String,
    description: String,
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    timestamps: true
})

cancellationPolicySchema.plugin(mongoosePaginate)

module.exports = mongoose.model('CancellationPolicy', cancellationPolicySchema)