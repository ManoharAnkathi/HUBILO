const mongoose = require('mongoose');
const passportLocalMongoose = require('passport-local-mongoose');
const Booking = require('./bookings.js');
const ownerSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true
    },
    username: {
        type: String,
        required: true,
        unique: true
    },
    // Owner-specific fields
    businessName: {
        type: String,
        required: true
    },
    businessType: {
        type: String,
        enum: ['hotel', 'bnb', 'homestay', 'apartment', 'villa', 'hostel', 'resort'],
        required: true
    },
    phone: {
        type: String,
        required: true
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    verificationToken: String,
    verificationExpires: Date,
    
    // Business details
    businessAddress: {
        street: String,
        city: String,
        state: String,
        country: String,
        zipCode: String
    },
    businessPhone: String,
    businessEmail: String,
    
    // Legal documents
    taxId: String,
    businessLicense: String,
    gstNumber: String,
    
    // Bank details
    bankDetails: {
        accountNumber: String,
        accountHolderName: String,
        bankName: String,
        branch: String,
        ifscCode: String,
        upiId: String
    },
    
    // Verification documents
    identityProof: {
        documentType: String,
        documentNumber: String,
        documentImage: String
    },
    addressProof: {
        documentType: String,
        documentImage: String
    },
    businessProof: {
        documentType: String,
        documentImage: String
    },
    kycStatus: {
        type: String,
        enum: ['pending', 'verified', 'rejected'],
        default: 'pending'
    },
    
    // Business metrics
    listings: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Listing'
    }],
    totalBookings: {
        type: Number,
        default: 0
    },
    totalRevenue: {
        type: Number,
        default: 0
    },
    rating: {
        average: { type: Number, default: 0 },
        count: { type: Number, default: 0 }
    },
    businessDescription: String,
    yearsInBusiness: Number,
    profilePic: {
        url: String,
        filename: String,
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    bookings: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Booking'
    }]
});

ownerSchema.plugin(passportLocalMongoose);
module.exports = mongoose.model('Owner', ownerSchema);