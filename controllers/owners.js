const Owner = require("../models/owner");
const wrapAsync = require("../utils/wrapAsync");
const crypto = require("crypto");
const otpService = require("../services/otpServices"); // Use only otpServices

// Owner SignUp Form
module.exports.ownerSignUp = (req, res) => {
    res.render("owners/ownersignup");
}

// Owner SignUp Logic (SIMPLIFIED - similar to user controller)
module.exports.ownerUploadSignup = wrapAsync(async (req, res, next) => {
    try {
        let { username, email, password, businessName, businessType, phone } = req.body;
        
        // Generate OTP and verification token
        const otp = otpService.generateOTP();
        const verificationToken = crypto.randomBytes(20).toString('hex');
        const verificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
        
        // Create owner (passport-local-mongoose will handle password hashing)
        const newOwner = new Owner({ 
            email, 
            username, 
            businessName, 
            businessType, 
            phone,
            verificationToken,
            verificationExpires,
            isVerified: false
        });
        
        // Register owner (this saves the owner with hashed password)
        const registeredOwner = await Owner.register(newOwner, password);
        
        // Send OTP
        await otpService.sendEmailOTP(email, otp, 'owner');
        
        // Store OTP in session (using same structure as user controller)
        req.session.tempUser = {
            userId: registeredOwner._id,
            otp: otp,
            userType: 'owner',
            email: email  // Added email for debugging
        };
        
        console.log("Owner signup successful. OTP stored in session:", req.session.tempUser);
        
        // Redirect to OTP verification page
        res.redirect(`/owner/verify-otp?userId=${registeredOwner._id}&type=owner`);
        
    } catch (err) {
        console.error("Signup error:", err);
        req.flash("error", err.message || "Signup failed. Please try again.");
        res.redirect("/owner/signup");
    }
});

// Owner Login Form
module.exports.ownerLogIn = (req, res) => {
    res.render("owners/ownerlogin");
}

//OWNER UPLOAD LOGIN LOGIC
module.exports.ownerUploadLogin = async (req, res) => {
    // Check if owner is verified
    if (!req.user.isVerified) {
        req.flash("warning", "Please verify your email before logging in.");
        return res.redirect("/owner/verify-email");
    }
    
    req.flash("success", "Welcome back to your owner dashboard!");
    
    // Get the owner ID from the authenticated user
    const ownerId = req.user._id;
    
    // Check if there's a saved redirect URL
    let redirectUrl = res.locals.redirectUrl;
    
    // If no saved URL or if it's the generic dashboard, use owner-specific URL
    if (!redirectUrl || redirectUrl === "/owner/dashboard") {
        redirectUrl = `/owner/dashboard/${ownerId}`;
    }
    
    res.redirect(redirectUrl);
}

// Owner Logout
module.exports.ownerLogOut = (req, res, next) => {
    req.logout((err) => {
        if(err){
            return next(err);
        }
        req.flash("success", "Logged out successfully");
        res.redirect("/owner/login");
    });
}

// Show OTP verification form for owners
module.exports.showVerifyOTP = (req, res) => {
    const { userId, type } = req.query;
    
    if (!userId || !type) {
        req.flash("error", "Invalid verification request");
        return res.redirect("/owner/signup");
    }
    
    // Debug: Check session
    console.log("Session ID:", req.sessionID);
    console.log("Session tempUser:", req.session.tempUser);
    
    res.render("owners/verifyOTP", { 
        userId, 
        type,
        title: "Owner Account Verification - WanderLust"
    });
}

// Verify OTP for owners (SIMPLIFIED - similar to user controller)
module.exports.verifyOwnerOTP = wrapAsync(async (req, res, next) => {
    const { userId, otp } = req.body;
    
    // Handle array OTP input
    let otpCode;
    if (Array.isArray(otp)) {
        otpCode = otp.join('');
    } else {
        otpCode = otp;
    }
    
    // Get temp user from session
    const tempUser = req.session.tempUser;
    
    console.log("OTP Verification Attempt:", { userId, otpCode, tempUser });
    
    if (!tempUser || tempUser.userId !== userId) {
        req.flash("error", "Invalid verification session. Please sign up again.");
        return res.redirect("/owner/signup");
    }
    
    if (tempUser.otp !== otpCode) {
        req.flash("error", "Invalid OTP. Please try again.");
        return res.redirect(`/owner/verify-otp?userId=${userId}&type=${tempUser.userType}`);
    }
    
    // OTP verified - update owner as verified
    const owner = await Owner.findById(userId);
    if (!owner) {
        req.flash("error", "Owner not found");
        return res.redirect("/owner/signup");
    }
    
    // Mark as verified and clear verification fields
    owner.isVerified = true;
    owner.verificationToken = undefined;
    owner.verificationExpires = undefined;
    await owner.save();
    
    // Clear temp session
    delete req.session.tempUser;
    
    // Log in the owner
    req.login(owner, (err) => {
        if (err) return next(err);
        
        req.flash("success", "Owner account verified and created successfully!");
        res.redirect("/owner/dashboard");
    });
});

