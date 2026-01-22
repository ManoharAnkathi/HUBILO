const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const conflictSchema = new Schema({
    conflictType: {
        type: String,
        enum: ['SAME_TRACK', 'CROSSING', 'PLATFORM', 'SIGNAL', 'PRECEDENCE'],
        required: true
    },
    severity: {
        type: String,
        enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
        default: 'MEDIUM'
    },
    trainsInvolved: [{
        trainId: {
            type: Schema.Types.ObjectId,
            ref: 'Train',
            required: true
        },
        trainNumber: String,
        priority: Number
    }],
    location: {
        sectionId: {
            type: Schema.Types.ObjectId,
            ref: 'Section'
        },
        trackId: {
            type: Schema.Types.ObjectId,
            ref: 'Track'
        },
        stationCode: String,
        kilometer: Number
    },
    timeWindow: {
        conflictStartTime: {
            type: Date,
            required: true
        },
        conflictEndTime: {
            type: Date,
            required: true
        },
        duration: Number // in minutes
    },
    description: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['DETECTED', 'ANALYZING', 'RESOLVED', 'MANUALLY_RESOLVED', 'ESCALATED'],
        default: 'DETECTED'
    },
    resolutionStrategy: {
        strategy: {
            type: String,
            enum: ['HOLD_TRAIN', 'REROUTE', 'PRIORITY_OVERRIDE', 'CROSSING_ARRANGEMENT', 'PLATFORM_CHANGE', 'NONE']
        },
        trainToHold: {
            type: Schema.Types.ObjectId,
            ref: 'Train'
        },
        alternativeTrack: {
            type: Schema.Types.ObjectId,
            ref: 'Track'
        },
        holdDuration: Number, // in minutes
        estimatedDelay: Number, // in minutes
        confidence: Number, // 0-100%
        reasoning: String
    },
    aiRecommendation: {
        recommendedStrategy: String,
        confidence: Number,
        alternativeStrategies: [{
            strategy: String,
            confidence: Number,
            estimatedDelay: Number,
            pros: [String],
            cons: [String]
        }],
        impactAnalysis: {
            affectedTrains: Number,
            totalDelayMinutes: Number,
            throughputImpact: Number
        }
    },
    controllerDecision: {
        decidedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User'
        },
        decisionTime: Date,
        chosenStrategy: String,
        overrideReason: String,
        notes: String
    },
    actualOutcome: {
        resolvedAt: Date,
        actualDelay: Number,
        wasSuccessful: Boolean,
        lessons: String
    },
    auditTrail: [{
        action: String,
        performedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User'
        },
        timestamp: {
            type: Date,
            default: Date.now
        },
        details: String
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

// Update the updatedAt timestamp before saving
conflictSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Method to add audit trail entry
conflictSchema.methods.addAuditEntry = function(action, userId, details) {
    this.auditTrail.push({
        action,
        performedBy: userId,
        timestamp: Date.now(),
        details
    });
    return this.save();
};

// Method to resolve conflict
conflictSchema.methods.resolve = function(userId, strategy, notes) {
    this.status = 'RESOLVED';
    this.controllerDecision = {
        decidedBy: userId,
        decisionTime: Date.now(),
        chosenStrategy: strategy,
        notes
    };
    this.addAuditEntry('RESOLVED', userId, `Conflict resolved using ${strategy}`);
    return this.save();
};

const Conflict = mongoose.model("Conflict", conflictSchema);
module.exports = Conflict;
