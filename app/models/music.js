const mongoose = require('mongoose')
const mongoosePaginate = require('mongoose-paginate-v2')

const musicSchema = new mongoose.Schema({
    id: String,
    name: String,
    momType: String,
    file: String,
    public_id: String,
    playLists: [
        {
            name: String,
            playListId: String,
            duration: Number,
            file: String,
            public_id: String
          }
    ],
    status: {
        type: String,
        default: "Active",
    },
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    timestamps: true
})

musicSchema.plugin(mongoosePaginate)

module.exports = mongoose.model('Music', musicSchema)