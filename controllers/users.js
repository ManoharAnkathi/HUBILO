const User = require("../models/user");
const wrapAsync = require("../utils/wrapAsync");
const otpService = require("../services/otpServices");
const crypto = require("crypto");

module.exports.signUp = (req, res) => {
    res.render("users/signup", { 
        role: 'user',
        title: 'User Sign Up' 
    });
}

module.exports.uploadSignup = wrapAsync(async (req, res, next) => {
    try {
        let { username, email, password, firstName, lastName, phone } = req.body;
        
        // Generate OTP
        const otp = otpService.generateOTP();
        const verificationToken = crypto.randomBytes(20).toString('hex');
        const verificationExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
        
        // Create user (passport-local-mongoose will handle password hashing)
        const newUser = new User({ 
            email, 
            username,
            firstName,
            lastName,
            phone,
            verificationToken,
            verificationExpires,
            isVerified: false
        });
        
        // Register user (this saves the user with hashed password)
        const registeredUser = await User.register(newUser, password);
        
        // Send OTP
        await otpService.sendEmailOTP(email, otp, 'user');
        
        // Store OTP in session
        req.session.tempUser = {
            userId: registeredUser._id,
            otp: otp,
            userType: 'user'
        };
        
        // Redirect to OTP verification page
        res.redirect(`/verify-otp?userId=${registeredUser._id}&type=user`);
        
    } catch (err) {
        req.flash("error", err.message || "Registration failed");
        res.redirect("/signup");
    }
});

module.exports.verifyOTP = wrapAsync(async (req, res, next) => {
    const { userId, otp } = req.body;
    const tempUser = req.session.tempUser;
    
    // Check if OTP is in array format (from OTP inputs)
    const otpCode = Array.isArray(otp) ? otp.join('') : otp;
    
    if (!tempUser || tempUser.userId !== userId) {
        req.flash("error", "Invalid verification session");
        return res.redirect("/signup");
    }
    
    if (tempUser.otp !== otpCode) {
        req.flash("error", "Invalid OTP");
        return res.redirect(`/verify-otp?userId=${userId}&type=user`);
    }
    
    // OTP verified - update user as verified
    const user = await User.findById(userId);
    if (!user) {
        req.flash("error", "User not found");
        return res.redirect("/signup");
    }
    
    // Mark as verified and clear verification fields
    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationExpires = undefined;
    await user.save();
    
    // Log in the user
    req.login(user, (err) => {
        if (err) return next(err);
        
        // Clear temp session
        delete req.session.tempUser;
        
        req.flash("success", "Account verified and created successfully!");
        res.redirect(`/listings/user/${user._id}`);
    });
});

module.exports.logIn = (req, res) => {
    res.render("users/login", { 
        role: 'user',
        title: 'User Login' 
    });
}

module.exports.uploadLogin = async (req, res) => {
    req.flash("success", "Welcome to WanderLust!");
    let redirectUrl = `/listings/user/${req.user._id}`; // Default redirect
    res.redirect(redirectUrl);
}

module.exports.logOut = (req, res, next) => {
    req.logout((err) => {
        if (err) {
            next(err);
        } else {
            req.flash("success", "Logged out successfully");
            res.redirect("/listings");
        }
    });
}

// New function for resending OTP
module.exports.resendOTP = wrapAsync(async (req, res) => {
    const { userId, userType } = req.body;
    
    // Generate new OTP
    const otp = otpService.generateOTP();
    
    // Update session with new OTP
    req.session.tempUser = {
        userId: userId,
        otp: otp,
        userType: userType
    };
    
    // Get user email
    const user = await User.findById(userId);
    if (!user) {
        return res.json({ success: false, message: "User not found" });
    }
    
    // Send new OTP
    await otpService.sendEmailOTP(user.email, otp, userType);
    
    res.json({ success: true, message: "New OTP sent to your email" });
});