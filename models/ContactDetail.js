const mongoose = require('mongoose');

const contactDetailSchema = new mongoose.Schema({
    address: {
        type: String,
        default: 'XYZ, Prayagraj Uttar Pradesh'
    },
    gmap: {
        type: String,
        default: 'https://maps.app.goo.gl/2WkzEWY9Rvkr8vq98'
    },
    pn1: {
        type: String,
        default: '+915678943288'
    },
    pn2: {
        type: String,
        default: '+915678943281'
    },
    email: {
        type: String,
        default: 'ask.aanshikajaiswal2005@gmail.com'
    },
    fb: {
        type: String,
        default: '#'
    },
    insta: {
        type: String,
        default: '#'
    },
    tw: {
        type: String,
        default: '#'
    },
    iframe: {
        type: String,
        default: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d230660.8692412711!2d81.80158454999999!3d25.402263750000024!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x398534c9b20bd49f%3A0xa2237856ad4041a!2sPrayagraj%2C%20Uttar%20Pradesh!5e0!3m2!1sen!2sin!4v1739418266973!5m2!1sen!2sin'
    }
}, { timestamps: true });

module.exports = mongoose.model('ContactDetail', contactDetailSchema);
