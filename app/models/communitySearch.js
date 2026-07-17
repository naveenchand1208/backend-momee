const mongoose = require('mongoose')
const mongoosePaginate = require('mongoose-paginate-v2')

const communitySearchSchema = new mongoose.Schema({
    id: String,
    searchKey: String,
    searchCount: Number,
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    timestamps: true
})

communitySearchSchema.plugin(mongoosePaginate)

module.exports = mongoose.model('CommunitySearch', communitySearchSchema)