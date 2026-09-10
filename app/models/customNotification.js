const mongoose = require('mongoose');

const mongoosePaginate = require('mongoose-paginate-v2');

const customNotificationSchema = new mongoose.Schema({

    id: String,

    // Existing English fields
    title: {
        type: String,
        default: ''
    },

    message: {
        type: String,
        default: ''
    },

    userIds: {
        type: Array,
        default: []
    },

    userNotifications: {
        type: Array,
        default: []
    },

    file: String,

    public_id: String,

    status: {
        type: String,
        default: "Active",
    },

    // English + Tamil
    translations: {
        type: mongoose.Schema.Types.Mixed,

        default: () => ({
            en: {
                title: '',
                message: ''
            },

            ta: {
                title: '',
                message: ''
            }
        })
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


customNotificationSchema.virtual('user', {

    ref: 'Auth',

    localField: 'userId',

    foreignField: 'id',

    justOne: true

});


customNotificationSchema.plugin(mongoosePaginate);

module.exports =
    mongoose.model(
        'CustomNotification',
        customNotificationSchema
    );