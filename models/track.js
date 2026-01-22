const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const trackSchema = new Schema({
    trackNumber: {
        type: String,
        required: true,
        trim: true
    },
    sectionId: {
        type: Schema.Types.ObjectId,
        ref: 'Section',
        required: true
    },
    trackType: {
        type: String,
        enum: ['UP', 'DOWN', 'LOOP', 'SIDING'],
        required: true
    },
    startPoint: {
        stationCode: String,
        stationName: String,
        kilometer: Number
    },
    endPoint: {
        stationCode: String,
        stationName: String,
        kilometer: Number
    },
    length: {
        type: Number,
        required: true // in kilometers
    },
    currentOccupancy: {
        isOccupied: {
            type: Boolean,
            default: false
        },
        occupiedBy: {
            type: Schema.Types.ObjectId,
            ref: 'Train'
        },
        occupiedSince: Date,
        estimatedClearTime: Date
    },
    blockSections: [{
        blockId: String,
        startKm: Number,
        endKm: Number,
        isOccupied: {
            type: Boolean,
            default: false
        },
        occupiedBy: {
            type: Schema.Types.ObjectId,
            ref: 'Train'
        }
    }],
    signals: [{
        signalId: String,
        signalType: {
            type: String,
            enum: ['HOME', 'STARTER', 'DISTANT', 'OUTER', 'ADVANCED_STARTER']
        },
        kilometer: Number,
        currentAspect: {
            type: String,
            enum: ['RED', 'YELLOW', 'DOUBLE_YELLOW', 'GREEN'],
            default: 'RED'
        },
        lastUpdated: Date
    }],
    status: {
        type: String,
        enum: ['AVAILABLE', 'OCCUPIED', 'BLOCKED', 'MAINTENANCE'],
        default: 'AVAILABLE'
    },
    maintenanceSchedule: [{
        startTime: Date,
        endTime: Date,
        description: String,
        status: {
            type: String,
            enum: ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED'],
            default: 'SCHEDULED'
        }
    }],
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Compound index for efficient queries
trackSchema.index({ sectionId: 1, trackNumber: 1 });

// Update the updatedAt timestamp before saving
trackSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Method to occupy track
trackSchema.methods.occupy = function(trainId, estimatedClearTime) {
    this.currentOccupancy = {
        isOccupied: true,
        occupiedBy: trainId,
        occupiedSince: Date.now(),
        estimatedClearTime
    };
    this.status = 'OCCUPIED';
    return this.save();
};

// Method to clear track
trackSchema.methods.clear = function() {
    this.currentOccupancy = {
        isOccupied: false,
        occupiedBy: null,
        occupiedSince: null,
        estimatedClearTime: null
    };
    this.status = 'AVAILABLE';
    return this.save();
};

// Method to check if track is available
trackSchema.methods.isAvailable = function() {
    return this.status === 'AVAILABLE' && !this.currentOccupancy.isOccupied;
};

const Track = mongoose.model("Track", trackSchema);
module.exports = Track;
