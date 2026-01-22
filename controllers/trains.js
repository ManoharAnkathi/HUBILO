/**
 * Railway Train Controller
 * Handles CRUD operations for trains and real-time updates
 */

const Train = require('../models/train');
const Section = require('../models/section');
const Track = require('../models/track');

// Get all trains
module.exports.getAllTrains = async (req, res) => {
    try {
        const { status, type, section } = req.query;
        const filter = {};

        if (status) filter.currentStatus = status;
        if (type) filter.trainType = type;
        if (section) filter['currentPosition.sectionId'] = section;

        const trains = await Train.find(filter)
            .populate('currentPosition.sectionId')
            .populate('currentPosition.trackId')
            .sort({ 'schedule.scheduledDeparture': 1 });

        res.json({
            success: true,
            count: trains.length,
            data: trains
        });
    } catch (error) {
        console.error('Error fetching trains:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching trains',
            error: error.message
        });
    }
};

// Get single train
module.exports.getTrain = async (req, res) => {
    try {
        const train = await Train.findById(req.params.id)
            .populate('currentPosition.sectionId')
            .populate('currentPosition.trackId');

        if (!train) {
            return res.status(404).json({
                success: false,
                message: 'Train not found'
            });
        }

        res.json({
            success: true,
            data: train
        });
    } catch (error) {
        console.error('Error fetching train:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching train',
            error: error.message
        });
    }
};

// Create new train
module.exports.createTrain = async (req, res) => {
    try {
        const train = new Train(req.body);
        await train.save();

        res.status(201).json({
            success: true,
            message: 'Train created successfully',
            data: train
        });
    } catch (error) {
        console.error('Error creating train:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating train',
            error: error.message
        });
    }
};

// Update train
module.exports.updateTrain = async (req, res) => {
    try {
        const train = await Train.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!train) {
            return res.status(404).json({
                success: false,
                message: 'Train not found'
            });
        }

        res.json({
            success: true,
            message: 'Train updated successfully',
            data: train
        });
    } catch (error) {
        console.error('Error updating train:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating train',
            error: error.message
        });
    }
};

// Delete train
module.exports.deleteTrain = async (req, res) => {
    try {
        const train = await Train.findByIdAndDelete(req.params.id);

        if (!train) {
            return res.status(404).json({
                success: false,
                message: 'Train not found'
            });
        }

        res.json({
            success: true,
            message: 'Train deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting train:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting train',
            error: error.message
        });
    }
};

// Update train position
module.exports.updatePosition = async (req, res) => {
    try {
        const { sectionId, trackId, kilometer, latitude, longitude } = req.body;
        
        const train = await Train.findById(req.params.id);
        if (!train) {
            return res.status(404).json({
                success: false,
                message: 'Train not found'
            });
        }

        await train.updatePosition(sectionId, trackId, kilometer, latitude, longitude);

        res.json({
            success: true,
            message: 'Train position updated successfully',
            data: train
        });
    } catch (error) {
        console.error('Error updating position:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating position',
            error: error.message
        });
    }
};

// Add delay to train
module.exports.addDelay = async (req, res) => {
    try {
        const { reason, minutes } = req.body;
        
        const train = await Train.findById(req.params.id);
        if (!train) {
            return res.status(404).json({
                success: false,
                message: 'Train not found'
            });
        }

        await train.addDelay(reason, minutes);

        res.json({
            success: true,
            message: 'Delay added successfully',
            data: train
        });
    } catch (error) {
        console.error('Error adding delay:', error);
        res.status(500).json({
            success: false,
            message: 'Error adding delay',
            error: error.message
        });
    }
};

// Get trains by section
module.exports.getTrainsBySection = async (req, res) => {
    try {
        const trains = await Train.find({
            'currentPosition.sectionId': req.params.sectionId,
            currentStatus: { $in: ['SCHEDULED', 'RUNNING', 'HALTED'] }
        }).populate('currentPosition.trackId');

        res.json({
            success: true,
            count: trains.length,
            data: trains
        });
    } catch (error) {
        console.error('Error fetching trains by section:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching trains',
            error: error.message
        });
    }
};

// Get train statistics
module.exports.getTrainStatistics = async (req, res) => {
    try {
        const stats = await Train.aggregate([
            {
                $group: {
                    _id: '$currentStatus',
                    count: { $sum: 1 },
                    avgDelay: { $avg: '$delay.currentDelay' }
                }
            }
        ]);

        const typeStats = await Train.aggregate([
            {
                $group: {
                    _id: '$trainType',
                    count: { $sum: 1 }
                }
            }
        ]);

        res.json({
            success: true,
            data: {
                byStatus: stats,
                byType: typeStats,
                totalTrains: await Train.countDocuments()
            }
        });
    } catch (error) {
        console.error('Error fetching statistics:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching statistics',
            error: error.message
        });
    }
};
