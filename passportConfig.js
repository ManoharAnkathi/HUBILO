const passport = require("passport");
const LocalStrategy = require("passport-local");
const User = require("./models/user");
const Owner = require("./models/owner");


// User Strategy (CHANGED FROM "user-local" TO "local")
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
            
            // Check if account is verified (optional - add this if you want email verification for users too)
            // if (!user.isVerified) {
            //     req.flash("warning", "Please verify your email before logging in");
            //     return done(null, false);
            // }
            
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

// Owner Strategy (unchanged)
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

passport.use("admin-local", new LocalStrategy(
    {
        usernameField: "username",
        passReqToCallback: true
    },
    async function(req, username, password, done) {
        try {
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
            if (!admin.isActive) {
                req.flash("error", "Admin account is inactive. Contact super admin.");
                return done(null, false);
            }
            
            // Check if account is verified
            if (!admin.isVerified) {
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

// Update the serializeUser function in passportConfig.js
// (Your existing serializeUser should already handle all types)
passport.serializeUser(function(userOrOwnerOrAdmin, done) {
    done(null, { 
        id: userOrOwnerOrAdmin._id, 
        type: userOrOwnerOrAdmin.constructor.modelName // 'User', 'Owner', or 'AppAdmin'
    });
});

// Update the deserializeUser function in passportConfig.js
passport.deserializeUser(function(obj, done) {
    if (obj.type === 'Owner') {
        Owner.findById(obj.id)
            .then(owner => done(null, owner))
            .catch(err => done(err, null));
    } else if (obj.type === 'AppAdmin') {
        AppAdmin.findById(obj.id)
            .then(admin => done(null, admin))
            .catch(err => done(err, null));
    } else {
        User.findById(obj.id)
            .then(user => done(null, user))
            .catch(err => done(err, null));
    }
});

// Serialize user/owner - Store type and ID
passport.serializeUser(function(userOrOwner, done) {
    // Store both the ID and the model type
    done(null, { 
        id: userOrOwner._id, 
        type: userOrOwner.constructor.modelName // 'User' or 'Owner'
    });
});

// Deserialize user/owner - Load based on type
passport.deserializeUser(function(obj, done) {
    // Based on the type, use the correct model
    if (obj.type === 'Owner') {
        Owner.findById(obj.id)
            .then(owner => done(null, owner))
            .catch(err => done(err, null));
    } else {
        User.findById(obj.id)
            .then(user => done(null, user))
            .catch(err => done(err, null));
    }
});

module.exports = passport;