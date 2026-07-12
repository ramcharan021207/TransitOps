// fuel.model.js
// Data-access layer for FuelLogs.

const db = require('../config/db');

class FuelModel {
  static async getAll() {
    const [rows] = await db.query('SELECT * FROM FuelLogs ORDER BY fuel_date DESC, fuel_id DESC');
    return rows;
  }

  static async getById(id) {
    const [rows] = await db.query(
      'SELECT * FROM FuelLogs WHERE fuel_id = ?',
      [id]
    );
    return rows[0];
  }

  static async getVehicleById(vehicleId) {
    const [rows] = await db.query(
      'SELECT vehicle_id FROM Vehicles WHERE vehicle_id = ?',
      [vehicleId]
    );
    return rows[0];
  }

  static async create(data) {
    const { vehicle_id, fuel_type, litres, fuel_cost, fuel_date } = data;

    const sql = `
      INSERT INTO FuelLogs (vehicle_id, fuel_type, litres, fuel_cost, fuel_date)
      VALUES (?, ?, ?, ?, ?)
    `;

    const [result] = await db.execute(sql, [
      vehicle_id,
      fuel_type,
      litres,
      fuel_cost,
      fuel_date,
    ]);

    return result.insertId;
  }

  static async update(id, data) {
    const allowed = ['vehicle_id', 'fuel_type', 'litres', 'fuel_cost', 'fuel_date'];
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
    const sql = 'UPDATE FuelLogs SET ' + fields.join(', ') + ' WHERE fuel_id = ?';
    const [result] = await db.execute(sql, values);
    return result.affectedRows;
  }

  static async delete(id) {
    const [result] = await db.execute(
      'DELETE FROM FuelLogs WHERE fuel_id = ?',
      [id]
    );
    return result.affectedRows;
  }
}

module.exports = FuelModel;
