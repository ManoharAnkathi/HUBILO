const express = require("express");
const router = express.Router();
const userController = require("../controllers/users");
const ownerController = require("../controllers/owners");


// OTP verification page (shared)
router.get("/verify-otp", (req, res) => {
    const { userId, type } = req.query;
    if (!userId || !type) {
        return res.redirect("/");
    }
    res.render("verify-otp", { 
        userId, 
        type,
        error: req.flash("error"),
        success: req.flash("success")
    });
});

// OTP verification handler
router.post("/verify-otp", (req, res, next) => {
    const { userId, userType } = req.body;
    
    switch(userType) {
        case 'user':
            return userController.verifyOTP(req, res, next);
        case 'owner':
            return ownerController.verifyOTP(req, res, next);
        case 'admin':
            return adminController.verifyOTP(req, res, next);
        default:
            req.flash("error", "Invalid user type");
            res.redirect("/");
    }
});

// Resend OTP
router.post("/resend-otp", (req, res, next) => {
    const { userType } = req.body;
    
    switch(userType) {
        case 'user':
            return userController.resendOTP(req, res);
        case 'owner':
            return ownerController.resendOTP(req, res);
        case 'admin':
            return adminController.resendOTP(req, res);
        default:
            return res.json({ success: false, message: "Invalid user type" });
    }
});

module.exports = router;