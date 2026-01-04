const express = require("express");
const router = express.Router();
const passport = require("passport");
const User = require("../models/user.js");
const { saveOriginalurl } = require("../middleware.js");
const { 
    signUp, 
    uploadSignup, 
    logIn, 
    uploadLogin, 
    logOut,
    resendOTP 
} = require("../controllers/users.js");
const { bool } = require("joi");

//SignUp and uploadSignupUser
router
    .route("/signup")
    .get(signUp)
    .post(uploadSignup);

//Login and uploadLoginUser
router
    .route("/login")
    .get(logIn)
    .post(saveOriginalurl,
        passport.authenticate("local", {
            failureRedirect: "/login",
            failureMessage: true,
            failureFlash: true
        }),
        uploadLogin
    );

//Logout
router.get("/logout", logOut);

//Users Bookings
router.get("/user/bookings", (req, res) => {
    res.redirect(`/user/bookings/${req.user._id}`)
});

router.get("/user/bookings/:id", async (req, res) => {
    const user = await User.findById(req.params.id).populate({path: 'bookings', populate: {path: 'listing'}});
    if (!user || req.user._id.toString() !== req.params.id) {
        req.flash("error", "You are not authorized to view these bookings.");
        return res.redirect("/login");
    }
    res.render("users/bookings", {
        user,
        title: "My Bookings - Hubilo"
    });
});
        


module.exports = router;