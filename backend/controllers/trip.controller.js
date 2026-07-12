// trip.controller.js
// Business logic for Trip Management.
// Enforces vehicle/driver availability rules and drives status transitions.

const TripModel = require('../models/trip.model');

// Valid trip lifecycle statuses
const VALID_STATUSES = ['Scheduled', 'In Progress', 'Completed', 'Cancelled'];

// ─── Validation Helper ────────────────────────────────────────────────────────
function validateTripData(body, requireAll = true) {
  const errors = [];
  const { vehicle_id, driver_id, origin, destination, start_time, status } = body;

  if (requireAll || vehicle_id !== undefined) {
    if (!vehicle_id || isNaN(Number(vehicle_id))) {
      errors.push('vehicle_id is required and must be a number.');
    }
  }
  if (requireAll || driver_id !== undefined) {
    if (!driver_id || isNaN(Number(driver_id))) {
      errors.push('driver_id is required and must be a number.');
    }
  }
  if (requireAll || origin !== undefined) {
    if (!origin || !origin.toString().trim()) {
      errors.push('origin is required.');
    }
  }
  if (requireAll || destination !== undefined) {
    if (!destination || !destination.toString().trim()) {
      errors.push('destination is required.');
    }
  }
  if (requireAll || start_time !== undefined) {
    if (!start_time) {
      errors.push('start_time is required.');
    } else if (isNaN(new Date(start_time).getTime())) {
      errors.push('start_time must be a valid datetime.');
    }
  }
  if (status !== undefined && !VALID_STATUSES.includes(status)) {
    errors.push('status must be one of: Scheduled, In Progress, Completed, Cancelled.');
  }

  return errors;
}

// ─── GET /api/trips ───────────────────────────────────────────────────────────
exports.getAllTrips = async (req, res) => {
  try {
    const data = await TripModel.getAll();
    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('getAllTrips error:', error);
    return res.status(500).json({ success: false, message: 'Database error while fetching trips.' });
  }
};

// ─── GET /api/trips/:id ───────────────────────────────────────────────────────
exports.getTripById = async (req, res) => {
  try {
    const trip = await TripModel.getById(req.params.id);
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found.' });
    }
    return res.status(200).json({ success: true, data: trip });
  } catch (error) {
    console.error('getTripById error:', error);
    return res.status(500).json({ success: false, message: 'Database error while fetching trip.' });
  }
};

// ─── POST /api/trips ──────────────────────────────────────────────────────────
exports.createTrip = async (req, res) => {
  try {
    // 1. Validate required fields
    const errors = validateTripData(req.body, true);
    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: errors.join(' ') });
    }

    const { vehicle_id, driver_id } = req.body;

    // 2. Vehicle must exist and be Available
    const vehicle = await TripModel.getVehicleStatus(vehicle_id);
    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Vehicle not found.' });
    }
    if (vehicle.status !== 'Available') {
      return res.status(409).json({
        success: false,
        message: Vehicle is not available. Current status: .,
      });
    }

    // 3. Driver must exist and be Available
    const driver = await TripModel.getDriverStatus(driver_id);
    if (!driver) {
      return res.status(404).json({ success: false, message: 'Driver not found.' });
    }
    if (driver.status !== 'Available') {
      return res.status(409).json({
        success: false,
        message: Driver is not available. Current status: .,
      });
    }

    // 4. Create the trip (status defaults to Scheduled in model)
    const insertId = await TripModel.create(req.body);

    // 5. If trip starts immediately (In Progress), flip statuses
    if (req.body.status === 'In Progress') {
      await TripModel.setVehicleStatus(vehicle_id, 'On Trip');
      await TripModel.setDriverStatus(driver_id, 'On Trip');
    }

    const newTrip = await TripModel.getById(insertId);
    return res.status(201).json({ success: true, data: newTrip });
  } catch (error) {
    console.error('createTrip error:', error);
    return res.status(500).json({ success: false, message: 'Database error while creating trip.' });
  }
};

// ─── PUT /api/trips/:id ───────────────────────────────────────────────────────
exports.updateTrip = async (req, res) => {
  try {
    // 1. Trip must exist
    const trip = await TripModel.getById(req.params.id);
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found.' });
    }

    // 2. Partial validation
    const errors = validateTripData(req.body, false);
    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: errors.join(' ') });
    }

    const newStatus = req.body.status;

    // 3. Handle vehicle/driver availability if reassigning
    if (req.body.vehicle_id && req.body.vehicle_id !== trip.vehicle_id) {
      const vehicle = await TripModel.getVehicleStatus(req.body.vehicle_id);
      if (!vehicle) {
        return res.status(404).json({ success: false, message: 'Vehicle not found.' });
      }
      if (vehicle.status !== 'Available') {
        return res.status(409).json({
          success: false,
          message: Vehicle is not available. Current status: .,
        });
      }
    }

    if (req.body.driver_id && req.body.driver_id !== trip.driver_id) {
      const driver = await TripModel.getDriverStatus(req.body.driver_id);
      if (!driver) {
        return res.status(404).json({ success: false, message: 'Driver not found.' });
      }
      if (driver.status !== 'Available') {
        return res.status(409).json({
          success: false,
          message: Driver is not available. Current status: .,
        });
      }
    }

    // 4. Status transition side-effects
    if (newStatus && newStatus !== trip.status) {
      const vehicleId = req.body.vehicle_id || trip.vehicle_id;
      const driverId  = req.body.driver_id  || trip.driver_id;

      if (newStatus === 'In Progress') {
        // Trip is starting: lock the vehicle and driver
        await TripModel.setVehicleStatus(vehicleId, 'On Trip');
        await TripModel.setDriverStatus(driverId, 'On Trip');
      } else if (newStatus === 'Completed' || newStatus === 'Cancelled') {
        // Trip is ending: release the vehicle and driver
        await TripModel.setVehicleStatus(vehicleId, 'Available');
        await TripModel.setDriverStatus(driverId, 'Available');
      }
    }

    // 5. Persist the update
    const affectedRows = await TripModel.update(req.params.id, req.body);
    if (affectedRows === 0) {
      return res.status(400).json({ success: false, message: 'No valid fields provided to update.' });
    }

    const updated = await TripModel.getById(req.params.id);
    return res.status(200).json({ success: true, data: updated });
  } catch (error) {
    console.error('updateTrip error:', error);
    return res.status(500).json({ success: false, message: 'Database error while updating trip.' });
  }
};

// ─── DELETE /api/trips/:id ────────────────────────────────────────────────────
exports.deleteTrip = async (req, res) => {
  try {
    const trip = await TripModel.getById(req.params.id);
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found.' });
    }

    // Prevent deleting a trip that is actively In Progress
    if (trip.status === 'In Progress') {
      return res.status(409).json({
        success: false,
        message: 'Cannot delete a trip that is currently In Progress. Complete or cancel it first.',
      });
    }

    await TripModel.delete(req.params.id);
    return res.status(200).json({ success: true, data: { message: 'Trip deleted successfully.' } });
  } catch (error) {
    console.error('deleteTrip error:', error);
    return res.status(500).json({ success: false, message: 'Database error while deleting trip.' });
  }
};
