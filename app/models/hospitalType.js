const mongoose = require('mongoose')
const mongoosePaginate = require('mongoose-paginate-v2')

const hospitalTypeSchema = new mongoose.Schema({
    // Multilingual values.
    // Keep existing fields unchanged for backward compatibility.
    // Example: translations: { en: { name: "Walking" }, ta: { name: "நடைப்பயிற்சி" } }
    translations: {
        type: mongoose.Schema.Types.Mixed,
        default: () => ({
            en: {},
            ta: {}
        })
    },
    id: String,
    name: String,
    status:{
        type: String,
        default: "Active",
    }
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    timestamps: true
})

hospitalTypeSchema.plugin(mongoosePaginate)

module.exports = mongoose.model('HospitalType', hospitalTypeSchema)