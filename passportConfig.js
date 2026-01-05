const passport = require("passport");
const LocalStrategy = require("passport-local");
const User = require("./models/user");
const Owner = require("./models/owner");

// User Strategy (for regular users)
passport.use("local", new LocalStrategy(
    {
        usernameField: "username",
        passReqToCallback: true
    },
    async function(req, username, password, done) {
        try {
            console.log("User login attempt for:", username);
            
            // Try to find by username
            let user = await User.findOne({ username: username });
            
            // If not found by username, try by email
            if (!user) {
                user = await User.findOne({ email: username });
            }
            
            // If user not found
            if (!user) {
                console.log("User not found for:", username);
                req.flash("error", "Invalid username/email or password");
                return done(null, false);
            }
            
            console.log("User found:", user._id);
            
            // Authenticate using passport-local-mongoose
            user.authenticate(password, function(err, userModel, passwordErr) {
                if (err) {
                    console.log("Authentication error:", err);
                    return done(err);
                }
                if (passwordErr) {
                    console.log("Password error for user:", user._id);
                    req.flash("error", "Invalid username/email or password");
                    return done(null, false);
                }
                if (!userModel) {
                    console.log("No user model returned for:", user._id);
                    req.flash("error", "Invalid username/email or password");
                    return done(null, false);
                }
                console.log("User authentication successful:", userModel._id);
                return done(null, userModel);
            });
        } catch (error) {
            console.log("Login strategy error:", error);
            return done(error);
        }
    }
));

// Owner Strategy (for property owners/hosts)
passport.use("owner-local", new LocalStrategy(
    {
        usernameField: "username",
        passReqToCallback: true
    },
    async function(req, username, password, done) {
        try {
            console.log("Owner login attempt for:", username);
            
            // Try to find by username
            let owner = await Owner.findOne({ username: username });
            
            // If not found by username, try by email
            if (!owner) {
                owner = await Owner.findOne({ email: username });
            }
            
            // If owner not found
            if (!owner) {
                console.log("Owner not found for:", username);
                req.flash("error", "Invalid username/email or password");
                return done(null, false);
            }
            
            console.log("Owner found:", owner._id);
            
            // Check if account is verified
            if (!owner.isVerified) {
                console.log("Owner account not verified:", owner._id);
                req.flash("warning", "Please verify your email before logging in");
                return done(null, false);
            }
            
            // Authenticate using passport-local-mongoose
            owner.authenticate(password, function(err, ownerModel, passwordErr) {
                if (err) {
                    console.log("Owner authentication error:", err);
                    return done(err);
                }
                if (passwordErr) {
                    console.log("Owner password error:", owner._id);
                    req.flash("error", "Invalid username/email or password");
                    return done(null, false);
                }
                if (!ownerModel) {
                    console.log("No owner model returned for:", owner._id);
                    req.flash("error", "Invalid username/email or password");
                    return done(null, false);
                }
                console.log("Owner authentication successful:", ownerModel._id);
                return done(null, ownerModel);
            });
        } catch (error) {
            console.log("Owner login strategy error:", error);
            return done(error);
        }
    }
));

// ==================== SINGLE SET OF SERIALIZE/DESERIALIZE FUNCTIONS ====================

// Serialize user/owner - Store type and ID
passport.serializeUser(function(userOrOwner, done) {
    console.log("=== Serialize User Called ===");
    console.log("Object to serialize:", userOrOwner);
    console.log("Object type:", userOrOwner.constructor.modelName);
    console.log("Object ID:", userOrOwner._id);
    
    // Make sure to convert ID to string
    const serializedData = { 
        id: userOrOwner._id.toString(), 
        type: userOrOwner.constructor.modelName // 'User' or 'Owner'
    };
    
    console.log("Serialized data:", serializedData);
    done(null, serializedData);
});

// Deserialize user/owner - Load based on type
passport.deserializeUser(async function(obj, done) {
    console.log("=== Deserialize User Called ===");
    console.log("Object from session:", obj);
    
    try {
        if (!obj || !obj.id) {
            console.log("No user/owner ID found in session");
            return done(null, null);
        }
        
        let userDoc = null;
        
        if (obj.type === 'Owner') {
            console.log("Loading Owner with ID:", obj.id);
            userDoc = await Owner.findById(obj.id);
        } else {
            console.log("Loading User with ID:", obj.id);
            userDoc = await User.findById(obj.id);
        }
        
        if (!userDoc) {
            console.log("No document found for ID:", obj.id);
        } else {
            console.log("Document found:", userDoc._id);
        }
        
        done(null, userDoc);
    } catch (error) {
        console.error("Deserialize error:", error);
        done(error, null);
    }
});

module.exports = passport;
