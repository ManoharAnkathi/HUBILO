const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const trainSchema = new Schema({
    trainNumber: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    trainName: {
        type: String,
        required: true,
        trim: true
    },
    trainType: {
        type: String,
        enum: ['EXPRESS', 'LOCAL', 'FREIGHT', 'SPECIAL', 'MAINTENANCE'],
        required: true
    },
    priority: {
        type: Number,
        required: true,
        min: 1,
        max: 10, // 10 being highest priority
        default: 5
    },
    currentStatus: {
        type: String,
        enum: ['SCHEDULED', 'RUNNING', 'HALTED', 'DELAYED', 'COMPLETED', 'CANCELLED'],
        default: 'SCHEDULED'
    },
    currentPosition: {
        sectionId: {
            type: Schema.Types.ObjectId,
            ref: 'Section'
        },
        trackId: {
            type: Schema.Types.ObjectId,
            ref: 'Track'
        },
        kilometer: Number,
        latitude: Number,
        longitude: Number,
        lastUpdated: {
            type: Date,
            default: Date.now
        }
    },
    schedule: {
        origin: {
            type: String,
            required: true
        },
        destination: {
            type: String,
            required: true
        },
        scheduledDeparture: {
            type: Date,
            required: true
        },
        scheduledArrival: {
            type: Date,
            required: true
        },
        actualDeparture: Date,
        actualArrival: Date,
        estimatedArrival: Date
    },
    route: [{
        stationCode: String,
        stationName: String,
        arrivalTime: Date,
        departureTime: Date,
        platformNumber: String,
        distance: Number, // in kilometers from origin
        passed: {
            type: Boolean,
            default: false
        }
    }],
    characteristics: {
        length: Number, // in meters
        maxSpeed: Number, // in km/h
        weight: Number, // in tonnes
        locomotiveType: String,
        numberOfCoaches: Number,
        brakingDistance: Number // in meters
    },
    delay: {
        currentDelay: {
            type: Number,
            default: 0 // in minutes
        },
        reasons: [{
            reason: String,
            delayMinutes: Number,
            timestamp: Date
        }]
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Update the updatedAt timestamp before saving
trainSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Virtual property for delay status
trainSchema.virtual('delayStatus').get(function() {
    if (this.delay.currentDelay === 0) return 'ON_TIME';
    if (this.delay.currentDelay <= 5) return 'MINOR_DELAY';
    if (this.delay.currentDelay <= 30) return 'MODERATE_DELAY';
    return 'MAJOR_DELAY';
});

// Method to update train position
trainSchema.methods.updatePosition = function(sectionId, trackId, kilometer, lat, lon) {
    this.currentPosition = {
        sectionId,
        trackId,
        kilometer,
        latitude: lat,
        longitude: lon,
        lastUpdated: Date.now()
    };
    return this.save();
};

// Method to add delay
trainSchema.methods.addDelay = function(reason, minutes) {
    this.delay.currentDelay += minutes;
    this.delay.reasons.push({
        reason,
        delayMinutes: minutes,
        timestamp: Date.now()
    });
    return this.save();
};

const Train = mongoose.model("Train", trainSchema);
module.exports = Train;
