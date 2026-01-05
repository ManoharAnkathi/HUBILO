const mongoose = require('mongoose');
const Listing = require('./listings.js');
const User = require('./user.js');
const Owner = require('./owner.js');
const bookingSchema = new mongoose.Schema({
    // Essential references
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    listing: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Listing',
        required: true
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Owner',
        required: true
    },
    
    // Booking dates
    checkIn: {
        type: Date,
        required: true
    },
    checkOut: {
        type: Date,
        required: true
    },
    
    // Basic guest info
    numberOfGuests: {
        type: Number,
        required: true,
        default: 1
    },
    
    // Simple pricing
    totalPrice: {
        type: Number,
        required: true
    },
    
    // Simple status
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'cancelled'],
        default: 'pending'
    },
    
    // Payment status
    paymentStatus: {
        type: String,
        enum: ['pending', 'paid'],
        default: 'pending'
    },
    
    // User info for owner (snapshot at booking time)
    userInfo: {
        name: String,
        email: String,
        phone: String
    },
    
    // Created at timestamp
    createdAt: {
        type: Date,
        default: Date.now
    },
    confirmationEmailSent: {
        type: Boolean,
        default: false
    }
});

// Simple function to check if dates are available
bookingSchema.statics.isAvailable = async function(listingId, checkIn, checkOut) {
    const overlapping = await this.find({
        listing: listingId,
        status: 'confirmed', // Only confirmed bookings block dates
        $or: [
            { checkIn: { $lt: checkOut }, checkOut: { $gt: checkIn } }
        ]
    });
    
    return overlapping.length === 0;
};

const Booking = mongoose.model('Booking', bookingSchema);
module.exports = Booking;