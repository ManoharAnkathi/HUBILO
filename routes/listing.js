const express = require("express");
const router = express.Router();
const { isLoggedIn, validateListing, isOwner } = require("../middleware.js");
const { index, renderNewForm, uploadNewListing, showListing, editListing, updateListing, deleteListing } = require("../controllers/listings.js");
const multer = require("multer");
const {storage} = require("../cloudConfig.js");
const upload = multer({storage});

// Index Route and Upload New Route
router.get("/user/:id", index);



router
.route("/")
.post(upload.single('listing[image]'), uploadNewListing);

// New Route
router.get('/new', isLoggedIn, renderNewForm);

// Show Route and Update Route and Delete Route
router
    .route("/:id")
    .get(showListing)
    .put(isLoggedIn, upload.single('listing[image]'), isOwner, updateListing)
    .delete(isLoggedIn, isOwner, deleteListing);

//Edit Route
router.get("/:id/edit", isLoggedIn, isOwner, editListing);

module.exports = router;