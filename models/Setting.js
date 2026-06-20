const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema({
    site_title: {
        type: String,
        default: 'Bellona Luxury Hotel'
    },
    site_about: {
        type: String,
        default: ''
    },
    shutdown: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

module.exports = mongoose.model('Setting', settingSchema);
