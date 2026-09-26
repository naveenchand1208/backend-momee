const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const masterExerciseSchema = new mongoose.Schema({
    id: {
        type: String
    },
    // English
    name: {
        type: String,
        required: true
    },
    file: {
        type: String
    },
    public_id: {
        type: String
    },
    status: {
        type: String,
        default: 'Active'
    },
    // English + Tamil
    translations: {
        en: {
            name: {
                type: String,
                default: ''
            }
        },
        ta: {
            name: {
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

masterExerciseSchema.plugin(mongoosePaginate);

module.exports = mongoose.model(
    'MasterExercise',
    masterExerciseSchema
);