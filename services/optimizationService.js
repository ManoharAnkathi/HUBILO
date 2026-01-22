/**
 * Railway Traffic Optimization Service
 * Implements algorithms for train precedence, crossing optimization, and conflict resolution
 */

const Train = require('../models/train');
const Section = require('../models/section');
const Track = require('../models/track');
const Conflict = require('../models/conflict');

class OptimizationService {
    /**
     * Detect conflicts between trains in a section
     * @param {String} sectionId - Section ID to analyze
     * @param {Number} lookaheadMinutes - Time window to look ahead (default: 120 minutes)
     * @returns {Array} Array of detected conflicts
     */
    async detectConflicts(sectionId, lookaheadMinutes = 120) {
        try {
            const section = await Section.findById(sectionId).populate('tracks');
            if (!section) {
                throw new Error('Section not found');
            }

            const now = new Date();
            const lookaheadTime = new Date(now.getTime() + lookaheadMinutes * 60000);

            // Get all trains currently in or scheduled to enter this section
            const trains = await Train.find({
                $or: [
                    { 'currentPosition.sectionId': sectionId },
                    {
                        'schedule.scheduledDeparture': { $lte: lookaheadTime },
                        'route.stationCode': { $in: section.stations.map(s => s.stationCode) }
                    }
                ],
                currentStatus: { $in: ['SCHEDULED', 'RUNNING', 'HALTED'] }
            });

            const conflicts = [];

            // Check for track conflicts (same track, overlapping times)
            for (let i = 0; i < trains.length; i++) {
                for (let j = i + 1; j < trains.length; j++) {
                    const conflict = this._checkTrainConflict(trains[i], trains[j], section);
                    if (conflict) {
                        conflicts.push(conflict);
                    }
                }
            }

            return conflicts;
        } catch (error) {
            console.error('Error detecting conflicts:', error);
            throw error;
        }
    }

    /**
     * Check if two trains have a conflict
     * @private
     */
    _checkTrainConflict(train1, train2, section) {
        // Simplified conflict detection logic
        // In production, this would be much more sophisticated

        // Check if trains are on same track
        if (train1.currentPosition?.trackId && 
            train2.currentPosition?.trackId &&
            train1.currentPosition.trackId.toString() === train2.currentPosition.trackId.toString()) {
            
            // Calculate if they might collide based on position and speed
            const timeDiff = Math.abs(train1.schedule.scheduledArrival - train2.schedule.scheduledArrival) / (1000 * 60);
            
            if (timeDiff < 30) { // Within 30 minutes
                return {
                    conflictType: 'SAME_TRACK',
                    severity: 'HIGH',
                    trainsInvolved: [
                        {
                            trainId: train1._id,
                            trainNumber: train1.trainNumber,
                            priority: train1.priority
                        },
                        {
                            trainId: train2._id,
                            trainNumber: train2.trainNumber,
                            priority: train2.priority
                        }
                    ],
                    location: {
                        sectionId: section._id,
                        trackId: train1.currentPosition.trackId
                    },
                    timeWindow: {
                        conflictStartTime: new Date(),
                        conflictEndTime: new Date(Date.now() + 30 * 60000),
                        duration: 30
                    },
                    description: `Trains ${train1.trainNumber} and ${train2.trainNumber} may conflict on same track`,
                    status: 'DETECTED'
                };
            }
        }

        return null;
    }

