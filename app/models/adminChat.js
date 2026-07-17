const mongoose = require('mongoose')
const mongoosePaginate = require('mongoose-paginate-v2')

const adminChatSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        index: true,
    },
    chats: [
        {
            chatType: {
                type: String, // 'user' or 'admin'
                enum: ['user', 'admin'],
                required: true
            },
            message: {
                type: String,
                required: true
            },
            dateTime: {
                type: Date,
                default: Date.now
            }
        }
    ]
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    timestamps: true
})

adminChatSchema.virtual('user', {
    ref: 'Auth',
    localField: 'userId',
    foreignField: 'id',
    justOne: true
})

adminChatSchema.plugin(mongoosePaginate)

module.exports = mongoose.model('AdminChat', adminChatSchema)