// middleware/rateLimit.js
const rateLimit = require('express-rate-limit');

// Rate limiter for OTP requests
const otpLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 3, // Limit each IP to 3 OTP requests per windowMs
    message: 'Too many OTP requests from this IP, please try again after 15 minutes',
    standardHeaders: true,
    legacyHeaders: false,
});

// Rate limiter for verification attempts
const verifyLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 5, // Limit each IP to 5 verification attempts per windowMs
    message: 'Too many verification attempts from this IP',
    standardHeaders: true,
    legacyHeaders: false,
});

module.exports = { otpLimiter, verifyLimiter };