    /**
     * Optimize train precedence for a section
     * @param {String} sectionId - Section ID
     * @param {Array} trainIds - Array of train IDs to optimize
     * @returns {Object} Optimized schedule with train order
     */
    async optimizePrecedence(sectionId, trainIds) {
        try {
            const trains = await Train.find({ _id: { $in: trainIds } });
            const section = await Section.findById(sectionId);

            if (!section) {
                throw new Error('Section not found');
            }

            // Sort trains by priority (higher priority first) and scheduled time
            const sortedTrains = trains.sort((a, b) => {
                // First by priority (descending)
                if (a.priority !== b.priority) {
                    return b.priority - a.priority;
                }
                // Then by scheduled time (ascending)
                return new Date(a.schedule.scheduledDeparture) - new Date(b.schedule.scheduledDeparture);
            });

            // Calculate optimal order and timing
            const optimizedSchedule = {
                sectionId,
                trains: [],
                totalThroughput: 0,
                estimatedCompletionTime: null,
                conflicts: []
            };

            let currentTime = new Date();
            const minSeparation = 5; // Minimum 5 minutes between trains

            for (const train of sortedTrains) {
                const scheduledTime = new Date(train.schedule.scheduledDeparture);
                const departureTime = currentTime > scheduledTime ? currentTime : scheduledTime;
                
                // Estimate travel time through section
                const travelTime = this._estimateTravelTime(train, section);
                const arrivalTime = new Date(departureTime.getTime() + travelTime * 60000);

                optimizedSchedule.trains.push({
                    trainId: train._id,
                    trainNumber: train.trainNumber,
                    priority: train.priority,
                    originalDeparture: scheduledTime,
                    optimizedDeparture: departureTime,
                    estimatedArrival: arrivalTime,
                    estimatedDelay: Math.max(0, (departureTime - scheduledTime) / (1000 * 60))
                });

                // Update current time for next train
                currentTime = new Date(arrivalTime.getTime() + minSeparation * 60000);
            }

            optimizedSchedule.estimatedCompletionTime = currentTime;
            optimizedSchedule.totalThroughput = sortedTrains.length;

            return optimizedSchedule;
        } catch (error) {
            console.error('Error optimizing precedence:', error);
            throw error;
        }
    }

    /**
     * Calculate optimal crossing point for opposing trains
     * @param {String} train1Id - First train ID
     * @param {String} train2Id - Second train ID
     * @param {String} sectionId - Section ID
     * @returns {Object} Optimal crossing arrangement
     */
    async calculateCrossingPoint(train1Id, train2Id, sectionId) {
        try {
            const train1 = await Train.findById(train1Id);
            const train2 = await Train.findById(train2Id);
            const section = await Section.findById(sectionId);

            if (!train1 || !train2 || !section) {
                throw new Error('Train or section not found');
            }

            // Get crossing points in the section
            const crossingPoints = section.getCrossingPoints();

            if (crossingPoints.length === 0) {
                return {
                    success: false,
                    message: 'No crossing points available in this section'
                };
            }

            // Calculate optimal crossing point based on train positions and speeds
            let optimalPoint = null;
            let minTotalDelay = Infinity;

            for (const crossing of crossingPoints) {
                const delay1 = this._calculateDelayToCrossing(train1, crossing, section);
                const delay2 = this._calculateDelayToCrossing(train2, crossing, section);
                const totalDelay = delay1 + delay2;

                if (totalDelay < minTotalDelay) {
                    minTotalDelay = totalDelay;
                    optimalPoint = crossing;
                }
            }

            return {
                success: true,
                crossingPoint: optimalPoint,
                train1Delay: this._calculateDelayToCrossing(train1, optimalPoint, section),
                train2Delay: this._calculateDelayToCrossing(train2, optimalPoint, section),
                totalDelay: minTotalDelay,
                recommendation: this._generateCrossingRecommendation(train1, train2, optimalPoint)
            };
        } catch (error) {
            console.error('Error calculating crossing point:', error);
            throw error;
        }
    }

    /**
     * Generate AI-powered recommendations for conflict resolution
     * @param {String} conflictId - Conflict ID
     * @returns {Object} AI recommendations
     */
    async generateAIRecommendations(conflictId) {
        try {
            const conflict = await Conflict.findById(conflictId)
                .populate('trainsInvolved.trainId')
                .populate('location.sectionId')
                .populate('location.trackId');

            if (!conflict) {
                throw new Error('Conflict not found');
            }

            const recommendations = {
                primaryRecommendation: null,
                alternatives: [],
                impactAnalysis: null
            };

            // Analyze conflict and generate recommendations
            switch (conflict.conflictType) {
                case 'SAME_TRACK':
                    recommendations.primaryRecommendation = this._recommendSameTrackResolution(conflict);
                    break;
                case 'CROSSING':
                    recommendations.primaryRecommendation = this._recommendCrossingResolution(conflict);
                    break;
                case 'PLATFORM':
                    recommendations.primaryRecommendation = this._recommendPlatformResolution(conflict);
                    break;
                default:
                    recommendations.primaryRecommendation = this._recommendGenericResolution(conflict);
            }

            // Generate alternative strategies
            recommendations.alternatives = this._generateAlternativeStrategies(conflict);

            // Impact analysis
            recommendations.impactAnalysis = await this._analyzeImpact(conflict);

            return recommendations;
        } catch (error) {
            console.error('Error generating AI recommendations:', error);
            throw error;
        }
    }

