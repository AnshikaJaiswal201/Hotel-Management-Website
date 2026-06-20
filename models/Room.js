const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    area: {
        type: Number,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    quantity: {
        type: Number,
        required: true
    },
    adult: {
        type: Number,
        required: true
    },
    children: {
        type: Number,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    features: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Feature'
    }],
    facilities: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Facility'
    }],
    images: [{
        type: String // array of image filenames
    }],
    thumbImage: {
        type: String, // thumbnail image filename
        default: ''
    },
    status: {
        type: Boolean,
        default: true // true = active, false = inactive
    }
}, { timestamps: true });

module.exports = mongoose.model('Room', roomSchema);
