const { listingSchema, reviewSchema } = require("./schema.js");
const Listing = require("./models/listings.js");
const Review = require("./models/reviews.js");
const ExpressError = require("./utils/ExpressError.js");

//Isloggedin Middleware
module.exports.isLoggedIn = (req, res, next) => {
    if (!req.isAuthenticated()) {
        req.session.redirectUrl = req.originalUrl;
        req.flash("failure", "Login to wanderlust");
        return res.redirect("/login");
    }
    next();
}

//saveOriginal Middleware
module.exports.saveOriginalurl = ((req, res, next) => {
    if (req.session.redirectUrl) {
        res.locals.redirectUrl = req.session.redirectUrl;
    }
    next();
});

// ValidateListing Middleware
module.exports.validateListing = (req, res, next) => {
    let { error } = listingSchema.validate(req.body);
    console.log(error);
    if (error) {
        throw new ExpressError(400, error);
    } else {
        next();
    }
}

//isOwner
module.exports.isOwner = async (req, res, next) => {
    let { id } = req.params;
    let listing = await Listing.findById(id);
    if (!listing.owner.equals(res.locals.currUser._id)) {
        req.flash("failure", "Access Denied!");
        return res.redirect(`/listings/${id}`);
    }
    next();
}

//ValidateReview Middleware
module.exports.validateReview = (req, res, next) => {
    let { error } = reviewSchema.validate(req.body);
    console.log(error);
    if (error) {
        throw new ExpressError(400, error);
    } else {
        next();
    }
}

//isReviewAuthor
module.exports.isAuthorReview = async (req, res, next) => {
    let { id, reviewId } = req.params;
    let review = await Review.findById(reviewId);
    if (!review.author.equals(res.locals.currUser._id)) {
        req.flash("failure", "Access Denied!");
        return res.redirect(`/listings/${id}`);
    }
    next();
}