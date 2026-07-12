// driver.controller.js
// Business logic layer: validates input, calls DriverModel, returns JSON.

const DriverModel = require('../models/driver.model');

const VALID_STATUSES = ['Available', 'On Trip', 'Off Duty', 'Suspended'];

// ─── Validation Helper ────────────────────────────────────────────────────────
function validateDriverData(body, requireAll = true) {
  const errors = [];

  const {
    name,
    license_number,
    license_category,
    license_expiry,
    phone,
    safety_score,
    status,
  } = body;

  if (requireAll || name !== undefined) {
    if (!name || !name.toString().trim()) {
      errors.push('name is required.');
    }
  }

  if (requireAll || license_number !== undefined) {
    if (!license_number || !license_number.toString().trim()) {
      errors.push('license_number is required.');
    }
  }

  if (requireAll || license_category !== undefined) {
    if (!license_category || !license_category.toString().trim()) {
      errors.push('license_category is required.');
    }
  }

  if (requireAll || license_expiry !== undefined) {
    if (!license_expiry) {
      errors.push('license_expiry is required.');
    } else {
      const date = new Date(license_expiry);
      if (isNaN(date.getTime())) {
        errors.push('license_expiry must be a valid date (YYYY-MM-DD).');
      }
    }
  }

  if (requireAll || phone !== undefined) {
    if (!phone || !phone.toString().trim()) {
      errors.push('phone is required.');
    }
  }

  if (safety_score !== undefined) {
    const score = Number(safety_score);
    if (isNaN(score) || score < 0 || score > 100) {
      errors.push('safety_score must be between 0 and 100.');
    }
  }

  if (status !== undefined) {
    if (!VALID_STATUSES.includes(status)) {
      errors.push('status must be one of: Available, On Trip, Off Duty, Suspended.');
    }
  }

  return errors;
}

// ─── GET /api/drivers ─────────────────────────────────────────────────────────
exports.getAllDrivers = async (req, res, next) => {
  try {
    const data = await DriverModel.getAll();
    return res.success(data);
  } catch (error) {
    console.error('getAllDrivers error:', error);
    return next(error);
  }
};

// ─── GET /api/drivers/:id ─────────────────────────────────────────────────────
exports.getDriverById = async (req, res, next) => {
  try {
    const driver = await DriverModel.getById(req.params.id);
    if (!driver) {
      return res.failure('Driver not found.', 404);
    }
    return res.success(driver);
  } catch (error) {
    console.error('getDriverById error:', error);
    return next(error);
  }
};

// ─── POST /api/drivers ────────────────────────────────────────────────────────
exports.createDriver = async (req, res, next) => {
  try {
    const errors = validateDriverData(req.body, true);
    if (errors.length > 0) {
      return res.failure(errors.join(' '), 400);
    }

    // License number uniqueness check
    const existingLicense = await DriverModel.findByLicense(req.body.license_number);
    if (existingLicense) {
      return res.failure('License number already exists.', 409);
    }

    const existingPhone = await DriverModel.findByPhone(req.body.phone);
    if (existingPhone) {
      return res.failure('Phone number already exists.', 409);
    }

    const payload = {
      name:             req.body.name.trim(),
      license_number:   req.body.license_number.trim(),
      license_category: req.body.license_category.trim(),
      license_expiry:   req.body.license_expiry,
      phone:            req.body.phone.trim(),
      safety_score:     req.body.safety_score !== undefined ? Number(req.body.safety_score) : 100.00,
      status:           req.body.status || 'Available',
    };

    const insertId = await DriverModel.create(payload);
    const newDriver = await DriverModel.getById(insertId);

    return res.success(newDriver, 201);
  } catch (error) {
    console.error('createDriver error:', error);
    return next(error);
  }
};

// ─── PUT /api/drivers/:id ─────────────────────────────────────────────────────
exports.updateDriver = async (req, res, next) => {
  try {
    const driver = await DriverModel.getById(req.params.id);
    if (!driver) {
      return res.failure('Driver not found.', 404);
    }

    const errors = validateDriverData(req.body, false);
    if (errors.length > 0) {
      return res.failure(errors.join(' '), 400);
    }

    // License uniqueness - exclude current driver
    if (req.body.license_number) {
      const existingLicense = await DriverModel.findByLicense(
        req.body.license_number,
        req.params.id
      );
      if (existingLicense) {
        return res.failure('License number already exists.', 409);
      }
    }

    // Phone uniqueness - exclude current driver
    if (req.body.phone) {
      const existingPhone = await DriverModel.findByPhone(
        req.body.phone,
        req.params.id
      );
      if (existingPhone) {
        return res.failure('Phone number already exists.', 409);
      }
    }

    const affectedRows = await DriverModel.update(req.params.id, req.body);
    if (affectedRows === 0) {
      return res.failure('No valid fields provided to update.', 400);
    }

    const updated = await DriverModel.getById(req.params.id);
    return res.success(updated);
  } catch (error) {
    console.error('updateDriver error:', error);
    return next(error);
  }
};

// ─── DELETE /api/drivers/:id ──────────────────────────────────────────────────
exports.deleteDriver = async (req, res, next) => {
  try {
    const driver = await DriverModel.getById(req.params.id);
    if (!driver) {
      return res.failure('Driver not found.', 404);
    }

    await DriverModel.delete(req.params.id);
    return res.success({ message: 'Driver deleted successfully.' });
  } catch (error) {
    console.error('deleteDriver error:', error);
    return next(error);
  }
};
