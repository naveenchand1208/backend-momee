const mongoose = require('mongoose')
const mongoosePaginate = require('mongoose-paginate-v2')

const communitySchema = new mongoose.Schema({
    id: String,
    userId: String,
    title: String,
    description: String,
    file: String,
    public_id: String,
    like: Array,
    comment: Array,
    approved: {
        type: Boolean,
        default: false,
    },
    totalLikes: {
        type: Number,
        default: 0
    },
    totalComments: {
        type: Number,
        default: 0
    },
    categoryId: String,
    momType: String,
    report: [
        {
            reportId: String,
            userId: String,
            reason: String,
            userType: String,
            createdAt: {
                type: Date,
                default: Date.now
            }
        }
    ],
    status: {
        type: String,
        default: "Active",
    },
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    timestamps: true
})

communitySchema.virtual('category', {
    ref: 'ComCategory',
    localField: 'categoryId',
    foreignField: 'id',
    justOne: true
})
communitySchema.virtual('user', {
    ref: 'Auth',
    localField: 'userId',
    foreignField: 'id',
    justOne: true
})

communitySchema.plugin(mongoosePaginate)

module.exports = mongoose.model('Community', communitySchema)