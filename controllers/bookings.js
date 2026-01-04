const Booking = require('../models/bookings.js');
const Listing = require("../models/listings.js");
const User = require("../models/user.js");
const Owner = require("../models/owner.js");
const OTPService = require('../services/otpServices');

// Render booking form
module.exports.createBookingForm = async (req, res) => {
    try {
        const { id } = req.params;
        const listing = await Listing.findById(id);
        if (!listing) {
            req.flash('error', 'Listing not found');
            return res.redirect('/listings');
        }
        res.render('bookings/new', { listing, user: req.user });
    } catch (error) {
        console.error(error);
        req.flash('error', 'Something went wrong');
        res.redirect('/listings');
    }
};

// Create booking (POST handler)
module.exports.createBooking = async (req, res) => {
    try {
        const { listingId, checkIn, checkOut, numberOfGuests, phone } = req.body;
        const userId = req.user._id;

        // Find the listing
        const listing = await Listing.findById(listingId);
        if (!listing) {
            req.flash('error', 'Listing not found');
            return res.redirect('/listings');
        }

        // Calculate total price
        const nights = calculateNights(new Date(checkIn), new Date(checkOut));
        const totalPrice = listing.price * nights;

        // Create the booking
        const newBooking = new Booking({
            user: userId,
            listing: listingId,
            owner: listing.owner,
            checkIn: new Date(checkIn),
            checkOut: new Date(checkOut),
            numberOfGuests: numberOfGuests,
            totalPrice: totalPrice,
            status: 'pending',
            paymentStatus: 'pending',
            userInfo: {
                name: `${req.user.firstName} ${req.user.lastName}`,
                email: req.user.email,
                phone: phone
            }
        });

        // Save booking to database
        await newBooking.save();

        // Update user with booking reference
        await User.findByIdAndUpdate(userId, {
            $push: { bookings: newBooking._id }
        });

        // Update listing with booking reference
        await Listing.findByIdAndUpdate(listingId, {
            $push: { bookings: newBooking._id }
        });

        // Update owner with booking reference
        await Owner.findByIdAndUpdate(listing.owner, {
            $push: { bookings: newBooking._id }
        });

        req.flash('success', 'Booking created successfully!');
        res.redirect(`/bookings/${newBooking._id}`); // Redirect to booking confirmation page

    } catch (error) {
        console.error(error);
        req.flash('error', 'Failed to create booking');
        res.redirect('/listings');
    }
};

// Show booking confirmation - updated to send emails
module.exports.showBooking = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Find booking and populate related data
        const booking = await Booking.findById(id)
            .populate('listing')
            .populate('user')
            .populate('owner');
        
        if (!booking) {
            req.flash('error', 'Booking not found');
            return res.redirect('/listings');
        }

        // Check if the current user is authorized to view this booking
        if (booking.user._id.toString() !== req.user._id.toString()) {
            req.flash('error', 'You are not authorized to view this booking');
            return res.redirect('/listings');
        }

        // Send confirmation emails (only send once when booking is first viewed)
        if (!booking.confirmationEmailSent) {
            try {
                // Prepare booking details for user email
                const userBookingDetails = {
                    bookingId: booking._id.toString(),
                    listingTitle: booking.listing.title,
                    location: booking.listing.location,
                    checkIn: booking.checkIn ? new Date(booking.checkIn).toLocaleDateString() : 'Not specified',
                    checkOut: booking.checkOut ? new Date(booking.checkOut).toLocaleDateString() : 'Not specified',
                    totalAmount: booking.totalPrice,
                    guests: booking.numberOfGuests
                };

                // Prepare booking details for owner email
                const ownerBookingDetails = {
                    bookingId: booking._id.toString(),
                    listingTitle: booking.listing.title,
                    bookingDate: new Date(booking.createdAt).toLocaleDateString(),
                    checkIn: booking.checkIn ? new Date(booking.checkIn).toLocaleDateString() : 'Not specified',
                    checkOut: booking.checkOut ? new Date(booking.checkOut).toLocaleDateString() : 'Not specified',
                    totalAmount: booking.totalPrice,
                    guests: booking.numberOfGuests
                };

                // Prepare user details for owner email
                const userDetails = {
                    name: booking.user.username || booking.user.email,
                    email: booking.user.email,
                    phone: booking.user.phone || 'Not provided'
                };

                // Send email to user
                await OTPService.sendBookingConfirmationToUser(
                    booking.user.email,
                    userBookingDetails
                );

                // Send email to owner
                if (booking.owner && booking.owner.email) {
                    await OTPService.sendBookingNotificationToOwner(
                        booking.owner.email,
                        ownerBookingDetails,
                        userDetails
                    );
                }

                // Mark email as sent to avoid duplicate emails
                booking.confirmationEmailSent = true;
                await booking.save();

                console.log(`✓ Booking confirmation emails sent for booking ${booking._id}`);

            } catch (emailError) {
                console.error('✗ Error sending booking emails:', emailError.message);
                // Don't show error to user, just log it
            }
        }

        res.render('bookings/show', { booking, user: req.user });
        
    } catch (error) {
        console.error(error);
        req.flash('error', 'Error loading booking details');
        res.redirect('/listings');
    }
};
// Helper function to calculate nights
function calculateNights(checkIn, checkOut) {
    const oneDay = 24 * 60 * 60 * 1000;
    const diffDays = Math.round(Math.abs((checkIn - checkOut) / oneDay));
    return diffDays > 0 ? diffDays : 1;
}