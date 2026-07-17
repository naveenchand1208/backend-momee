const mongoose = require('mongoose')
const mongoosePaginate = require('mongoose-paginate-v2')

const favouitesNameSchema = new mongoose.Schema({
    id: String,
    userId: String,
    type: String,
    names: Array,
    status: {
        type: String,
        default: "Active",
    },
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    timestamps: true
})

favouitesNameSchema.virtual('babyNames', {
  ref: 'BabyName',
  localField: 'names',
  foreignField: 'id'
});

favouitesNameSchema.plugin(mongoosePaginate)

module.exports = mongoose.model('FavouitesName', favouitesNameSchema)