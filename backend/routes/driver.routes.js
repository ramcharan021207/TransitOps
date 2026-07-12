// driver.routes.js
// Maps /api/drivers endpoints to controller handlers.

const express = require('express');
const router = express.Router();
const driverController = require('../controllers/driver.controller');

// GET    /api/drivers        - list all drivers
router.get('/', driverController.getAllDrivers);

// GET    /api/drivers/:id    - get a single driver
router.get('/:id', driverController.getDriverById);

// POST   /api/drivers        - create a new driver
router.post('/', driverController.createDriver);

// PUT    /api/drivers/:id    - update an existing driver
router.put('/:id', driverController.updateDriver);

// DELETE /api/drivers/:id    - delete a driver
router.delete('/:id', driverController.deleteDriver);

module.exports = router;
