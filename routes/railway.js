/**
 * Railway Traffic Optimization Routes
 */

const express = require('express');
const router = express.Router();
const optimizationController = require('../controllers/optimization');

// Conflict detection and resolution
router.get('/conflicts', optimizationController.getAllConflicts);
router.post('/conflicts/:sectionId/detect', optimizationController.detectConflicts);
router.get('/conflicts/:conflictId/recommendations', optimizationController.getAIRecommendations);
router.post('/conflicts/:conflictId/resolve', optimizationController.resolveConflict);

// Optimization
router.post('/precedence/:sectionId', optimizationController.optimizePrecedence);
router.post('/crossing/calculate', optimizationController.calculateCrossing);

// Simulation
router.post('/simulation/run', optimizationController.runSimulation);
router.post('/simulation/compare', optimizationController.compareScenarios);
router.post('/simulation/delay', optimizationController.simulateDelay);
router.post('/simulation/platform', optimizationController.simulatePlatformAllocation);

module.exports = router;
