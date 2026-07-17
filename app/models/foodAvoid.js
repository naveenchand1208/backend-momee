const mongoose = require('mongoose')
const mongoosePaginate = require('mongoose-paginate-v2')

const foodAvoidSchema = new mongoose.Schema({
    id: String,
    title: String,
    file: String,
    public_id: String,
    categoryId: String,
    momType: String,
    foodType: String,
    symptoms: Array,
    week: String,
    region: String,
    month: String,
    description: String,
    status: {
        type: String,
        default: "Active",
    },
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    timestamps: true
})

foodAvoidSchema.virtual('category', {
    ref: 'FoodAvoidCategory',
    localField: 'categoryId',
    foreignField: 'id',
    justOne: true
})

foodAvoidSchema.plugin(mongoosePaginate)

module.exports = mongoose.model('FoodAvoid', foodAvoidSchema)