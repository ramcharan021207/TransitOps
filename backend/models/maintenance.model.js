// maintenance.model.js
// Data-access layer for Maintenance records.

const db = require('../config/db');

class MaintenanceModel {
  static async getAll() {
    const [rows] = await db.query('SELECT * FROM Maintenance ORDER BY maintenance_date DESC, maintenance_id DESC');
    return rows;
  }

  static async getById(id) {
    const [rows] = await db.query(
      'SELECT * FROM Maintenance WHERE maintenance_id = ?',
      [id]
    );
    return rows[0];
  }

  static async getVehicleById(vehicleId) {
    const [rows] = await db.query(
      'SELECT vehicle_id, status FROM Vehicles WHERE vehicle_id = ?',
      [vehicleId]
    );
    return rows[0];
  }

  static async updateVehicleStatus(vehicleId, status) {
    const [result] = await db.execute(
      'UPDATE Vehicles SET status = ? WHERE vehicle_id = ?',
      [status, vehicleId]
    );
    return result.affectedRows;
  }

  static async create(data) {
    const { vehicle_id, service_type, cost, maintenance_date, status } = data;

    const sql = `
      INSERT INTO Maintenance (vehicle_id, service_type, cost, maintenance_date, status)
      VALUES (?, ?, ?, ?, ?)
    `;

    const [result] = await db.execute(sql, [
      vehicle_id,
      service_type,
      cost,
      maintenance_date,
      status,
    ]);

    return result.insertId;
  }

  static async update(id, data) {
    const allowed = ['vehicle_id', 'service_type', 'cost', 'maintenance_date', 'status'];
    const fields = [];
    const values = [];

    for (const key of allowed) {
      if (data[key] !== undefined) {
        fields.push(`${key} = ?`);
        values.push(data[key]);
      }
    }

    if (fields.length === 0) return 0;

    values.push(id);
    const sql = 'UPDATE Maintenance SET ' + fields.join(', ') + ' WHERE maintenance_id = ?';
    const [result] = await db.execute(sql, values);
    return result.affectedRows;
  }

  static async delete(id) {
    const [result] = await db.execute(
      'DELETE FROM Maintenance WHERE maintenance_id = ?',
      [id]
    );
    return result.affectedRows;
  }
}

module.exports = MaintenanceModel;
