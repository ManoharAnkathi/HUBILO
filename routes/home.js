const express = require("express");
const router = express.Router();

// Render login&signup page at root
router.get("/", (req, res) => {
    res.render("login&signup");
});

module.exports = router;