/**
 * Railway Traffic Simulation Service
 * Provides what-if scenario analysis and simulation capabilities
 */

const Train = require('../models/train');
const Section = require('../models/section');
const Track = require('../models/track');
const Conflict = require('../models/conflict');

class SimulationService {
    /**
     * Run a what-if simulation scenario
     * @param {Object} scenario - Simulation scenario configuration
     * @returns {Object} Simulation results
     */
    async runSimulation(scenario) {
        try {
            const {
                sectionId,
                trainIds,
                modifications,
                duration = 120, // minutes
                startTime = new Date()
            } = scenario;

            // Get base data
            const section = await Section.findById(sectionId);
            const trains = await Train.find({ _id: { $in: trainIds } });

            if (!section || trains.length === 0) {
                throw new Error('Invalid simulation parameters');
            }

            // Apply modifications to create simulation state
            const simulatedTrains = this._applyModifications(trains, modifications);

            // Run simulation
            const simulationSteps = [];
            let currentTime = new Date(startTime);
            const endTime = new Date(currentTime.getTime() + duration * 60000);

            while (currentTime < endTime) {
                const step = await this._simulateTimeStep(
                    currentTime,
                    simulatedTrains,
                    section
                );
                simulationSteps.push(step);
                
                // Advance time by 5 minutes
                currentTime = new Date(currentTime.getTime() + 5 * 60000);
            }

            // Analyze results
            const results = this._analyzeSimulationResults(simulationSteps);

            return {
                scenario,
                steps: simulationSteps,
                results,
                summary: this._generateSimulationSummary(results)
            };
        } catch (error) {
            console.error('Error running simulation:', error);
            throw error;
        }
    }

    /**
     * Compare multiple scenarios
     * @param {Array} scenarios - Array of scenarios to compare
     * @returns {Object} Comparison results
     */
    async compareScenarios(scenarios) {
        try {
            const results = [];

            for (const scenario of scenarios) {
                const result = await this.runSimulation(scenario);
                results.push({
                    scenarioName: scenario.name,
                    ...result.results
                });
            }

            return {
                scenarios: results,
                comparison: this._compareResults(results),
                recommendation: this._recommendBestScenario(results)
            };
        } catch (error) {
            console.error('Error comparing scenarios:', error);
            throw error;
        }
    }

    /**
     * Simulate impact of a delay
     * @param {String} trainId - Train ID
     * @param {Number} delayMinutes - Delay in minutes
     * @param {String} sectionId - Section ID
     * @returns {Object} Impact analysis
     */
    async simulateDelay(trainId, delayMinutes, sectionId) {
        try {
            const train = await Train.findById(trainId);
            const section = await Section.findById(sectionId);

            if (!train || !section) {
                throw new Error('Train or section not found');
            }

            // Get all trains that might be affected
            const affectedTrains = await Train.find({
                'currentPosition.sectionId': sectionId,
                currentStatus: { $in: ['SCHEDULED', 'RUNNING'] },
                _id: { $ne: trainId }
            });

            // Calculate cascading delays
            const cascadingDelays = this._calculateCascadingDelays(
                train,
                delayMinutes,
                affectedTrains
            );

            // Calculate throughput impact
            const throughputImpact = this._calculateThroughputImpact(
                delayMinutes,
                cascadingDelays
            );

            return {
                originalTrain: {
                    trainNumber: train.trainNumber,
                    delayMinutes
                },
                cascadingDelays,
                totalAffectedTrains: cascadingDelays.length,
                totalDelayMinutes: cascadingDelays.reduce((sum, d) => sum + d.delayMinutes, delayMinutes),
                throughputImpact,
                recommendations: this._generateDelayRecommendations(train, delayMinutes, cascadingDelays)
            };
        } catch (error) {
            console.error('Error simulating delay:', error);
            throw error;
        }
    }

