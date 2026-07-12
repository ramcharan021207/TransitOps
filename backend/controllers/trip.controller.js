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
exports.getAllTrips = async (req, res, next) => {
  try {
    const data = await TripModel.getAll();
    return res.success(data);
  } catch (error) {
    console.error('getAllTrips error:', error);
    return next(error);
  }
};

// ─── GET /api/trips/:id ───────────────────────────────────────────────────────
exports.getTripById = async (req, res, next) => {
  try {
    const trip = await TripModel.getById(req.params.id);
    if (!trip) {
      return res.failure('Trip not found.', 404);
    }
    return res.success(trip);
  } catch (error) {
    console.error('getTripById error:', error);
    return next(error);
  }
};

// ─── POST /api/trips ──────────────────────────────────────────────────────────
exports.createTrip = async (req, res, next) => {
  try {
    const errors = validateTripData(req.body, true);
    if (errors.length > 0) {
      return res.failure(errors.join(' '), 400);
    }

    const { vehicle_id, driver_id } = req.body;

    // 2. Vehicle must exist and be Available
    const vehicle = await TripModel.getVehicleStatus(vehicle_id);
    if (!vehicle) {
      return res.failure('Vehicle not found.', 404);
    }
    if (vehicle.status !== 'Available') {
      return res.status(409).json({
        success: false,
        message: `Vehicle is not available. Current status: ${vehicle.status}.`,
      });
    }

    // 3. Driver must exist and be Available
    const driver = await TripModel.getDriverStatus(driver_id);
    if (!driver) {
      return res.failure('Driver not found.', 404);
    }
    if (driver.status !== 'Available') {
      return res.status(409).json({
        success: false,
        message: `Driver is not available. Current status: ${driver.status}.`,
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
    return res.success(newTrip, 201);
  } catch (error) {
    console.error('createTrip error:', error);
    return next(error);
  }
};

// ─── PUT /api/trips/:id ───────────────────────────────────────────────────────
exports.updateTrip = async (req, res, next) => {
  try {
    const trip = await TripModel.getById(req.params.id);
    if (!trip) {
      return res.failure('Trip not found.', 404);
    }

    const errors = validateTripData(req.body, false);
    if (errors.length > 0) {
      return res.failure(errors.join(' '), 400);
    }

    const newStatus = req.body.status;

    // 3. Handle vehicle/driver availability if reassigning
    if (req.body.vehicle_id && req.body.vehicle_id !== trip.vehicle_id) {
      const vehicle = await TripModel.getVehicleStatus(req.body.vehicle_id);
      if (!vehicle) {
        return res.failure('Vehicle not found.', 404);
      }
      if (vehicle.status !== 'Available') {
        return res.status(409).json({
          success: false,
          message: `Vehicle is not available. Current status: ${vehicle.status}.`,
        });
      }
    }

    if (req.body.driver_id && req.body.driver_id !== trip.driver_id) {
      const driver = await TripModel.getDriverStatus(req.body.driver_id);
      if (!driver) {
        return res.failure('Driver not found.', 404);
      }
      if (driver.status !== 'Available') {
        return res.status(409).json({
          success: false,
          message: `Driver is not available. Current status: ${driver.status}.`,
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
      return res.failure('No valid fields provided to update.', 400);
    }

    const updated = await TripModel.getById(req.params.id);
    return res.success(updated);
  } catch (error) {
    console.error('updateTrip error:', error);
    return next(error);
  }
};

// ─── DELETE /api/trips/:id ────────────────────────────────────────────────────
exports.deleteTrip = async (req, res, next) => {
  try {
    const trip = await TripModel.getById(req.params.id);
    if (!trip) {
      return res.failure('Trip not found.', 404);
    }

    if (trip.status === 'In Progress') {
      return res.failure('Cannot delete a trip that is currently In Progress. Complete or cancel it first.', 409);
    }

    await TripModel.delete(req.params.id);
    return res.success({ message: 'Trip deleted successfully.' });
  } catch (error) {
    console.error('deleteTrip error:', error);
    return next(error);
  }
};
