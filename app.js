// ==================== ENVIRONMENT & CONFIGURATION ====================
if (process.env.NODE_ENV != "production") {
    require('dotenv').config()
}

// ==================== EXPRESS & CORE MODULES ====================
const express = require("express");
const mongoose = require('mongoose');
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const session = require("express-session");
const flash = require("connect-flash");
const passport = require("passport");
const MongoStore = require('connect-mongo');

// ==================== UTILITIES & ERROR HANDLING ====================
const ExpressError = require("./utils/ExpressError.js");
const { otpLimiter, verifyLimiter } = require('./rateLimit.js');

// ==================== ROUTES ====================
const verifyRouter = require("./routes/verify");
const homeRouter = require("./routes/home");
const listingRouter = require("./routes/listing.js");
const ownerRouter = require("./routes/owner.js");
const reviewsRouter = require("./routes/review.js");
const userRouter = require("./routes/user.js");
const ownerDashboardRouter = require("./routes/ownerDashboard.js");
const bookingRouter = require("./routes/booking.js");

// Railway Management System Routes
const trainRouter = require("./routes/train.js");
const sectionRouter = require("./routes/section.js");
const railwayRouter = require("./routes/railway.js");

// ==================== DATABASE CONNECTION ====================
main().then(() => {
    console.log("connection successful");
}).catch(err => console.log(err));

async function main() {
    await mongoose.connect(process.env.ATLAS_DB_URL);
}

// ==================== APP INITIALIZATION ====================
const app = express();

// IMPORTANT: Add trust proxy for production environments
if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1); // Trust first proxy
}

// ==================== VIEW ENGINE & MIDDLEWARE ====================
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.engine("ejs", ejsMate);

app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.use(express.static(path.join(__dirname, "/public")));

// Rate limiting for OTP endpoints
app.use('/send-otp', otpLimiter);
app.use('/verify-otp', verifyLimiter);

// ==================== SESSION CONFIGURATION ====================
const storeOptions = MongoStore.create({
    mongoUrl: process.env.ATLAS_DB_URL,
    crypto: {
        secret: process.env.SECRET,
    },
    touchAfter: 24 * 3600,
});

storeOptions.on("error", () => {
    console.log("ERROR IN MONGO STORE SESSION");
});

// FIXED: Session configuration
const sessionOptions = {
    store: storeOptions,
    secret: process.env.SECRET,
    resave: false, // Changed from true to false (saves storage)
    saveUninitialized: true,
    cookie: {
        maxAge: 7 * 24 * 60 * 60 * 1000, // 1 week
        httpOnly: true,
        // FIXED: Set secure based on environment
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'lax' : 'none' // Important for cross-site
    }
};

app.use(session(sessionOptions));
app.use(flash());

// ==================== PASSPORT CONFIGURATION ====================
// IMPORTANT: Remove the old passport setup and use the new config file
// Remove these lines:
// passport.use(new LocalStrategy(User.authenticate()));
// passport.serializeUser(User.serializeUser());
// passport.deserializeUser(User.deserializeUser());

// Instead, require the passportConfig.js file
require("./passportConfig"); // This loads all passport strategies and configuration

app.use(passport.initialize());
app.use(passport.session());

// ==================== GLOBAL MIDDLEWARE (Flash & User Context) ====================
app.use((req, res, next) => {
    // Log session info for debugging
    if (process.env.NODE_ENV !== 'production') {
        console.log("Session ID:", req.sessionID);
        console.log("req.isAuthenticated():", req.isAuthenticated());
        console.log("req.user:", req.user);
    }
    
    // Set flash messages to locals
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");

    // Set user context for templates
    if (req.user) {
        const userType = req.user.constructor.modelName;
        if (userType === 'User') {
            res.locals.currentUser = req.user;
            res.locals.currentOwner = null;
        } else if (userType === 'Owner') {
            res.locals.currentOwner = req.user;
            res.locals.currentUser = null;
        }

        // For backward compatibility with existing code
        res.locals.currUser = req.user;
        
    } else {
        res.locals.currentUser = null;
        res.locals.currentOwner = null;
        res.locals.currUser = null;
    }
    next();
});

// ==================== ROUTES ====================
app.use("/", homeRouter);
app.use("/listings", listingRouter);
app.use("/listings/:id/reviews", reviewsRouter);
app.use("/bookings", bookingRouter);
app.use("/", userRouter);
app.use("/", verifyRouter);
app.use("/", ownerRouter);    // Handles: /owner/login, /owner/signup    
app.use("/", ownerDashboardRouter);

// Railway Management System Routes
app.use("/api/railway/trains", trainRouter);
app.use("/api/railway/sections", sectionRouter);
app.use("/api/railway", railwayRouter);

// ==================== ERROR HANDLING MIDDLEWARE ====================
app.all(/.*/, (req, res, next) => {
    next(new ExpressError(404, "page not found"));
});

app.use((err, req, res, next) => {
    let { statusCode = 500, message = "something went wrong" } = err;
    res.render("listings/error.ejs", { message });
});

// ==================== SERVER START ====================
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`app listening on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Cookie secure: ${sessionOptions.cookie.secure}`);
    console.log(`Trust proxy: ${app.get('trust proxy')}`);
});

// ==================== DEBUG ROUTES ====================
if (process.env.NODE_ENV !== 'production') {
    app.get("/debug/session", (req, res) => {
        res.json({
            sessionID: req.sessionID,
            session: req.session,
            otpData: req.session.otpData,
            cookies: req.cookies,
            user: req.user,
            isAuthenticated: req.isAuthenticated()
        });
    });

    app.get("/debug/clear-session", (req, res) => {
        req.session.destroy();
        res.send("Session cleared");
    });

    app.get("/debug/login-test", (req, res) => {
        // Simulate a user login for testing
        const User = require("./models/user.js");
        User.findOne({}).then(user => {
            if (user) {
                req.login(user, (err) => {
                    if (err) {
                        return res.send("Login error: " + err);
                    }
                    res.redirect("/debug/session");
                });
            } else {
                res.send("No users found in database");
            }
        });
    });
}
