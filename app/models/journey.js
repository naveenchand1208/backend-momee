const mongoose = require('mongoose')
const mongoosePaginate = require('mongoose-paginate-v2')

const journeySchema = new mongoose.Schema({
    id: String,
    name: String,
    file: String,
    public_id: String,
    trimesterId: {
        type: String,
        default: "",
    },
    weight: {
        type: Number,
        default: 0,
    },
    height: {
        type: Number,
        default: 0,
    },
    babyFruitSize: {
        type: String,
        default: "",
    },
    description: String,
    momType: String,
    week: String,
    month: String,
    link: String,
    notes: [
        {
            title: String,
            descriptions: [
                {
                    id: Number,
                    content: String,
                },
            ],
        }
    ],
    status: {
        type: String,
        default: "Active",
    }
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    timestamps: true
})

journeySchema.plugin(mongoosePaginate)

module.exports = mongoose.model('Journey', journeySchema)