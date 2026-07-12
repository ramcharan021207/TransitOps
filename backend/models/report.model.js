// report.model.js
// Data-access layer for reporting endpoints.

const db = require('../config/db');

class ReportModel {
  static async getDashboardStats() {
    const [rows] = await db.query(`
      SELECT
        (SELECT COUNT(*) FROM Vehicles) AS totalVehicles,
        (SELECT COUNT(*) FROM Vehicles WHERE status = 'Available') AS availableVehicles,
        (SELECT COUNT(*) FROM Vehicles WHERE status = 'In Shop') AS vehiclesInMaintenance,
        (SELECT COUNT(*) FROM Trips WHERE status IN ('Scheduled', 'In Progress')) AS activeTrips,
        (SELECT COUNT(*) FROM Drivers WHERE status = 'Available') AS driversAvailable,
        (SELECT COALESCE(SUM(fuel_cost), 0) FROM FuelLogs) AS totalFuelCost,
        (SELECT COALESCE(SUM(expense_amount), 0) FROM Expenses) AS totalExpenses,
        (SELECT ROUND((SUM(CASE WHEN status = 'Available' THEN 1 ELSE 0 END) / COUNT(*)) * 100, 2) FROM Vehicles) AS fleetUtilization
    `);

    return rows[0];
  }

  static async getRecentTrips(limit = 10) {
    const [rows] = await db.query(
      `SELECT * FROM Trips ORDER BY start_time DESC, trip_id DESC LIMIT ?`,
      [limit]
    );
    return rows;
  }

  static async getRecentMaintenance(limit = 10) {
    const [rows] = await db.query(
      `SELECT * FROM Maintenance ORDER BY maintenance_date DESC, maintenance_id DESC LIMIT ?`,
      [limit]
    );
    return rows;
  }

  static async getRecentFuel(limit = 10) {
    const [rows] = await db.query(
      `SELECT * FROM FuelLogs ORDER BY fuel_date DESC, fuel_id DESC LIMIT ?`,
      [limit]
    );
    return rows;
  }
}

module.exports = ReportModel;
