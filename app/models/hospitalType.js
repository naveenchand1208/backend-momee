const mongoose = require('mongoose')
const mongoosePaginate = require('mongoose-paginate-v2')

const hospitalTypeSchema = new mongoose.Schema({
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