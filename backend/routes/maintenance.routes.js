// maintenance.routes.js
// Maps /api/maintenance endpoints to controller handlers.

const express = require('express');
const router = express.Router();
const maintenanceController = require('../controllers/maintenance.controller');

router.get('/', maintenanceController.getAllMaintenance);
router.get('/:id', maintenanceController.getMaintenanceById);
router.post('/', maintenanceController.createMaintenance);
router.put('/:id', maintenanceController.updateMaintenance);
router.delete('/:id', maintenanceController.deleteMaintenance);

module.exports = router;
