// vehicle.controller.js
// Business logic layer: validates input, calls VehicleModel, returns JSON.

const VehicleModel = require('../models/vehicle.model');

const VALID_STATUSES = ['Available', 'On Trip', 'In Shop', 'Retired'];

// ─── Validation Helper ────────────────────────────────────────────────────────
function validateVehicleData(body, requireAll = true) {
  const errors = [];

  const {
    registration_number,
    vehicle_name,
    maximum_capacity,
    odometer,
    acquisition_cost,
    status,
  } = body;

  if (requireAll || registration_number !== undefined) {
    if (!registration_number || !registration_number.toString().trim()) {
      errors.push('registration_number is required.');
    }
  }

  if (requireAll || vehicle_name !== undefined) {
    if (!vehicle_name || !vehicle_name.toString().trim()) {
      errors.push('vehicle_name is required.');
    }
  }

  if (requireAll || maximum_capacity !== undefined) {
    if (maximum_capacity === undefined || maximum_capacity === null || Number(maximum_capacity) <= 0) {
      errors.push('maximum_capacity must be greater than 0.');
    }
  }

  if (odometer !== undefined && Number(odometer) < 0) {
    errors.push('odometer must be >= 0.');
  }

  if (acquisition_cost !== undefined && Number(acquisition_cost) < 0) {
    errors.push('acquisition_cost must be >= 0.');
  }

  if (requireAll || status !== undefined) {
    if (status && !VALID_STATUSES.includes(status)) {
      errors.push('status must be one of: Available, On Trip, In Shop, Retired.');
    }
  }

  return errors;
}

// ─── GET /api/vehicles ────────────────────────────────────────────────────────
exports.getAllVehicles = async (req, res, next) => {
  try {
    const data = await VehicleModel.getAll();
    return res.success(data);
  } catch (error) {
    console.error('getAllVehicles error:', error);
    return next(error);
  }
};

// ─── GET /api/vehicles/:id ────────────────────────────────────────────────────
exports.getVehicleById = async (req, res, next) => {
  try {
    const vehicle = await VehicleModel.getById(req.params.id);
    if (!vehicle) {
      return res.failure('Vehicle not found.', 404);
    }
    return res.success(vehicle);
  } catch (error) {
    console.error('getVehicleById error:', error);
    return next(error);
  }
};

// ─── POST /api/vehicles ───────────────────────────────────────────────────────
exports.createVehicle = async (req, res, next) => {
  try {
    const errors = validateVehicleData(req.body, true);
    if (errors.length > 0) {
      return res.failure(errors.join(' '), 400);
    }

    const existing = await VehicleModel.findByRegistration(req.body.registration_number);
    if (existing) {
      return res.failure('Registration already exists.', 409);
    }

    // Set defaults for optional numeric fields
    const payload = {
      registration_number: req.body.registration_number.trim(),
      vehicle_name:        req.body.vehicle_name.trim(),
      vehicle_type:        req.body.vehicle_type || null,
      maximum_capacity:    Number(req.body.maximum_capacity),
      odometer:            req.body.odometer !== undefined ? Number(req.body.odometer) : 0,
      acquisition_cost:    req.body.acquisition_cost !== undefined ? Number(req.body.acquisition_cost) : 0,
      status:              req.body.status || 'Available',
    };

    const insertId = await VehicleModel.create(payload);
    const newVehicle = await VehicleModel.getById(insertId);

    return res.success(newVehicle, 201);
  } catch (error) {
    console.error('createVehicle error:', error);
    return next(error);
  }
};

// ─── PUT /api/vehicles/:id ────────────────────────────────────────────────────
exports.updateVehicle = async (req, res, next) => {
  try {
    const vehicle = await VehicleModel.getById(req.params.id);
    if (!vehicle) {
      return res.failure('Vehicle not found.', 404);
    }

    const errors = validateVehicleData(req.body, false);
    if (errors.length > 0) {
      return res.failure(errors.join(' '), 400);
    }

    if (req.body.registration_number) {
      const existing = await VehicleModel.findByRegistration(req.body.registration_number, req.params.id);
      if (existing) {
        return res.failure('Registration already exists.', 409);
      }
    }

    const affectedRows = await VehicleModel.update(req.params.id, req.body);
    if (affectedRows === 0) {
      return res.failure('No valid fields provided to update.', 400);
    }

    const updated = await VehicleModel.getById(req.params.id);
    return res.success(updated);
  } catch (error) {
    console.error('updateVehicle error:', error);
    return next(error);
  }
};

// ─── DELETE /api/vehicles/:id ─────────────────────────────────────────────────
exports.deleteVehicle = async (req, res, next) => {
  try {
    const vehicle = await VehicleModel.getById(req.params.id);
    if (!vehicle) {
      return res.failure('Vehicle not found.', 404);
    }

    await VehicleModel.delete(req.params.id);
    return res.success({ message: 'Vehicle deleted successfully.' });
  } catch (error) {
    console.error('deleteVehicle error:', error);
    return next(error);
  }
};
