// report.routes.js
// Routes for reporting endpoints.

const express = require('express');
const router = express.Router();
const reportController = require('../controllers/report.controller');

router.get('/dashboard', reportController.getDashboard);
router.get('/recent-trips', reportController.getRecentTrips);
router.get('/recent-maintenance', reportController.getRecentMaintenance);
router.get('/recent-fuel', reportController.getRecentFuel);

module.exports = router;
