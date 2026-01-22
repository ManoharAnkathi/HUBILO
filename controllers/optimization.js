/**
 * Railway Traffic Optimization Controller
 * Handles optimization and AI-powered decision making
 */

const optimizationService = require('../services/optimizationService');
const simulationService = require('../services/simulationService');
const Conflict = require('../models/conflict');

// Detect conflicts in a section
module.exports.detectConflicts = async (req, res) => {
    try {
        const { sectionId } = req.params;
        const { lookaheadMinutes = 120 } = req.query;

        const conflicts = await optimizationService.detectConflicts(
            sectionId,
            parseInt(lookaheadMinutes)
        );

        // Save detected conflicts to database
        for (const conflictData of conflicts) {
            const existing = await Conflict.findOne({
                'trainsInvolved.trainId': { $all: conflictData.trainsInvolved.map(t => t.trainId) },
                status: { $in: ['DETECTED', 'ANALYZING'] }
            });

            if (!existing) {
                const conflict = new Conflict(conflictData);
                await conflict.save();
            }
        }

        res.json({
            success: true,
            count: conflicts.length,
            data: conflicts
        });
    } catch (error) {
        console.error('Error detecting conflicts:', error);
        res.status(500).json({
            success: false,
            message: 'Error detecting conflicts',
            error: error.message
        });
    }
};

// Optimize train precedence
module.exports.optimizePrecedence = async (req, res) => {
    try {
        const { sectionId } = req.params;
        const { trainIds } = req.body;

        if (!trainIds || !Array.isArray(trainIds)) {
            return res.status(400).json({
                success: false,
                message: 'trainIds array is required'
            });
        }

        const optimizedSchedule = await optimizationService.optimizePrecedence(
            sectionId,
            trainIds
        );

        res.json({
            success: true,
            data: optimizedSchedule
        });
    } catch (error) {
        console.error('Error optimizing precedence:', error);
        res.status(500).json({
            success: false,
            message: 'Error optimizing precedence',
            error: error.message
        });
    }
};

// Calculate optimal crossing point
module.exports.calculateCrossing = async (req, res) => {
    try {
        const { train1Id, train2Id, sectionId } = req.body;

        if (!train1Id || !train2Id || !sectionId) {
            return res.status(400).json({
                success: false,
                message: 'train1Id, train2Id, and sectionId are required'
            });
        }

        const crossingResult = await optimizationService.calculateCrossingPoint(
            train1Id,
            train2Id,
            sectionId
        );

        res.json({
            success: true,
            data: crossingResult
        });
    } catch (error) {
        console.error('Error calculating crossing:', error);
        res.status(500).json({
            success: false,
            message: 'Error calculating crossing',
            error: error.message
        });
    }
};

// Get AI recommendations for conflict
module.exports.getAIRecommendations = async (req, res) => {
    try {
        const { conflictId } = req.params;

        const recommendations = await optimizationService.generateAIRecommendations(conflictId);

        // Update conflict with AI recommendations
        await Conflict.findByIdAndUpdate(conflictId, {
            aiRecommendation: recommendations,
            status: 'ANALYZING'
        });

        res.json({
            success: true,
            data: recommendations
        });
    } catch (error) {
        console.error('Error generating AI recommendations:', error);
        res.status(500).json({
            success: false,
            message: 'Error generating AI recommendations',
            error: error.message
        });
    }
};

// Resolve conflict with controller decision
module.exports.resolveConflict = async (req, res) => {
    try {
        const { conflictId } = req.params;
        const { strategy, notes } = req.body;

        if (!strategy) {
            return res.status(400).json({
                success: false,
                message: 'Strategy is required'
            });
        }

        const conflict = await Conflict.findById(conflictId);
        if (!conflict) {
            return res.status(404).json({
                success: false,
                message: 'Conflict not found'
            });
        }

        // Get user ID from authenticated session
        const userId = req.user?._id;
        
        await conflict.resolve(userId, strategy, notes);

        res.json({
            success: true,
            message: 'Conflict resolved successfully',
            data: conflict
        });
    } catch (error) {
        console.error('Error resolving conflict:', error);
        res.status(500).json({
            success: false,
            message: 'Error resolving conflict',
            error: error.message
        });
    }
};

// Get all conflicts
module.exports.getAllConflicts = async (req, res) => {
    try {
        const { status, severity, sectionId } = req.query;
        const filter = {};

        if (status) filter.status = status;
        if (severity) filter.severity = severity;
        if (sectionId) filter['location.sectionId'] = sectionId;

        const conflicts = await Conflict.find(filter)
            .populate('trainsInvolved.trainId')
            .populate('location.sectionId')
            .populate('location.trackId')
            .populate('controllerDecision.decidedBy')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            count: conflicts.length,
            data: conflicts
        });
    } catch (error) {
        console.error('Error fetching conflicts:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching conflicts',
            error: error.message
        });
    }
};

// Run simulation
module.exports.runSimulation = async (req, res) => {
    try {
        const scenario = req.body;

        const results = await simulationService.runSimulation(scenario);

        res.json({
            success: true,
            data: results
        });
    } catch (error) {
        console.error('Error running simulation:', error);
        res.status(500).json({
            success: false,
            message: 'Error running simulation',
            error: error.message
        });
    }
};

// Compare scenarios
module.exports.compareScenarios = async (req, res) => {
    try {
        const { scenarios } = req.body;

        if (!scenarios || !Array.isArray(scenarios)) {
            return res.status(400).json({
                success: false,
                message: 'scenarios array is required'
            });
        }

        const comparison = await simulationService.compareScenarios(scenarios);

        res.json({
            success: true,
            data: comparison
        });
    } catch (error) {
        console.error('Error comparing scenarios:', error);
        res.status(500).json({
            success: false,
            message: 'Error comparing scenarios',
            error: error.message
        });
    }
};

// Simulate delay impact
module.exports.simulateDelay = async (req, res) => {
    try {
        const { trainId, delayMinutes, sectionId } = req.body;

        if (!trainId || !delayMinutes || !sectionId) {
            return res.status(400).json({
                success: false,
                message: 'trainId, delayMinutes, and sectionId are required'
            });
        }

        const impact = await simulationService.simulateDelay(
            trainId,
            parseInt(delayMinutes),
            sectionId
        );

        res.json({
            success: true,
            data: impact
        });
    } catch (error) {
        console.error('Error simulating delay:', error);
        res.status(500).json({
            success: false,
            message: 'Error simulating delay',
            error: error.message
        });
    }
};

// Simulate platform allocation
module.exports.simulatePlatformAllocation = async (req, res) => {
    try {
        const { stationCode, trainIds } = req.body;

        if (!stationCode || !trainIds || !Array.isArray(trainIds)) {
            return res.status(400).json({
                success: false,
                message: 'stationCode and trainIds array are required'
            });
        }

        const allocation = await simulationService.simulatePlatformAllocation(
            stationCode,
            trainIds
        );

        res.json({
            success: true,
            data: allocation
        });
    } catch (error) {
        console.error('Error simulating platform allocation:', error);
        res.status(500).json({
            success: false,
            message: 'Error simulating platform allocation',
            error: error.message
        });
    }
};
