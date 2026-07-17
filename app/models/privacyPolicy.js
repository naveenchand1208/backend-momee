const mongoose = require('mongoose')
const mongoosePaginate = require('mongoose-paginate-v2')

const privacyPolicySchema = new mongoose.Schema({
    id: String,
    description: String,
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    timestamps: true
})

privacyPolicySchema.plugin(mongoosePaginate)

module.exports = mongoose.model('PrivacyPolicy', privacyPolicySchema)