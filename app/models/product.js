const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const productSchema = new mongoose.Schema({

    id: String,

    // English
    name: {
        type: String,
        default: ''
    },

    // Product files
    files: {
        type: Array,
        default: []
    },

    // English
    description: {
        type: String,
        default: ''
    },

    actualPrice: String,

    price: String,

    discountPercentage: String,

    momType: {
        type: String,
        enum: ['newMom', 'pregMom'],
        required: true,
    },

    status: {
        type: String,
        enum: ['Active', 'Inactive'],
        default: 'Active',
    },

    // English + Tamil
    translations: {
        en: {
            name: {
                type: String,
                default: ''
            },

            description: {
                type: String,
                default: ''
            }
        },

        ta: {
            name: {
                type: String,
                default: ''
            },

            description: {
                type: String,
                default: ''
            }
        }
    }

}, {
    toJSON: {
        virtuals: true
    },

    toObject: {
        virtuals: true
    },

    timestamps: true
});

productSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('Product', productSchema);