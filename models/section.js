const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const sectionSchema = new Schema({
    sectionCode: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    sectionName: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    controllerInfo: {
        controllerId: {
            type: Schema.Types.ObjectId,
            ref: 'User'
        },
        controllerName: String,
        contactNumber: String
    },
    characteristics: {
        totalLength: Number, // in kilometers
        numberOfTracks: {
            type: Number,
            required: true,
            min: 1
        },
        trackType: {
            type: String,
            enum: ['SINGLE', 'DOUBLE', 'MULTIPLE'],
            required: true
        },
        electrification: {
            type: String,
            enum: ['AC', 'DC', 'NON_ELECTRIFIED'],
            default: 'AC'
        },
        maxSpeed: Number, // in km/h
        gradient: String, // e.g., "1:100", "level"
        signallingSystem: {
            type: String,
            enum: ['ABSOLUTE_BLOCK', 'AUTOMATIC_BLOCK', 'TRACK_CIRCUIT', 'TOKENLESS_BLOCK'],
            required: true
        }
    },
    stations: [{
        stationCode: {
            type: String,
            required: true
        },
        stationName: {
            type: String,
            required: true
        },
        kilometer: Number, // distance from section start
        platforms: {
            type: Number,
            default: 2
        },
        isJunction: {
            type: Boolean,
            default: false
        },
        crossingPoint: {
            type: Boolean,
            default: false
        }
    }],
    tracks: [{
        type: Schema.Types.ObjectId,
        ref: 'Track'
    }],
    capacity: {
        maxTrainsPerHour: Number,
        currentUtilization: {
            type: Number,
            default: 0 // percentage
        },
        averageDwellTime: Number // in minutes
    },
    constraints: {
        restrictions: [{
            type: String,
            description: String,
            startKm: Number,
            endKm: Number,
            speedLimit: Number,
            validFrom: Date,
            validTo: Date
        }],
        maintenanceWindows: [{
            startTime: Date,
            endTime: Date,
            affectedTracks: [String],
            description: String
        }]
    },
    operationalStatus: {
        type: String,
        enum: ['OPERATIONAL', 'RESTRICTED', 'CLOSED', 'MAINTENANCE'],
        default: 'OPERATIONAL'
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
sectionSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Method to check if section has capacity
sectionSchema.methods.hasCapacity = function() {
    return this.capacity.currentUtilization < 90; // 90% threshold
};

// Method to get crossing points
sectionSchema.methods.getCrossingPoints = function() {
    return this.stations.filter(station => station.crossingPoint);
};

const Section = mongoose.model("Section", sectionSchema);
module.exports = Section;
