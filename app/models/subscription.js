const mongoose = require('mongoose')
const mongoosePaginate = require('mongoose-paginate-v2')

const subscriptionSchema = new mongoose.Schema({
    id: String,
    planName: String,
    planAmount: String,
    color: String,
    durationMonths: String,
    features: Array,
    status: {
        type: String,
        default: "Active",
    },
    // momTypes: Array,
    // momType: String,
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    timestamps: true
})

subscriptionSchema.plugin(mongoosePaginate)

module.exports = mongoose.model('Plan', subscriptionSchema)