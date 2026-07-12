// report.controller.js
// Business logic for reporting endpoints.

const ReportModel = require('../models/report.model');

exports.getDashboard = async (req, res, next) => {
  try {
    const data = await ReportModel.getDashboardStats();
    return res.success(data);
  } catch (error) {
    console.error('getDashboard error:', error);
    return next(error);
  }
};

exports.getRecentTrips = async (req, res, next) => {
  try {
    const data = await ReportModel.getRecentTrips(10);
    return res.success(data);
  } catch (error) {
    console.error('getRecentTrips error:', error);
    return next(error);
  }
};

exports.getRecentMaintenance = async (req, res, next) => {
  try {
    const data = await ReportModel.getRecentMaintenance(10);
    return res.success(data);
  } catch (error) {
    console.error('getRecentMaintenance error:', error);
    return next(error);
  }
};

exports.getRecentFuel = async (req, res, next) => {
  try {
    const data = await ReportModel.getRecentFuel(10);
    return res.success(data);
  } catch (error) {
    console.error('getRecentFuel error:', error);
    return next(error);
  }
};
