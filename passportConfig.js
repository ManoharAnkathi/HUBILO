const passport = require("passport");
const LocalStrategy = require("passport-local");
const User = require("./models/user");
const Owner = require("./models/owner");
const AppAdmin = require("./models/appAdmin"); // Make sure this model exists

// User Strategy
passport.use("local", new LocalStrategy(
    {
        usernameField: "username",
        passReqToCallback: true
    },
    async function(req, username, password, done) {
        try {
            // Try to find by username
            let user = await User.findOne({ username: username });
            
            // If not found by username, try by email
            if (!user) {
                user = await User.findOne({ email: username });
            }
            
            // If user not found
            if (!user) {
                req.flash("error", "Invalid username/email or password");
                return done(null, false);
            }
            
            // Authenticate using passport-local-mongoose
            user.authenticate(password, function(err, userModel, passwordErr) {
                if (err) return done(err);
                if (passwordErr) {
                    req.flash("error", "Invalid username/email or password");
                    return done(null, false);
                }
                if (!userModel) {
                    req.flash("error", "Invalid username/email or password");
                    return done(null, false);
                }
                return done(null, userModel);
            });
        } catch (error) {
            return done(error);
        }
    }
));

// Owner Strategy
passport.use("owner-local", new LocalStrategy(
    {
        usernameField: "username",
        passReqToCallback: true
    },
    async function(req, username, password, done) {
        try {
            // Try to find by username
            let owner = await Owner.findOne({ username: username });
            
            // If not found by username, try by email
            if (!owner) {
                owner = await Owner.findOne({ email: username });
            }
            
            // If owner not found
            if (!owner) {
                req.flash("error", "Invalid username/email or password");
                return done(null, false);
            }
            
            // Check if account is verified
            if (!owner.isVerified) {
                req.flash("warning", "Please verify your email before logging in");
                return done(null, false);
            }
            
            // Authenticate using passport-local-mongoose
            owner.authenticate(password, function(err, ownerModel, passwordErr) {
                if (err) return done(err);
                if (passwordErr) {
                    req.flash("error", "Invalid username/email or password");
                    return done(null, false);
                }
                if (!ownerModel) {
                    req.flash("error", "Invalid username/email or password");
                    return done(null, false);
                }
                return done(null, ownerModel);
            });
        } catch (error) {
            return done(error);
        }
    }
));

// Admin Strategy (if you use it)
passport.use("admin-local", new LocalStrategy(
    {
        usernameField: "username",
        passReqToCallback: true
    },
    async function(req, username, password, done) {
        try {
            // First check if AppAdmin model exists
            if (!AppAdmin) {
                req.flash("error", "Admin authentication not configured");
                return done(null, false);
            }
            
            // Try to find by username
            let admin = await AppAdmin.findOne({ username: username });
            
            // If not found by username, try by email
            if (!admin) {
                admin = await AppAdmin.findOne({ email: username });
            }
            
            // If admin not found
            if (!admin) {
                req.flash("error", "Invalid admin credentials");
                return done(null, false);
            }
            
            // Check if admin account is active
            if (admin.isActive !== undefined && !admin.isActive) {
                req.flash("error", "Admin account is inactive. Contact super admin.");
                return done(null, false);
            }
            
            // Check if account is verified
            if (admin.isVerified !== undefined && !admin.isVerified) {
                req.flash("warning", "Please verify your email before logging in");
                return done(null, false);
            }
            
            // Authenticate using passport-local-mongoose
            admin.authenticate(password, function(err, adminModel, passwordErr) {
                if (err) return done(err);
                if (passwordErr) {
                    req.flash("error", "Invalid admin credentials");
                    return done(null, false);
                }
                if (!adminModel) {
                    req.flash("error", "Invalid admin credentials");
                    return done(null, false);
                }
                return done(null, adminModel);
            });
        } catch (error) {
            return done(error);
        }
    }
));

// ==================== SINGLE SET OF SERIALIZE/DESERIALIZE FUNCTIONS ====================
// REMOVED DUPLICATES - Only one set should exist

// Serialize user/owner/admin - Store type and ID
passport.serializeUser(function(userOrOwnerOrAdmin, done) {
    // Store both the ID and the model type
    done(null, { 
        id: userOrOwnerOrAdmin._id, 
        type: userOrOwnerOrAdmin.constructor.modelName // 'User', 'Owner', or 'AppAdmin'
    });
});

// Deserialize user/owner/admin - Load based on type
passport.deserializeUser(function(obj, done) {
    // Based on the type, use the correct model
    if (obj.type === 'Owner') {
        Owner.findById(obj.id)
            .then(owner => done(null, owner))
            .catch(err => done(err, null));
    } else if (obj.type === 'AppAdmin') {
        // Check if AppAdmin model exists before using it
        if (AppAdmin) {
            AppAdmin.findById(obj.id)
                .then(admin => done(null, admin))
                .catch(err => done(err, null));
        } else {
            // If AppAdmin doesn't exist, try User
            User.findById(obj.id)
                .then(user => done(null, user))
                .catch(err => done(err, null));
        }
    } else {
        // Default to User
        User.findById(obj.id)
            .then(user => done(null, user))
            .catch(err => done(err, null));
    }
});

module.exports = passport;
