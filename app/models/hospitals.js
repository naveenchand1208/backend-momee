const mongoose = require('mongoose')
const mongoosePaginate = require('mongoose-paginate-v2')

const hospitalSchema = new mongoose.Schema({
    id: String,
    name: String,
    address: String,
    mobile: String,
    file: String,
    public_id: String,
    latitude: String,
    longitude: String,
    email: String,
    departmentIds: Array,
    facilities: Array,
    typeIds: Array,
    Doctors: {
        type: Array,
        default: [{
            name: String,
            departmentIds: Array,
            bio: String,
        }]
    },
    status: {
        type: String,
        default: "Active",
    },
    location: {
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point',
            required: true
        },
        coordinates: {
            type: [Number], // [longitude, latitude]
            required: true
        }
    },
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    timestamps: true
})

hospitalSchema.virtual('department', {
    ref: 'HospitalDepartment',
    localField: 'departmentIds',
    foreignField: 'title',
    justOne: false
})
hospitalSchema.index({ location: '2dsphere' });

hospitalSchema.plugin(mongoosePaginate)

module.exports = mongoose.model('Hospital', hospitalSchema)