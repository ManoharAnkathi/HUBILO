const express = require("express");
const router = express.Router();
const passport = require("passport");
const { saveOriginalurl } = require("../middleware.js");
const { 
    ownerSignUp, 
    ownerUploadSignup, 
    ownerLogIn, 
    ownerUploadLogin, 
    ownerLogOut,
    showVerifyOTP,
    verifyOwnerOTP,
    resendOTP,
    verifyEmail,
    showForgotPassword,
    sendPasswordResetEmail,
    showResetPassword,
    resetOwnerPassword
} = require("../controllers/owners.js");

// Owner SignUp
router.route("/owner/signup")
    .get(ownerSignUp)
    .post(ownerUploadSignup);

// Owner OTP Verification
router.route("/owner/verify-otp")
    .get(showVerifyOTP)
    .post(verifyOwnerOTP);

// Resend OTP for owner
router.post("/owner/resend-otp", resendOTP);

// Email Verification (optional)
router.get("/owner/verify-email/:token", verifyEmail);

// Owner Login
router.route("/owner/login")
    .get(ownerLogIn)
    .post(
        saveOriginalurl,
        passport.authenticate("owner-local", {
            failureRedirect: "/owner/login",
            failureMessage: true,
            failureFlash: true
        }),
        ownerUploadLogin
    );

// Password Reset
router.route("/owner/forgot-password")
    .get(showForgotPassword)
    .post(sendPasswordResetEmail);

router.route("/owner/reset-password/:token")
    .get(showResetPassword)
    .post(resetOwnerPassword);

// Owner Logout
router.get("/owner/logout", ownerLogOut);

module.exports = router;