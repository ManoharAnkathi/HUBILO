/**
 * Railway Train Routes
 */

const express = require('express');
const router = express.Router();
const trainController = require('../controllers/trains');

// Train CRUD routes
router.get('/', trainController.getAllTrains);
router.get('/statistics', trainController.getTrainStatistics);
router.get('/:id', trainController.getTrain);
router.post('/', trainController.createTrain);
router.put('/:id', trainController.updateTrain);
router.delete('/:id', trainController.deleteTrain);

// Train operations
router.post('/:id/position', trainController.updatePosition);
router.post('/:id/delay', trainController.addDelay);

// Section-specific train queries
router.get('/section/:sectionId', trainController.getTrainsBySection);

module.exports = router;
