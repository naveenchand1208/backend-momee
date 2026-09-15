const mongoose = require('mongoose')

const whatsappAccountSchema = new mongoose.Schema({
    key: {
        type: String,
        default: "default",
        unique: true
    },
    accessToken: {
        type: String,
        default: "",
    },
    tokenType: {
        type: String,
        default: "",
    },
    expiresIn: {
        type: Number,
        default: null,
    },
    wabaId: {
        type: String,
        default: "",
    },
    phoneNumberId: {
        type: String,
        default: "",
    },
    connectedBy: {
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

module.exports = mongoose.model('WhatsappAccount', whatsappAccountSchema)
