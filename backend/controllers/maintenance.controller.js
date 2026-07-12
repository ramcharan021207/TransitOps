// maintenance.controller.js
// Business logic for the Maintenance module.

const MaintenanceModel = require('../models/maintenance.model');

const VALID_STATUSES = ['Pending', 'In Progress', 'Completed', 'Cancelled'];

function validateMaintenanceData(body, requireAll = true) {
  const errors = [];
  const { vehicle_id, service_type, cost, maintenance_date, status } = body;

  if (requireAll || vehicle_id !== undefined) {
    if (vehicle_id === undefined || vehicle_id === null || Number(vehicle_id) <= 0) {
      errors.push('vehicle_id is required and must be greater than 0.');
    }
  }

  if (requireAll || service_type !== undefined) {
    if (!service_type || !service_type.toString().trim()) {
      errors.push('service_type is required.');
    }
  }

  if (requireAll || cost !== undefined) {
    const parsedCost = Number(cost);
    if (cost === undefined || cost === null || Number.isNaN(parsedCost) || parsedCost < 0) {
      errors.push('cost must be a valid non-negative number.');
    }
  }

  if (requireAll || maintenance_date !== undefined) {
    if (!maintenance_date) {
      errors.push('maintenance_date is required.');
    } else {
      const date = new Date(maintenance_date);
      if (Number.isNaN(date.getTime())) {
        errors.push('maintenance_date must be a valid date.');
      }
    }
  }

  if (requireAll || status !== undefined) {
    if (!status || !VALID_STATUSES.includes(status)) {
      errors.push('status must be one of: Pending, In Progress, Completed, Cancelled.');
    }
  }

  return errors;
}

exports.getAllMaintenance = async (req, res, next) => {
  try {
    const data = await MaintenanceModel.getAll();
    return res.success(data);
  } catch (error) {
    console.error('getAllMaintenance error:', error);
    return next(error);
  }
};

exports.getMaintenanceById = async (req, res, next) => {
  try {
    const maintenance = await MaintenanceModel.getById(req.params.id);
    if (!maintenance) {
      return res.failure('Maintenance record not found.', 404);
    }

    return res.success(maintenance);
  } catch (error) {
    console.error('getMaintenanceById error:', error);
    return next(error);
  }
};

exports.createMaintenance = async (req, res, next) => {
  try {
    const errors = validateMaintenanceData(req.body, true);
    if (errors.length > 0) {
      return res.failure(errors.join(' '), 400);
    }

    const vehicle = await MaintenanceModel.getVehicleById(req.body.vehicle_id);
    if (!vehicle) {
      return res.failure('Vehicle not found.', 404);
    }

    const payload = {
      vehicle_id: Number(req.body.vehicle_id),
      service_type: req.body.service_type.trim(),
      cost: Number(req.body.cost),
      maintenance_date: req.body.maintenance_date,
      status: req.body.status || 'Pending',
    };

    const insertId = await MaintenanceModel.create(payload);
    const targetVehicleStatus = payload.status === 'Completed' ? 'Available' : 'In Shop';
    await MaintenanceModel.updateVehicleStatus(payload.vehicle_id, targetVehicleStatus);

    const newMaintenance = await MaintenanceModel.getById(insertId);
    return res.success(newMaintenance, 201);
  } catch (error) {
    console.error('createMaintenance error:', error);
    return next(error);
  }
};

exports.updateMaintenance = async (req, res, next) => {
  try {
    const maintenance = await MaintenanceModel.getById(req.params.id);
    if (!maintenance) {
      return res.failure('Maintenance record not found.', 404);
    }

    const errors = validateMaintenanceData(req.body, false);
    if (errors.length > 0) {
      return res.failure(errors.join(' '), 400);
    }

    if (req.body.vehicle_id !== undefined) {
      const vehicle = await MaintenanceModel.getVehicleById(req.body.vehicle_id);
      if (!vehicle) {
        return res.failure('Vehicle not found.', 404);
      }
    }

    const affectedRows = await MaintenanceModel.update(req.params.id, req.body);
    if (affectedRows === 0) {
      return res.failure('No valid fields provided to update.', 400);
    }

    const nextStatus = req.body.status !== undefined ? req.body.status : maintenance.status;
    if (nextStatus === 'Completed') {
      await MaintenanceModel.updateVehicleStatus(maintenance.vehicle_id, 'Available');
    }

    const updated = await MaintenanceModel.getById(req.params.id);
    return res.success(updated);
  } catch (error) {
    console.error('updateMaintenance error:', error);
    return next(error);
  }
};

exports.deleteMaintenance = async (req, res, next) => {
  try {
    const maintenance = await MaintenanceModel.getById(req.params.id);
    if (!maintenance) {
      return res.failure('Maintenance record not found.', 404);
    }

    await MaintenanceModel.delete(req.params.id);
    return res.success({ message: 'Maintenance record deleted successfully.' });
  } catch (error) {
    console.error('deleteMaintenance error:', error);
    return next(error);
  }
};
