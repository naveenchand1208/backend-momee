const mongoose = require('mongoose')
const mongoosePaginate = require('mongoose-paginate-v2')

const dietAvoidFoodSchema = new mongoose.Schema({
    id: String,
    userId: String,
    templateId: String,
    categoryId: String,
    description: String,
    symptoms: Array,
    status: {
        type: String,
        default: "Active"
    }
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    timestamps: true
})

dietAvoidFoodSchema.virtual('category', {
    ref: 'FoodAvoidCategory',
    localField: 'categoryId',
    foreignField: 'id',
    justOne: true
})
dietAvoidFoodSchema.virtual('template', {
    ref: 'FoodTemplate',
    localField: 'templateId',
    foreignField: 'id',
    justOne: true
})
dietAvoidFoodSchema.virtual('user', {
    ref: 'Auth',
    localField: 'userId',
    foreignField: 'id',
    justOne: true
})

dietAvoidFoodSchema.plugin(mongoosePaginate)

module.exports = mongoose.model('DietAvoidFood', dietAvoidFoodSchema)