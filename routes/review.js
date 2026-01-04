const express = require("express");
const router = express.Router({ mergeParams: true });
const { validateReview, isLoggedIn, isAuthorReview } = require("../middleware.js");
const { postReview, deleteReview } = require("../controllers/reviews.js");

//Post REVIEW Route
router.post("/", validateReview, isLoggedIn, postReview);

//DELETE REVIEW ROUTE
router.delete("/:reviewId", isLoggedIn, isAuthorReview, deleteReview);

module.exports = router;