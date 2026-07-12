// fuel.controller.js
// Business logic for FuelLogs.

const FuelModel = require('../models/fuel.model');

function validateFuelData(body, requireAll = true) {
  const errors = [];
  const { vehicle_id, fuel_type, litres, fuel_cost, fuel_date } = body;

  if (requireAll || vehicle_id !== undefined) {
    if (vehicle_id === undefined || vehicle_id === null || Number(vehicle_id) <= 0) {
      errors.push('vehicle_id is required and must be greater than 0.');
    }
  }

  if (requireAll || fuel_type !== undefined) {
    if (!fuel_type || !fuel_type.toString().trim()) {
      errors.push('fuel_type is required.');
    }
  }

  if (requireAll || litres !== undefined) {
    const parsedLitres = Number(litres);
    if (litres === undefined || litres === null || Number.isNaN(parsedLitres) || parsedLitres <= 0) {
      errors.push('litres must be greater than 0.');
    }
  }

  if (requireAll || fuel_cost !== undefined) {
    const parsedCost = Number(fuel_cost);
    if (fuel_cost === undefined || fuel_cost === null || Number.isNaN(parsedCost) || parsedCost <= 0) {
      errors.push('fuel_cost must be greater than 0.');
    }
  }

  if (requireAll || fuel_date !== undefined) {
    if (!fuel_date) {
      errors.push('fuel_date is required.');
    } else {
      const date = new Date(fuel_date);
      if (Number.isNaN(date.getTime())) {
        errors.push('fuel_date must be a valid date.');
      }
    }
  }

  return errors;
}

exports.getAllFuelLogs = async (req, res) => {
  try {
    const data = await FuelModel.getAll();
    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('getAllFuelLogs error:', error);
    return res.status(500).json({ success: false, message: 'Database error while fetching fuel logs.' });
  }
};

exports.getFuelLogById = async (req, res) => {
  try {
    const fuelLog = await FuelModel.getById(req.params.id);
    if (!fuelLog) {
      return res.status(404).json({ success: false, message: 'Fuel log not found.' });
    }

    return res.status(200).json({ success: true, data: fuelLog });
  } catch (error) {
    console.error('getFuelLogById error:', error);
    return res.status(500).json({ success: false, message: 'Database error while fetching fuel log.' });
  }
};

exports.createFuelLog = async (req, res) => {
  try {
    const errors = validateFuelData(req.body, true);
    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: errors.join(' ') });
    }

    const vehicle = await FuelModel.getVehicleById(req.body.vehicle_id);
    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Vehicle not found.' });
    }

    const payload = {
      vehicle_id: Number(req.body.vehicle_id),
      fuel_type: req.body.fuel_type.trim(),
      litres: Number(req.body.litres),
      fuel_cost: Number(req.body.fuel_cost),
      fuel_date: req.body.fuel_date,
    };

    const insertId = await FuelModel.create(payload);
    const newFuelLog = await FuelModel.getById(insertId);
    return res.status(201).json({ success: true, data: newFuelLog });
  } catch (error) {
    console.error('createFuelLog error:', error);
    return res.status(500).json({ success: false, message: 'Database error while creating fuel log.' });
  }
};

exports.updateFuelLog = async (req, res) => {
  try {
    const fuelLog = await FuelModel.getById(req.params.id);
    if (!fuelLog) {
      return res.status(404).json({ success: false, message: 'Fuel log not found.' });
    }

    const errors = validateFuelData(req.body, false);
    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: errors.join(' ') });
    }

    if (req.body.vehicle_id !== undefined) {
      const vehicle = await FuelModel.getVehicleById(req.body.vehicle_id);
      if (!vehicle) {
        return res.status(404).json({ success: false, message: 'Vehicle not found.' });
      }
    }

    const affectedRows = await FuelModel.update(req.params.id, req.body);
    if (affectedRows === 0) {
      return res.status(400).json({ success: false, message: 'No valid fields provided to update.' });
    }

    const updated = await FuelModel.getById(req.params.id);
    return res.status(200).json({ success: true, data: updated });
  } catch (error) {
    console.error('updateFuelLog error:', error);
    return res.status(500).json({ success: false, message: 'Database error while updating fuel log.' });
  }
};

exports.deleteFuelLog = async (req, res) => {
  try {
    const fuelLog = await FuelModel.getById(req.params.id);
    if (!fuelLog) {
      return res.status(404).json({ success: false, message: 'Fuel log not found.' });
    }

    await FuelModel.delete(req.params.id);
    return res.status(200).json({ success: true, data: { message: 'Fuel log deleted successfully.' } });
  } catch (error) {
    console.error('deleteFuelLog error:', error);
    return res.status(500).json({ success: false, message: 'Database error while deleting fuel log.' });
  }
};
