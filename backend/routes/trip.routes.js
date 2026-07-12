// trip.routes.js
// Maps all /api/trips endpoints to trip controller handlers.

const express = require('express');
const router  = express.Router();
const tripController = require('../controllers/trip.controller');

// GET    /api/trips        - list all trips
router.get('/',    tripController.getAllTrips);

// GET    /api/trips/:id    - get a single trip by ID
router.get('/:id', tripController.getTripById);

// POST   /api/trips        - create a new trip
router.post('/',   tripController.createTrip);

// PUT    /api/trips/:id    - update / change status of a trip
router.put('/:id', tripController.updateTrip);

// DELETE /api/trips/:id    - delete a trip (not allowed if In Progress)
router.delete('/:id', tripController.deleteTrip);

module.exports = router;
