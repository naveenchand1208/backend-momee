const mongoose = require('mongoose')
const mongoosePaginate = require('mongoose-paginate-v2')

const dieticianSchema = new mongoose.Schema({
    id: String,
    name: String,
    email: String,
    dob: String,
    mobile: String,
    gender: String,
    password: {
        type: String,
        default: 'Momee@123'
    },
    role: {
        type: String,
        default: 'dietician'
    },
    qualification: String,
    experince: String,
    certifications: Array,
    status: {
        type: String,
        default: "Active",
    },
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    timestamps: true
})
dieticianSchema.plugin(mongoosePaginate)

module.exports = mongoose.model('Dietician', dieticianSchema)