const mongoose = require('mongoose')
const mongoosePaginate = require('mongoose-paginate-v2')

const hospitalDepartmentSchema = new mongoose.Schema({
    id: String,
    title: String,
    subTitle: String,
    file: String,
    public_id: String,
    status:{
        type: String,
        default: "Active",
    }
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    timestamps: true
})

hospitalDepartmentSchema.plugin(mongoosePaginate)

module.exports = mongoose.model('HospitalDepartment', hospitalDepartmentSchema)