    /**
     * Simulate platform allocation
     * @param {String} stationCode - Station code
     * @param {Array} trainIds - Array of train IDs
     * @returns {Object} Optimal platform allocation
     */
    async simulatePlatformAllocation(stationCode, trainIds) {
        try {
            const trains = await Train.find({ _id: { $in: trainIds } });

            // Sort trains by arrival time
            const sortedTrains = trains.sort((a, b) => {
                const aTime = new Date(a.schedule.scheduledArrival);
                const bTime = new Date(b.schedule.scheduledArrival);
                return aTime - bTime;
            });

            // Allocate platforms
            const platforms = {};
            const allocation = [];

            for (const train of sortedTrains) {
                const platform = this._findAvailablePlatform(
                    platforms,
                    train.schedule.scheduledArrival,
                    train.schedule.scheduledDeparture
                );

                allocation.push({
                    trainNumber: train.trainNumber,
                    trainType: train.trainType,
                    platform: platform,
                    arrivalTime: train.schedule.scheduledArrival,
                    departureTime: train.schedule.scheduledDeparture,
                    dwellTime: (new Date(train.schedule.scheduledDeparture) - new Date(train.schedule.scheduledArrival)) / 60000
                });

                // Mark platform as occupied
                if (!platforms[platform]) {
                    platforms[platform] = [];
                }
                platforms[platform].push({
                    trainId: train._id,
                    startTime: train.schedule.scheduledArrival,
                    endTime: train.schedule.scheduledDeparture
                });
            }

            return {
                stationCode,
                allocation,
                platformUtilization: this._calculatePlatformUtilization(platforms),
                conflicts: this._detectPlatformConflicts(allocation)
            };
        } catch (error) {
            console.error('Error simulating platform allocation:', error);
            throw error;
        }
    }

    /**
     * Apply modifications to trains for simulation
     * @private
     */
    _applyModifications(trains, modifications) {
        if (!modifications) return trains;

        return trains.map(train => {
            const mod = modifications.find(m => m.trainId === train._id.toString());
            if (mod) {
                // Clone train and apply modifications
                const simTrain = { ...train.toObject() };
                if (mod.delayMinutes) {
                    simTrain.delay.currentDelay += mod.delayMinutes;
                }
                if (mod.priority) {
                    simTrain.priority = mod.priority;
                }
                return simTrain;
            }
            return train.toObject();
        });
    }

    /**
     * Simulate a single time step
     * @private
     */
    async _simulateTimeStep(currentTime, trains, section) {
        const step = {
            timestamp: currentTime,
            trains: [],
            conflicts: [],
            throughput: 0
        };

        // Update train positions
        for (const train of trains) {
            const position = this._calculateTrainPosition(train, currentTime);
            step.trains.push({
                trainNumber: train.trainNumber,
                position,
                status: this._determineTrainStatus(train, currentTime)
            });

            if (position.completed) {
                step.throughput++;
            }
        }

        // Detect conflicts at this time step
        step.conflicts = this._detectConflictsAtTime(step.trains, section);

        return step;
    }

    /**
     * Calculate train position at given time
     * @private
     */
    _calculateTrainPosition(train, time) {
        const elapsedMinutes = (time - new Date(train.schedule.scheduledDeparture)) / 60000;
        
        if (elapsedMinutes < 0) {
            return { status: 'NOT_STARTED', kilometer: 0, completed: false };
        }

        const speed = train.characteristics?.maxSpeed || 60; // km/h
        const distanceCovered = (elapsedMinutes / 60) * speed;

        // Simplified - would need actual route data
        const totalDistance = 100; // km

        if (distanceCovered >= totalDistance) {
            return { status: 'COMPLETED', kilometer: totalDistance, completed: true };
        }

        return { status: 'IN_TRANSIT', kilometer: distanceCovered, completed: false };
    }

    /**
     * Determine train status at time
     * @private
     */
    _determineTrainStatus(train, time) {
        if (time < new Date(train.schedule.scheduledDeparture)) {
            return 'WAITING';
        }
        if (time > new Date(train.schedule.scheduledArrival)) {
            return 'COMPLETED';
        }
        return 'RUNNING';
    }

