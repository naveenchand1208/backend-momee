const mongoose = require('mongoose')

// One document per platform. Checked by the app on every launch (public
// endpoint, no auth — must work before login) to decide whether the
// installed build is too old to keep running.
const appUpdateSchema = new mongoose.Schema({
    platform: { type: String, required: true, enum: ['android', 'ios'], unique: true },
    minVersion: { type: String, required: true, default: '1.0.0', trim: true },        // below this -> force update
    latestVersion: { type: String, required: true, default: '1.0.0', trim: true },     // informational only
    storeUrl: { type: String, required: true, default: '', trim: true },               // Play/App Store listing
    updateMessage: { type: String, default: 'A new version of Momee is available. Please update to continue.', trim: true },
    forceUpdateEnabled: { type: Boolean, default: true },                              // kill-switch, admin can disable instantly
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    timestamps: true
})

module.exports = mongoose.model('AppUpdate', appUpdateSchema)