// Verify Email via link (optional - for email verification)
module.exports.verifyEmail = wrapAsync(async (req, res) => {
    const { token } = req.params;
    
    const owner = await Owner.findOne({
        verificationToken: token,
        verificationExpires: { $gt: Date.now() }
    });
    
    if (!owner) {
        req.flash("error", "Verification token is invalid or has expired");
        return res.redirect("/owner/login");
    }
    
    owner.isVerified = true;
    owner.verificationToken = undefined;
    owner.verificationExpires = undefined;
    await owner.save();
    
    req.flash("success", "Email verified successfully! You can now login.");
    res.redirect("/owner/login");
});

// Resend OTP for owners
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
    
    // Get owner email
    const owner = await Owner.findById(userId);
    if (!owner) {
        return res.json({ success: false, message: "Owner not found" });
    }
    
    // Send new OTP
    await otpService.sendEmailOTP(owner.email, otp, userType);
    
    res.json({ success: true, message: "New OTP sent to your email" });
});

// Show Forgot Password Form
module.exports.showForgotPassword = (req, res) => {
    res.render("owners/forgotPassword");
}

// Send Password Reset Email (SIMPLIFIED - using otpService)
module.exports.sendPasswordResetEmail = wrapAsync(async (req, res) => {
    const { email } = req.body;
    const owner = await Owner.findOne({ email });
    
    if (!owner) {
        req.flash("error", "No account found with that email");
        return res.redirect("/owner/forgot-password");
    }
    
    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    owner.resetPasswordToken = resetToken;
    owner.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await owner.save();
    
    // Send reset email using otpService (we'll add this method)
    const resetLink = `${process.env.APP_URL || 'http://localhost:8080'}/owner/reset-password/${resetToken}`;
    
    // Create password reset email template
    const resetEmailHTML = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Reset Your Owner Password</h2>
            <p>We received a request to reset your password.</p>
            <p>Click the link below to reset your password:</p>
            <p><a href="${resetLink}" style="background-color: #dc3545; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a></p>
            <p>Or copy and paste this link in your browser: ${resetLink}</p>
            <p>This link will expire in 1 hour.</p>
            <p>If you didn't request a password reset, please ignore this email.</p>
        </div>
    `;
    
    await otpService.transporter.sendMail({
        from: `"WanderLust" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Reset Your Owner Password - WanderLust',
        html: resetEmailHTML,
        text: `Reset your password by clicking this link: ${resetLink}`
    });
    
    req.flash("success", "Password reset instructions sent to your email");
    res.redirect("/owner/login");
});

// Show Reset Password Form
module.exports.showResetPassword = wrapAsync(async (req, res) => {
    const { token } = req.params;
    const owner = await Owner.findOne({
        resetPasswordToken: token,
        resetPasswordExpires: { $gt: Date.now() }
    });
    
    if (!owner) {
        req.flash("error", "Password reset token is invalid or has expired");
        return res.redirect("/owner/forgot-password");
    }
    
    res.render("owners/resetPassword", { token });
});

// Reset Owner Password
module.exports.resetOwnerPassword = wrapAsync(async (req, res) => {
    const { token } = req.params;
    const { password } = req.body;
    
    const owner = await Owner.findOne({
        resetPasswordToken: token,
        resetPasswordExpires: { $gt: Date.now() }
    });
    
    if (!owner) {
        req.flash("error", "Password reset token is invalid or has expired");
        return res.redirect("/owner/forgot-password");
    }
    
    // Use passport-local-mongoose's setPassword method
    await owner.setPassword(password);
    owner.resetPasswordToken = undefined;
    owner.resetPasswordExpires = undefined;
    await owner.save();
    
    req.flash("success", "Password reset successfully. You can now login with your new password.");
    res.redirect("/owner/login");
});

// Show Owner Profile
module.exports.showOwnerProfile = wrapAsync(async (req, res) => {
    const owner = await Owner.findById(req.user._id);
    res.render("owners/profile", { owner });
});

// Edit Owner Profile Form
module.exports.editOwnerProfile = wrapAsync(async (req, res) => {
    const owner = await Owner.findById(req.user._id);
    res.render("owners/editProfile", { owner });
});

// Update Owner Profile
module.exports.updateOwnerProfile = wrapAsync(async (req, res) => {
    const { id } = req.params;
    const owner = await Owner.findByIdAndUpdate(id, { ...req.body.owner }, { new: true });
    req.flash("success", "Profile updated successfully");
    res.redirect("/owner/profile");
});