    /**
     * Detect conflicts at specific time
     * @private
     */
    _detectConflictsAtTime(trains, section) {
        const conflicts = [];
        
        // Simple conflict detection - check if trains are too close
        for (let i = 0; i < trains.length; i++) {
            for (let j = i + 1; j < trains.length; j++) {
                const distance = Math.abs(trains[i].position.kilometer - trains[j].position.kilometer);
                if (distance < 5 && trains[i].position.status === 'IN_TRANSIT' && trains[j].position.status === 'IN_TRANSIT') {
                    conflicts.push({
                        train1: trains[i].trainNumber,
                        train2: trains[j].trainNumber,
                        distance,
                        type: 'PROXIMITY'
                    });
                }
            }
        }

        return conflicts;
    }

    /**
     * Analyze simulation results
     * @private
     */
    _analyzeSimulationResults(steps) {
        const totalConflicts = steps.reduce((sum, step) => sum + step.conflicts.length, 0);
        const totalThroughput = steps[steps.length - 1]?.throughput || 0;
        const avgTrainsInTransit = steps.reduce((sum, step) => {
            const inTransit = step.trains.filter(t => t.status === 'RUNNING').length;
            return sum + inTransit;
        }, 0) / steps.length;

        return {
            totalConflicts,
            totalThroughput,
            avgTrainsInTransit,
            efficiency: totalThroughput > 0 ? (1 - totalConflicts / (totalThroughput * 10)) * 100 : 0
        };
    }

    /**
     * Generate simulation summary
     * @private
     */
    _generateSimulationSummary(results) {
        return {
            performance: results.efficiency > 80 ? 'EXCELLENT' : results.efficiency > 60 ? 'GOOD' : 'NEEDS_IMPROVEMENT',
            keyMetrics: {
                throughput: results.totalThroughput,
                conflicts: results.totalConflicts,
                efficiency: `${results.efficiency.toFixed(2)}%`
            },
            recommendations: this._generatePerformanceRecommendations(results)
        };
    }

    /**
     * Calculate cascading delays
     * @private
     */
    _calculateCascadingDelays(delayedTrain, delayMinutes, otherTrains) {
        const cascading = [];

        for (const train of otherTrains) {
            // Simple cascade logic - trains following the delayed train
            if (train.priority <= delayedTrain.priority) {
                const cascadeDelay = Math.floor(delayMinutes * 0.3); // 30% of original delay
                if (cascadeDelay > 0) {
                    cascading.push({
                        trainNumber: train.trainNumber,
                        trainId: train._id,
                        delayMinutes: cascadeDelay,
                        reason: `Cascading from ${delayedTrain.trainNumber}`
                    });
                }
            }
        }

        return cascading;
    }

    /**
     * Calculate throughput impact
     * @private
     */
    _calculateThroughputImpact(delayMinutes, cascadingDelays) {
        const totalDelay = delayMinutes + cascadingDelays.reduce((sum, d) => sum + d.delayMinutes, 0);
        const impactPercentage = Math.min((totalDelay / 60) * 10, 50); // Max 50% impact
        
        return {
            percentage: -impactPercentage,
            description: `Estimated ${impactPercentage.toFixed(1)}% reduction in throughput`
        };
    }

    /**
     * Generate delay recommendations
     * @private
     */
    _generateDelayRecommendations(train, delayMinutes, cascadingDelays) {
        const recommendations = [];

        if (delayMinutes > 30) {
            recommendations.push('Consider rerouting train to minimize impact');
        }

        if (cascadingDelays.length > 3) {
            recommendations.push('High cascading impact detected - review section capacity');
        }

        recommendations.push('Monitor affected trains closely for further delays');

        return recommendations;
    }

