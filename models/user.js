const mongoose = require('mongoose');
const passportLocalMongoose = require('passport-local-mongoose');
const Booking = require('./bookings.js');
const userSchema = new mongoose.Schema({
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
    firstName: String,
    lastName: String,
    phone: String,
    isVerified: {
        type: Boolean,
        default: false
    },
    verificationToken: String,
    verificationExpires: Date,
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

userSchema.plugin(passportLocalMongoose);
module.exports = mongoose.model('User', userSchema);