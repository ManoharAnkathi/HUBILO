const express = require("express");
const router = express.Router();
const { isLoggedIn } = require("../middleware.js");
const { createBookingForm, createBooking ,showBooking} = require("../controllers/bookings.js");
const Booking = require("../models/bookings.js");

// Render Booking Form
router.get("/:id/new", isLoggedIn, createBookingForm);

// Create Booking (POST route)
router.post("/", isLoggedIn, createBooking);

// Show Booking Confirmation (GET route)
router.get("/:id", isLoggedIn, showBooking);

// Print Booking Receipt
router.get("/:id/print", isLoggedIn, async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id)
            .populate('listing')
            .populate('user')
            .populate('owner');
        
        if (!booking || booking.user._id.toString() !== req.user._id.toString()) {
            req.flash('error', 'Booking not found or unauthorized');
            return res.redirect('/listings');
        }
        
        res.render('bookings/print', { booking });
        
    } catch (error) {
        console.error(error);
        req.flash('error', 'Error loading booking');
        res.redirect('/listings');
    }
});

module.exports = router;