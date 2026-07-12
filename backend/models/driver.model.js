// driver.model.js
// Data-access layer for the Drivers table.
// Only raw SQL here - zero business logic.

const db = require('../config/db');

class DriverModel {

  // Fetch all drivers
  static async getAll() {
    const [rows] = await db.query('SELECT * FROM Drivers');
    return rows;
  }

  // Fetch single driver by PK
  static async getById(id) {
    const [rows] = await db.query(
      'SELECT * FROM Drivers WHERE driver_id = ?',
      [id]
    );
    return rows[0];
  }

  // Check license_number uniqueness (exclude self on updates)
  static async findByLicense(license_number, excludeId = null) {
    let sql = 'SELECT driver_id FROM Drivers WHERE license_number = ?';
    const params = [license_number];
    if (excludeId) {
      sql += ' AND driver_id != ?';
      params.push(excludeId);
    }
    const [rows] = await db.query(sql, params);
    return rows[0];
  }

  // Check phone uniqueness (exclude self on updates)
  static async findByPhone(phone, excludeId = null) {
    let sql = 'SELECT driver_id FROM Drivers WHERE phone = ?';
    const params = [phone];
    if (excludeId) {
      sql += ' AND driver_id != ?';
      params.push(excludeId);
    }
    const [rows] = await db.query(sql, params);
    return rows[0];
  }

  // Insert a new driver record
  static async create(data) {
    const {
      name,
      license_number,
      license_category,
      license_expiry,
      phone,
      safety_score,
      status,
    } = data;

    const sql = `
      INSERT INTO Drivers
        (name, license_number, license_category, license_expiry, phone, safety_score, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await db.execute(sql, [
      name,
      license_number,
      license_category,
      license_expiry,
      phone,
      safety_score,
      status,
    ]);

    return result.insertId;
  }

  // Update a driver - only update fields actually provided
  static async update(id, data) {
    const allowed = [
      'name',
      'license_number',
      'license_category',
      'license_expiry',
      'phone',
      'safety_score',
      'status',
    ];

    const fields = [];
    const values = [];

    for (const key of allowed) {
      if (data[key] !== undefined) {
        fields.push(key + ' = ?');
        values.push(data[key]);
      }
    }

    if (fields.length === 0) return 0;

    values.push(id);
    const sql =
      'UPDATE Drivers SET ' + fields.join(', ') + ' WHERE driver_id = ?';
    const [result] = await db.execute(sql, values);
    return result.affectedRows;
  }

  // Hard-delete a driver by PK
  static async delete(id) {
    const [result] = await db.execute(
      'DELETE FROM Drivers WHERE driver_id = ?',
      [id]
    );
    return result.affectedRows;
  }
}

module.exports = DriverModel;
