const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
    booking_id: {
        type: String,
        required: true,
        unique: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    room: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Room',
        required: true
    },
    check_in: {
        type: Date,
        required: true
    },
    check_out: {
        type: Date,
        required: true
    },
    room_number: {
        type: String, // Assigned by admin during check-in
        default: ''
    },
    booking_status: {
        type: String,
        enum: ['booked', 'cancelled', 'arrived'],
        default: 'booked'
    },
    amount: {
        type: Number,
        required: true
    },
    trans_id: {
        type: String,
        required: true
    },
    trans_status: {
        type: String,
        enum: ['pending', 'success', 'failed'],
        default: 'success'
    },
    user_name: {
        type: String,
        required: true
    },
    user_phone: {
        type: String,
        required: true
    },
    user_address: {
        type: String,
        required: true
    },
    refund: {
        type: Boolean,
        default: false // Set to true if reservation cancelled and refund processed
    }
}, { timestamps: true });

module.exports = mongoose.model('Booking', bookingSchema);
