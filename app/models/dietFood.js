const mongoose = require('mongoose')
const mongoosePaginate = require('mongoose-paginate-v2')

const dietFoodSchema = new mongoose.Schema({
    id: String,
    userId: String,
    date: String,
    time: String,
    templateId: String,
    categoryId: String,
    calorie: String,
    duration: String,
    weight: String,
    description: String,
    status: {
        type: String,
        default: "Active"
    }
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    timestamps: true
})

dietFoodSchema.virtual('category', {
    ref: 'FoodEatCategory',
    localField: 'categoryId',
    foreignField: 'id',
    justOne: true
})
dietFoodSchema.virtual('template', {
    ref: 'FoodTemplate',
    localField: 'templateId',
    foreignField: 'id',
    justOne: true
})
dietFoodSchema.virtual('user', {
    ref: 'Auth',
    localField: 'userId',
    foreignField: 'id',
    justOne: true
})

dietFoodSchema.plugin(mongoosePaginate)

module.exports = mongoose.model('DietFood', dietFoodSchema)