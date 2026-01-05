const mongoose = require('mongoose');
const Review = require("./reviews.js");
const Owner = require("./owner.js");
const Booking = require("./bookings.js");
const listingSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
    },
    description: {
        type: String,
    },
    category: {
        type: String,
        enum: ['castle', 'pool', 'tent', 'farm', 'stand', 'garage', 'hotel', 'beach', 'villa', 'apartment', 'resort', 'rooms'],
        required: true
    },
    image: {
        url: String,
        filename: String,
    },
    price: {
        type: Number,
    },
    location: {
        type: String,
    },
    country: {
        type: String
    },
    reviews: [
        {
            type: mongoose.Types.ObjectId,
            ref: "Review"
        }
    ],
    owner: {
        type: mongoose.Types.ObjectId,
        ref: "Owner",
    },
    geometry: {
        type: {
            type: String, // Don't do `{ location: { type: String } }`
            enum: ['Point'], // 'location.type' must be 'Point'
            required: true
        },
        coordinates: {
            type: [Number],
            required: true
        }
    },
    bookings: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Booking'
    }]
});

listingSchema.post("findOneAndDelete", async (listing) => {
    await Review.deleteMany({ _id: { $in: listing.reviews } });
});
const Listing = mongoose.model("Listing", listingSchema);
module.exports = Listing;
