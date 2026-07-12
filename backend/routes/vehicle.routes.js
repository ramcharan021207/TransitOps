// vehicle.routes.js
// Registers all /api/vehicles endpoints and maps them to controller handlers.

const express = require('express');
const router  = express.Router();
const vehicleController = require('../controllers/vehicle.controller');

// GET  /api/vehicles        - list all vehicles
router.get('/',    vehicleController.getAllVehicles);

// GET  /api/vehicles/:id    - get a single vehicle
router.get('/:id', vehicleController.getVehicleById);

// POST /api/vehicles        - create a new vehicle
router.post('/',   vehicleController.createVehicle);

// PUT  /api/vehicles/:id    - update an existing vehicle
router.put('/:id', vehicleController.updateVehicle);

// DELETE /api/vehicles/:id  - delete a vehicle
router.delete('/:id', vehicleController.deleteVehicle);

module.exports = router;
