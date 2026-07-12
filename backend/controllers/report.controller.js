// report.controller.js
// Business logic for reporting endpoints.

const ReportModel = require('../models/report.model');

exports.getDashboard = async (req, res) => {
  try {
    const data = await ReportModel.getDashboardStats();
    return res.status(200).json(data);
  } catch (error) {
    console.error('getDashboard error:', error);
    return res.status(500).json({ success: false, message: 'Database error while fetching dashboard report.' });
  }
};

exports.getRecentTrips = async (req, res) => {
  try {
    const data = await ReportModel.getRecentTrips(10);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('getRecentTrips error:', error);
    return res.status(500).json({ success: false, message: 'Database error while fetching recent trips.' });
  }
};

exports.getRecentMaintenance = async (req, res) => {
  try {
    const data = await ReportModel.getRecentMaintenance(10);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('getRecentMaintenance error:', error);
    return res.status(500).json({ success: false, message: 'Database error while fetching recent maintenance.' });
  }
};

exports.getRecentFuel = async (req, res) => {
  try {
    const data = await ReportModel.getRecentFuel(10);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('getRecentFuel error:', error);
    return res.status(500).json({ success: false, message: 'Database error while fetching recent fuel logs.' });
  }
};
