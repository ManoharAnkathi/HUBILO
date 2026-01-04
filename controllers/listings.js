const Listing = require("../models/listings");
const ExpressError = require("../utils/ExpressError");
const wrapAsync = require("../utils/wrapAsync.js");
const mbxGeocoding = require('@mapbox/mapbox-sdk/services/geocoding');
const mapToken = process.env.MAP_TOKEN;
const geocodingClient = mbxGeocoding({ accessToken: mapToken });
const Owner = require("../models/owner");

module.exports.index = wrapAsync(async (req, res) => {
    try {
        const { search, category } = req.query;
        let query = {};
        
        // Search by title (case-insensitive)
        if (search) {
            query.title = { $regex: search, $options: 'i' };
        }
        
        // Filter by category if provided
        if (category) {
            query.category = category;
        }
        
        const allListings = await Listing.find(query);
        
        res.render('listings/index', { 
            allListings,
            searchQuery: search || '',
            currUser: req.user // Assuming you have user authentication
        });
    } catch (error) {
        console.error('Error fetching listings:', error);
        req.flash('error', 'Failed to load listings');
        res.redirect('/');
    }
});

module.exports.renderNewForm = (req, res) => {
    res.render("listings/new");
}

module.exports.uploadNewListing = wrapAsync(async (req, res, next) => {
    let response = await geocodingClient.forwardGeocode({
        query: req.body.listing.location,
        limit: 1
    }).send();
    
    let url = req.file.path;
    let filename = req.file.filename;
    let newlisting = new Listing(req.body.listing);
    
    // Set the owner
    newlisting.owner = res.locals.currUser;
    newlisting.image = { url, filename };
    newlisting.geometry = response.body.features[0].geometry;
    
    // Save the listing first
    let savedListing = await newlisting.save();
    
    // IMPORTANT: Update the Owner model
    // You need to import the Owner model at the top of your file
    // Add this: const Owner = require("../models/owner");
    
    // Find the owner and push the new listing's ID to their listings array
    await Owner.findByIdAndUpdate(
        res.locals.currUser._id,
        { $push: { listings: savedListing._id } },
        { new: true }
    );
    
    console.log(savedListing);
    req.flash("success", "New listing added");
    res.redirect("/owner/dashboard");
});

module.exports.showListing = async (req, res, next) => {
    let { id } = req.params;
    const listing = await Listing.findById(id)
        .populate({
            path: "reviews",
            populate: {
                path: "author",
            },
        })
        .populate("owner");
    if (!listing) {
        throw new ExpressError(404, "Listing not found");
    }
    res.render("listings/show", { listing });
}

module.exports.editListing = wrapAsync(async (req, res) => {
    let { id } = req.params;
    const listing = await Listing.findById(id);
    let originalurl = listing.image.url;
    let preview = originalurl.replace("/upload","/upload/ar_1.0,c_fill,h_150,w_250/bo_2px_solid_white");
    if (!listing) {
        throw new ExpressError(400, "Listing you requested for edit does not exists");
    }
    res.render("listings/edit", { listing, preview });
});

module.exports.updateListing = async (req, res) => {
    let { id } = req.params;
    let listing = await Listing.findByIdAndUpdate(id, { ...req.body.listing });
    if (typeof req.file !== "undefined") {
        let url = req.file.path;
        let filename = req.file.filename;
        listing.image = { url, filename };
        await listing.save();
    }
    req.flash("success", "Listing edited");
    res.redirect(`/listings/${id}`);
}

module.exports.deleteListing = async (req, res) => {
    let { id } = req.params;
    let deletedListing = await Listing.findByIdAndDelete(id);
    console.log(deletedListing);
    req.flash("failure", "Listing deleted");
    res.redirect("/owner/listings");
}