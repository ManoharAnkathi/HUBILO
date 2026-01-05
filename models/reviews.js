const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const User = require('./user');
const reviewSchema = new Schema({
    comment: String,
    rating: {
        type: Number,
        min: 1,
        max: 5
    },
    created_at: {
        type: Date,
        default: Date.now(),
    },
    author: {
        type: mongoose.Types.ObjectId,
        ref: "User"
    }
});
const Review = mongoose.model("Review", reviewSchema);
module.exports = Review;