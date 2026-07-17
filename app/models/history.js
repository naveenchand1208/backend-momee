const mongoose = require('mongoose')
const mongoosePaginate = require('mongoose-paginate-v2')

const historyLogSchema = new mongoose.Schema({
    id: String,
    type: String,
    headers: String,
    options: Object,
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    timestamps: true
})

// historyLogSchema.virtual('user', {
//     ref: 'Auth',
//     localField: 'userId',
//     foreignField: 'id',
//     justOne: true
// })

historyLogSchema.plugin(mongoosePaginate)

module.exports = mongoose.model('HistoryLogs', historyLogSchema)