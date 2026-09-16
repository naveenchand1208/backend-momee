const mongoose = require('mongoose');

const mongoosePaginate = require('mongoose-paginate-v2');

const playlistSchema = new mongoose.Schema({

    // Existing English playlist name
    name: {
        type: String,
        default: ''
    },

    playListId: {
        type: String,
        default: ''
    },

    duration: {
        type: Number,
        default: 0
    },

    file: {
        type: String,
        default: ''
    },

    public_id: {
        type: String,
        default: ''
    },

    // English + Tamil playlist
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

});


const musicSchema = new mongoose.Schema({

    id: String,

    // Existing English music name
    name: String,

    momType: String,

    file: String,

    public_id: String,

    playLists: [
        playlistSchema
    ],

    status: {
        type: String,
        default: "Active",
    },

    // English + Tamil music
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


musicSchema.plugin(mongoosePaginate);

module.exports = mongoose.model(
    'Music',
    musicSchema
);