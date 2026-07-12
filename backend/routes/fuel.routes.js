// fuel.routes.js
// Maps /api/fuel endpoints to controller handlers.

const express = require('express');
const router = express.Router();
const fuelController = require('../controllers/fuel.controller');

router.get('/', fuelController.getAllFuelLogs);
router.get('/:id', fuelController.getFuelLogById);
router.post('/', fuelController.createFuelLog);
router.put('/:id', fuelController.updateFuelLog);
router.delete('/:id', fuelController.deleteFuelLog);

module.exports = router;
