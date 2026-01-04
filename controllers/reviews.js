const wrapAsync = require("../utils/wrapAsync.js");
const Listing = require("../models/listings.js");
const Review = require("../models/reviews.js");

module.exports.postReview=wrapAsync(async (req, res) => {
    let listing = await Listing.findById(req.params.id);
    let newReview = new Review(req.body.review);
    newReview.author = req.user._id;
    listing.reviews.push(newReview);
    console.log(newReview);
    await listing.save();
    await newReview.save();
    req.flash("success", "Review added")
    res.redirect(`/listings/${listing._id}`);
});

module.exports.deleteReview = wrapAsync(async (req, res) => {
    let { id, reviewId } = req.params;
    await Listing.findByIdAndUpdate(id, { $pull: { reviews: reviewId } });
    await Review.findByIdAndDelete(reviewId);
    req.flash("failure", "Review deleted");
    res.redirect(`/listings/${id}`);
})