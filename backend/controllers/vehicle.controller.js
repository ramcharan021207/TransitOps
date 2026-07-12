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
exports.getAllVehicles = async (req, res) => {
  try {
    const data = await VehicleModel.getAll();
    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('getAllVehicles error:', error);
    return res.status(500).json({ success: false, message: 'Database error while fetching vehicles.' });
  }
};

// ─── GET /api/vehicles/:id ────────────────────────────────────────────────────
exports.getVehicleById = async (req, res) => {
  try {
    const vehicle = await VehicleModel.getById(req.params.id);
    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Vehicle not found.' });
    }
    return res.status(200).json({ success: true, data: vehicle });
  } catch (error) {
    console.error('getVehicleById error:', error);
    return res.status(500).json({ success: false, message: 'Database error while fetching vehicle.' });
  }
};

// ─── POST /api/vehicles ───────────────────────────────────────────────────────
exports.createVehicle = async (req, res) => {
  try {
    // Validation
    const errors = validateVehicleData(req.body, true);
    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: errors.join(' ') });
    }

    // Check registration uniqueness
    const existing = await VehicleModel.findByRegistration(req.body.registration_number);
    if (existing) {
      return res.status(409).json({ success: false, message: 'Registration already exists.' });
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

    return res.status(201).json({ success: true, data: newVehicle });
  } catch (error) {
    console.error('createVehicle error:', error);
    return res.status(500).json({ success: false, message: 'Database error while creating vehicle.' });
  }
};

// ─── PUT /api/vehicles/:id ────────────────────────────────────────────────────
exports.updateVehicle = async (req, res) => {
  try {
    const vehicle = await VehicleModel.getById(req.params.id);
    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Vehicle not found.' });
    }

    // Partial validation (requireAll = false)
    const errors = validateVehicleData(req.body, false);
    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: errors.join(' ') });
    }

    // Check registration uniqueness (exclude current vehicle)
    if (req.body.registration_number) {
      const existing = await VehicleModel.findByRegistration(req.body.registration_number, req.params.id);
      if (existing) {
        return res.status(409).json({ success: false, message: 'Registration already exists.' });
      }
    }

    const affectedRows = await VehicleModel.update(req.params.id, req.body);
    if (affectedRows === 0) {
      return res.status(400).json({ success: false, message: 'No valid fields provided to update.' });
    }

    const updated = await VehicleModel.getById(req.params.id);
    return res.status(200).json({ success: true, data: updated });
  } catch (error) {
    console.error('updateVehicle error:', error);
    return res.status(500).json({ success: false, message: 'Database error while updating vehicle.' });
  }
};

// ─── DELETE /api/vehicles/:id ─────────────────────────────────────────────────
exports.deleteVehicle = async (req, res) => {
  try {
    const vehicle = await VehicleModel.getById(req.params.id);
    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Vehicle not found.' });
    }

    await VehicleModel.delete(req.params.id);
    return res.status(200).json({ success: true, data: { message: 'Vehicle deleted successfully.' } });
  } catch (error) {
    console.error('deleteVehicle error:', error);
    return res.status(500).json({ success: false, message: 'Database error while deleting vehicle.' });
  }
};
