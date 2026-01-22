/**
 * Railway Section Routes
 */

const express = require('express');
const router = express.Router();
const sectionController = require('../controllers/sections');

// Section CRUD routes
router.get('/', sectionController.getAllSections);
router.get('/:id', sectionController.getSection);
router.post('/', sectionController.createSection);
router.put('/:id', sectionController.updateSection);
router.delete('/:id', sectionController.deleteSection);

// Section operations
router.get('/:id/capacity', sectionController.getCapacityStatus);
router.get('/:id/crossings', sectionController.getCrossingPoints);
router.get('/:id/statistics', sectionController.getSectionStatistics);

module.exports = router;
