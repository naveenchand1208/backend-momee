const mongoose = require('mongoose')
const mongoosePaginate = require('mongoose-paginate-v2')

const productSchema = new mongoose.Schema({
    id: String,
    name: String,
    // file1: {
    //     type: String,
    //     default: "",
    // },
    // file1_public_id: {
    //     type: String,
    //     default: "",
    // },
    // file2: {
    //     type: String,
    //     default: "",
    // },
    // file2_public_id: {
    //     type: String,
    //     default: "",
    // },
    // file3: {
    //     type: String,
    //     default: "",
    // },
    // file3_public_id: {
    //     type: String,
    //     default: "",
    // },
    // file4: {
    //     type: String,
    //     default: "",
    // },
    // file4_public_id: {
    //     type: String,
    //     default: "",
    // },
    // file5: {
    //     type: String,
    //     default: "",
    // },
    // file5_public_id: {
    //     type: String,
    //     default: "",
    // },
    files: Array,
    description: String,
    actualPrice: String,
    price: String,
    discountPercentage: String,
    momType: String,
    status: {
        type: String,
        default: "Active",
    }
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    timestamps: true
})

productSchema.plugin(mongoosePaginate)

module.exports = mongoose.model('Product', productSchema)