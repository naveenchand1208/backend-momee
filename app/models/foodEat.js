const mongoose = require('mongoose')
const mongoosePaginate = require('mongoose-paginate-v2')

const foodEatSchema = new mongoose.Schema({
    id: String,
    userId: String,
    title: String,
    file: String,
    public_id: String,
    categoryId: String,
    momType: String,
    foodType: String,
    week: String,
    month: String,
    energy: String,
    duration: String,
    protein: String,
    region: String,
    status: {
        type: String,
        default: "Active",
    },
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    timestamps: true
})

foodEatSchema.virtual('category', {
    ref: 'FoodEatCategory',
    localField: 'categoryId',
    foreignField: 'id',
    justOne: true
})

foodEatSchema.plugin(mongoosePaginate)

module.exports = mongoose.model('FoodEat', foodEatSchema)