    /**
     * Find available platform
     * @private
     */
    _findAvailablePlatform(platforms, arrivalTime, departureTime) {
        const platformCount = 4; // Assume 4 platforms
        
        for (let i = 1; i <= platformCount; i++) {
            const platform = i.toString();
            if (!platforms[platform] || platforms[platform].length === 0) {
                return platform;
            }

            // Check if platform is free during this time window
            const isFree = platforms[platform].every(occupation => {
                const occupiedEnd = new Date(occupation.endTime);
                const occupiedStart = new Date(occupation.startTime);
                const newStart = new Date(arrivalTime);
                const newEnd = new Date(departureTime);

                return newEnd <= occupiedStart || newStart >= occupiedEnd;
            });

            if (isFree) {
                return platform;
            }
        }

        // If no platform found, use platform 1 anyway (will create conflict)
        return '1';
    }

    /**
     * Calculate platform utilization
     * @private
     */
    _calculatePlatformUtilization(platforms) {
        const utilization = {};
        
        for (const [platform, occupations] of Object.entries(platforms)) {
            const totalTime = occupations.reduce((sum, occ) => {
                const duration = (new Date(occ.endTime) - new Date(occ.startTime)) / 60000;
                return sum + duration;
            }, 0);
            
            utilization[platform] = {
                occupations: occupations.length,
                totalMinutes: totalTime,
                utilizationPercentage: (totalTime / (24 * 60)) * 100 // Over 24 hours
            };
        }

        return utilization;
    }

    /**
     * Detect platform conflicts
     * @private
     */
    _detectPlatformConflicts(allocation) {
        const conflicts = [];
        const platformMap = {};

        for (const alloc of allocation) {
            if (!platformMap[alloc.platform]) {
                platformMap[alloc.platform] = [];
            }

            // Check for overlaps with existing allocations
            for (const existing of platformMap[alloc.platform]) {
                if (this._timeWindowsOverlap(
                    alloc.arrivalTime, alloc.departureTime,
                    existing.arrivalTime, existing.departureTime
                )) {
                    conflicts.push({
                        platform: alloc.platform,
                        train1: existing.trainNumber,
                        train2: alloc.trainNumber,
                        severity: 'HIGH'
                    });
                }
            }

            platformMap[alloc.platform].push(alloc);
        }

        return conflicts;
    }

    /**
     * Check if time windows overlap
     * @private
     */
    _timeWindowsOverlap(start1, end1, start2, end2) {
        const s1 = new Date(start1);
        const e1 = new Date(end1);
        const s2 = new Date(start2);
        const e2 = new Date(end2);

        return s1 < e2 && s2 < e1;
    }

    /**
     * Compare simulation results
     * @private
     */
    _compareResults(results) {
        return {
            bestThroughput: Math.max(...results.map(r => r.totalThroughput)),
            fewestConflicts: Math.min(...results.map(r => r.totalConflicts)),
            highestEfficiency: Math.max(...results.map(r => r.efficiency))
        };
    }

    /**
     * Recommend best scenario
     * @private
     */
    _recommendBestScenario(results) {
        // Score each scenario
        const scored = results.map(result => ({
            scenarioName: result.scenarioName,
            score: result.efficiency - (result.totalConflicts * 2) + (result.totalThroughput * 5)
        }));

        const best = scored.reduce((prev, current) => 
            (prev.score > current.score) ? prev : current
        );

        return {
            recommendedScenario: best.scenarioName,
            score: best.score,
            reason: 'Best balance of throughput, efficiency, and minimal conflicts'
        };
    }

    /**
     * Generate performance recommendations
     * @private
     */
    _generatePerformanceRecommendations(results) {
        const recommendations = [];

        if (results.totalConflicts > 5) {
            recommendations.push('High conflict rate - consider adjusting train schedules');
        }

        if (results.efficiency < 70) {
            recommendations.push('Low efficiency - review section capacity and train priorities');
        }

        if (results.avgTrainsInTransit < 2) {
            recommendations.push('Low utilization - section can handle more traffic');
        }

        return recommendations;
    }
}

module.exports = new SimulationService();
