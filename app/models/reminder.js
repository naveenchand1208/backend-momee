const mongoose = require('mongoose')
const mongoosePaginate = require('mongoose-paginate-v2')

const reminderSchema = new mongoose.Schema({
    id: String,
    userId: String,
    name: {
        type: String,
        default: "",
    },
    date: {
        type: String,
        default: "",
    },
    time: {
        type: String,
        default: "",
    },
    reminderTime: {
        type: String,
        default: "",
    },
    reminderDate: {
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

reminderSchema.plugin(mongoosePaginate)

module.exports = mongoose.model('Reminder', reminderSchema)