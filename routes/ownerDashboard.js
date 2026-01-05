const express = require("express");
const router = express.Router();
const { isLoggedIn } = require("../middleware.js");
const Listing = require("../models/listings.js");
const Owner = require("../models/owner.js");
const Booking = require("../models/bookings.js");    

// Add middleware to check if the dashboard ID matches logged-in owner
const isOwnerDashboardAuthorized = (req, res, next) => {
    if (!req.user) {
        req.flash("error", "Please log in first");
        return res.redirect("/owner/login");
    }
    
    // Check if user is an owner
    if (req.user.constructor.modelName !== 'Owner') {
        req.flash("error", "Access denied. Owner access only.");
        return res.redirect("/owner/login");
    }
    
    // If accessing a specific owner dashboard, verify the ID matches
    if (req.params.id) {
        if (req.user._id.toString() !== req.params.id) {
            req.flash("error", "You are not authorized to access this dashboard.");
            return res.redirect("/owner/login");
        }
    }
    
    next();
};

// Keep the generic route for compatibility (redirects to specific dashboard)
router.get("/owner/dashboard", isLoggedIn, (req, res) => {
    if (!req.user || req.user.constructor.modelName !== 'Owner') {
        req.flash("error", "Access denied. Owner access only.");
        return res.redirect("/owner/login");
    }
    
    // Redirect to owner-specific dashboard
    res.redirect(`/owner/dashboard/${req.user._id}`);
});

// Owner-specific dashboard route
router.get("/owner/dashboard/:id", isLoggedIn, isOwnerDashboardAuthorized, async (req, res) => {
    try {
        const ownerId = req.params.id;
        
        // Fetch owner with populated listings
        const owner = await Owner.findById(ownerId).populate('listings');
        
        if (!owner) {
            req.flash("error", "Owner not found");
            return res.redirect("/owner/login");
        }
        
        // Calculate active listings count (all listings that belong to this owner)
        const activeListingsCount = await Listing.countDocuments({
            owner: ownerId
        });
        
        // Calculate total bookings count for this owner
        const totalBookingsCount = await Booking.countDocuments({
            owner: ownerId
        });
        
        // Calculate total revenue from confirmed bookings
        const confirmedBookings = await Booking.find({
            owner: ownerId,
            status: 'confirmed'
        });
        
        let totalRevenue = 0;
        confirmedBookings.forEach(booking => {
            totalRevenue += booking.totalPrice || 0;
        });
        
        // Get recent bookings (last 5)
        const recentBookings = await Booking.find({
            owner: ownerId
        })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('listing')
        .populate('user');
        
        res.render("owners/dashboard", {
            owner: owner,
            activeListingsCount: activeListingsCount || 0,
            totalBookingsCount: totalBookingsCount || 0,
            totalRevenue: totalRevenue || 0,
            recentBookings: recentBookings || [],
            title: "Owner Dashboard - Hubilo"
        });
    } catch (error) {
        console.error("Error loading dashboard:", error);
        req.flash("error", "Error loading dashboard");
        res.redirect("/owner/login");
    }
});

router.get("/owner/profile", isLoggedIn, isOwnerDashboardAuthorized, (req, res) => {
    res.redirect(`/owner/profile/${req.user._id}`);
});

router.get("/owner/listings", isLoggedIn, isOwnerDashboardAuthorized, (req, res) => {
    res.redirect(`/owner/listings/${req.user._id}`);
}); 

router.get("/owner/bookings", isLoggedIn, isOwnerDashboardAuthorized, (req, res) => {
    res.redirect(`/owner/bookings/${req.user._id}`);   
}   );

router.get("/owner/settings", isLoggedIn, isOwnerDashboardAuthorized, (req, res) => {
    res.redirect(`/owner/settings/${req.user._id}`);
}); 


router.get("/owner/profile/:id", (req, res) => {
    res.render("owners/profile", {
        owner: req.user,
        title: "Owner Profile - Hubilo"
    });
});

router.get("/owner/listings/:id", async (req, res) => {
    try {
        // Populate the listings to get full details instead of just IDs
        const owner = await Owner.findById(req.params.id)
            .populate({
                path: 'listings',
                // You can select specific fields or get all fields
                // select: 'title price location image' // Optional: specify which fields
            })
            .exec();
        
        if (!owner) {
            req.flash("error", "Owner not found");
            return res.redirect("/owner/dashboard");
        }
        
        res.render("owners/listings", {
            owner: owner,
            title: "My Listings - Hubilo"
        });
    } catch (err) {
        console.error(err);
        req.flash("error", "Something went wrong");
        res.redirect("/owner/dashboard");
    }
});

router.get("/owner/bookings/:id", async (req, res) => {

    const owner = await Owner.findById(req.params.id)
            .populate({path: 'listings',populate: {path: 'bookings',populate: {path:'user'}}})
            .exec();
    res.render("owners/bookings", {
        owner,
        title: "Bookings - Hubilo"
    });
});

module.exports = router;