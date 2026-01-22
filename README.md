# 🌍 WanderLust - Travel Listing Web App

WanderLust is a full-featured Node.js web application that allows users to create, view, edit, and review travel listings. It incorporates user authentication, image upload, map integration, and form validation — all wrapped with responsive EJS templates.

---

# 🚂 Railway Traffic Management System

**NEW!** This repository now includes an intelligent decision-support system for Indian Railways train traffic controllers. The system uses AI and optimization algorithms to manage train movements, minimize delays, and maximize throughput.

## Quick Start - Railway System

```bash
# 1. Seed railway data
npm run seed-railway

# 2. Test the system
npm run test-railway

# 3. Start the server
npm start

# 4. Access the railway dashboard
http://localhost:8080/railway/dashboard
```

📚 **Complete Documentation:**
- [Railway Build Steps](RAILWAY_BUILD_STEPS.md) - Step-by-step build guide
- [Railway System Guide](RAILWAY_SYSTEM_GUIDE.md) - Comprehensive technical documentation

### Railway System Features

- ✅ **AI-Powered Conflict Detection** - Automatically detects train conflicts
- ✅ **Smart Optimization** - Optimizes train precedence and crossings
- ✅ **What-If Simulation** - Test scenarios before implementation
- ✅ **Real-Time Dashboard** - Monitor all trains and conflicts live
- ✅ **Delay Impact Analysis** - Calculate cascading effects of delays
- ✅ **Audit Trail** - Track all decisions and actions

### Railway API Endpoints

```
Trains:     /api/railway/trains
Sections:   /api/railway/sections
Conflicts:  /api/railway/conflicts
Optimize:   /api/railway/precedence/:sectionId
Simulate:   /api/railway/simulation/run
```

---

## 🔧 Tech Stack

- **Frontend:** EJS, EJS-Mate (Layouts & Partials)
- **Backend:** Node.js, Express.js
- **Database:** MongoDB (Mongoose ODM)
- **Authentication:** Passport.js (Local Strategy)
- **Image Uploads:** Cloudinary + Multer Storage
- **Maps:** Mapbox GL JS
- **Session Store:** connect-mongo
- **Validation:** JOI
- **Templating Engine:** ejs-mate

---

## 🚀 Features

- Full CRUD operations on travel listings
- Secure user registration & login
- Flash messages for feedback
- Map location with Mapbox
- Cloud image uploads
- Modular routing
- Middleware authorization & validation
- Responsive layout with shared navbar and footer
- Session persistence using MongoStore
- Express custom error handling and error pages

---

## 🔐 Authentication & Sessions

- Uses **Passport.js** with `passport-local-mongoose` for local authentication.
- Sessions are stored securely in **MongoDB** using `connect-mongo`.
- **Flash messages** provide user feedback on login, logout, and registration.
- Protected routes are secured using **custom middleware** like `isLoggedIn` and `isOwner`.

---

## 🧠 Middleware Breakdown

- `isLoggedIn`: Ensures the user is authenticated before accessing a route.
- `saveOriginalUrl`: Saves the intended URL before redirecting to login, enabling redirection after authentication.
- `validateListing` & `validateReview`: Validates listing and review inputs using **Joi** schemas.
- `isOwner` & `isAuthorReview`: Ensures only the owner of a listing/review can modify or delete it.

---

## 🗺️ Mapbox Integration

- Integrated using **@mapbox/mapbox-sdk** and **Mapbox GL JS**.
- Secure token stored in `.env` file (`MAP_TOKEN`).
- Adds location and geolocation capability to each listing.

---

## ☁️ Cloudinary Integration

- Uses `multer` and `multer-storage-cloudinary` for image handling.
- Configured via `cloudConfig.js` with secure credentials from `.env`.
- Images are uploaded to a dedicated folder on **Cloudinary** (`wanderlust_DEV`).

---

## ⚠️ Error Handling

- Custom error class `ExpressError` used to standardize thrown errors.
- All undefined routes are caught with a wildcard middleware (`app.all("*", ...)`) and passed to error handler.
- All errors are rendered on a user-friendly page using `views/listings/error.ejs`.

  
## 🛠️ How to Run This Application

1. **Install dependencies**:

   ```bash
   npm install
   ```

2. **Set up environment variables**:

   Create a `.env` file in the root directory and add the following:

   ```env
   CLOUD_NAME=your_cloud_name
   CLOUD_API_KEY=your_api_key
   CLOUD_API_SECRET=your_api_secret
   MAP_TOKEN=your_mapbox_token
   ATLAS_DB_URL=your_mongodb_connection_string
   SECRET=your_session_secret
   ```

3. **Start the server**:

   ```bash
   node app.js
   ```

   or with **nodemon** (for auto-reloading during development):

   ```bash
   npx nodemon app.js
   ```

4. **Open your browser** and visit:

   ```
   http://localhost:8080
   ```

You’re now ready to use WanderLust!


