/**
 * Railway Section Controller
 * Handles section management and monitoring
 */

const Section = require('../models/section');
const Track = require('../models/track');
const Train = require('../models/train');

// Get all sections
module.exports.getAllSections = async (req, res) => {
    try {
        const { status } = req.query;
        const filter = {};

        if (status) filter.operationalStatus = status;

        const sections = await Section.find(filter)
            .populate('tracks')
            .populate('controllerInfo.controllerId');

        res.json({
            success: true,
            count: sections.length,
            data: sections
        });
    } catch (error) {
        console.error('Error fetching sections:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching sections',
            error: error.message
        });
    }
};

// Get single section
module.exports.getSection = async (req, res) => {
    try {
        const section = await Section.findById(req.params.id)
            .populate('tracks')
            .populate('controllerInfo.controllerId');

        if (!section) {
            return res.status(404).json({
                success: false,
                message: 'Section not found'
            });
        }

        res.json({
            success: true,
            data: section
        });
    } catch (error) {
        console.error('Error fetching section:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching section',
            error: error.message
        });
    }
};

// Create new section
module.exports.createSection = async (req, res) => {
    try {
        const section = new Section(req.body);
        await section.save();

        res.status(201).json({
            success: true,
            message: 'Section created successfully',
            data: section
        });
    } catch (error) {
        console.error('Error creating section:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating section',
            error: error.message
        });
    }
};

// Update section
module.exports.updateSection = async (req, res) => {
    try {
        const section = await Section.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!section) {
            return res.status(404).json({
                success: false,
                message: 'Section not found'
            });
        }

        res.json({
            success: true,
            message: 'Section updated successfully',
            data: section
        });
    } catch (error) {
        console.error('Error updating section:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating section',
            error: error.message
        });
    }
};

// Delete section
module.exports.deleteSection = async (req, res) => {
    try {
        const section = await Section.findByIdAndDelete(req.params.id);

        if (!section) {
            return res.status(404).json({
                success: false,
                message: 'Section not found'
            });
        }

        res.json({
            success: true,
            message: 'Section deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting section:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting section',
            error: error.message
        });
    }
};

// Get section capacity status
module.exports.getCapacityStatus = async (req, res) => {
    try {
        const section = await Section.findById(req.params.id);
        if (!section) {
            return res.status(404).json({
                success: false,
                message: 'Section not found'
            });
        }

        const activeTrains = await Train.countDocuments({
            'currentPosition.sectionId': req.params.id,
            currentStatus: { $in: ['RUNNING', 'HALTED'] }
        });

        const hasCapacity = section.hasCapacity();

        res.json({
            success: true,
            data: {
                currentUtilization: section.capacity.currentUtilization,
                maxTrainsPerHour: section.capacity.maxTrainsPerHour,
                activeTrains,
                hasCapacity,
                status: hasCapacity ? 'AVAILABLE' : 'NEAR_CAPACITY'
            }
        });
    } catch (error) {
        console.error('Error fetching capacity status:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching capacity status',
            error: error.message
        });
    }
};

// Get crossing points in section
module.exports.getCrossingPoints = async (req, res) => {
    try {
        const section = await Section.findById(req.params.id);
        if (!section) {
            return res.status(404).json({
                success: false,
                message: 'Section not found'
            });
        }

        const crossingPoints = section.getCrossingPoints();

        res.json({
            success: true,
            count: crossingPoints.length,
            data: crossingPoints
        });
    } catch (error) {
        console.error('Error fetching crossing points:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching crossing points',
            error: error.message
        });
    }
};

// Get section statistics
module.exports.getSectionStatistics = async (req, res) => {
    try {
        const section = await Section.findById(req.params.id);
        if (!section) {
            return res.status(404).json({
                success: false,
                message: 'Section not found'
            });
        }

        const trains = await Train.find({
            'currentPosition.sectionId': req.params.id
        });

        const tracks = await Track.find({
            sectionId: req.params.id
        });

        const occupiedTracks = tracks.filter(t => t.currentOccupancy.isOccupied).length;

        res.json({
            success: true,
            data: {
                totalTrains: trains.length,
                trainsRunning: trains.filter(t => t.currentStatus === 'RUNNING').length,
                trainsDelayed: trains.filter(t => t.delay.currentDelay > 0).length,
                avgDelay: trains.reduce((sum, t) => sum + t.delay.currentDelay, 0) / trains.length || 0,
                totalTracks: tracks.length,
                occupiedTracks,
                trackUtilization: (occupiedTracks / tracks.length * 100).toFixed(2) + '%'
            }
        });
    } catch (error) {
        console.error('Error fetching section statistics:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching section statistics',
            error: error.message
        });
    }
};