    /**
     * Estimate travel time through section
     * @private
     */
    _estimateTravelTime(train, section) {
        const avgSpeed = train.characteristics?.maxSpeed || 60; // Default 60 km/h
        const distance = section.characteristics?.totalLength || 50; // Default 50 km
        const travelTimeHours = distance / avgSpeed;
        return travelTimeHours * 60; // Convert to minutes
    }

    /**
     * Calculate delay to reach crossing point
     * @private
     */
    _calculateDelayToCrossing(train, crossing, section) {
        // Simplified calculation
        const currentKm = train.currentPosition?.kilometer || 0;
        const crossingKm = crossing.kilometer;
        const distance = Math.abs(crossingKm - currentKm);
        const speed = train.characteristics?.maxSpeed || 60;
        const travelTime = (distance / speed) * 60; // in minutes
        
        // If train needs to wait at crossing
        const waitTime = 10; // Assume 10 minutes wait time
        
        return travelTime + waitTime;
    }

    /**
     * Generate crossing recommendation text
     * @private
     */
    _generateCrossingRecommendation(train1, train2, crossing) {
        const higherPriority = train1.priority > train2.priority ? train1 : train2;
        const lowerPriority = train1.priority > train2.priority ? train2 : train1;

        return `Recommend crossing at ${crossing.stationName}. Train ${higherPriority.trainNumber} (Priority ${higherPriority.priority}) should proceed first. Train ${lowerPriority.trainNumber} (Priority ${lowerPriority.priority}) should wait at crossing point.`;
    }

    /**
     * Recommend resolution for same track conflict
     * @private
     */
    _recommendSameTrackResolution(conflict) {
        const trains = conflict.trainsInvolved;
        const higherPriority = trains.reduce((prev, current) => 
            (prev.priority > current.priority) ? prev : current
        );

        return {
            strategy: 'PRIORITY_OVERRIDE',
            trainToHold: trains.find(t => t.trainId.toString() !== higherPriority.trainId.toString())?.trainId,
            confidence: 85,
            estimatedDelay: 15,
            reasoning: `Train ${higherPriority.trainNumber} has higher priority (${higherPriority.priority}). Recommend holding lower priority train.`
        };
    }

    /**
     * Recommend resolution for crossing conflict
     * @private
     */
    _recommendCrossingResolution(conflict) {
        return {
            strategy: 'CROSSING_ARRANGEMENT',
            confidence: 90,
            estimatedDelay: 10,
            reasoning: 'Optimize crossing arrangement based on train priorities and current positions.'
        };
    }

    /**
     * Recommend resolution for platform conflict
     * @private
     */
    _recommendPlatformResolution(conflict) {
        return {
            strategy: 'PLATFORM_CHANGE',
            confidence: 75,
            estimatedDelay: 5,
            reasoning: 'Allocate alternative platform to resolve conflict.'
        };
    }

    /**
     * Recommend generic resolution
     * @private
     */
    _recommendGenericResolution(conflict) {
        return {
            strategy: 'HOLD_TRAIN',
            confidence: 70,
            estimatedDelay: 20,
            reasoning: 'Hold lower priority train until conflict is resolved.'
        };
    }

    /**
     * Generate alternative strategies
     * @private
     */
    _generateAlternativeStrategies(conflict) {
        return [
            {
                strategy: 'HOLD_TRAIN',
                confidence: 75,
                estimatedDelay: 15,
                pros: ['Simple to implement', 'Safe'],
                cons: ['May increase delay']
            },
            {
                strategy: 'REROUTE',
                confidence: 60,
                estimatedDelay: 30,
                pros: ['Avoids conflict completely'],
                cons: ['Requires available alternative route', 'Higher delay']
            }
        ];
    }

    /**
     * Analyze impact of conflict
     * @private
     */
    async _analyzeImpact(conflict) {
        return {
            affectedTrains: conflict.trainsInvolved.length,
            totalDelayMinutes: conflict.trainsInvolved.length * 15, // Estimate
            throughputImpact: -10 // Percentage
        };
    }
}

module.exports = new OptimizationService();
