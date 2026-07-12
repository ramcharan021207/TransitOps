// vehicle.model.js
// Data-access layer: raw SQL via mysql2 promise pool.
// No business logic here - controllers call these methods.

const db = require('../config/db');

class VehicleModel {

  // Fetch all vehicles
  static async getAll() {
    const [rows] = await db.query('SELECT * FROM Vehicles');
    return rows;
  }

  // Fetch single vehicle by PK
  static async getById(id) {
    const [rows] = await db.query(
      'SELECT * FROM Vehicles WHERE vehicle_id = ?',
      [id]
    );
    return rows[0];
  }

  // Check if registration_number already exists (for uniqueness validation)
  static async findByRegistration(registration_number, excludeId = null) {
    let sql = 'SELECT vehicle_id FROM Vehicles WHERE registration_number = ?';
    const params = [registration_number];
    if (excludeId) {
      sql += ' AND vehicle_id != ?';
      params.push(excludeId);
    }
    const [rows] = await db.query(sql, params);
    return rows[0];
  }

  // Insert a new vehicle record
  static async create(data) {
    const {
      registration_number,
      vehicle_name,
      vehicle_type,
      maximum_capacity,
      odometer,
      acquisition_cost,
      status,
    } = data;

    const sql = `
      INSERT INTO Vehicles
        (registration_number, vehicle_name, vehicle_type,
         maximum_capacity, odometer, acquisition_cost, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await db.execute(sql, [
      registration_number,
      vehicle_name,
      vehicle_type,
      maximum_capacity,
      odometer,
      acquisition_cost,
      status,
    ]);

    return result.insertId;
  }

  // Update an existing vehicle - only update provided fields
  static async update(id, data) {
    const allowed = [
      'registration_number',
      'vehicle_name',
      'vehicle_type',
      'maximum_capacity',
      'odometer',
      'acquisition_cost',
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
    const sql = 'UPDATE Vehicles SET ' + fields.join(', ') + ' WHERE vehicle_id = ?';
    const [result] = await db.execute(sql, values);
    return result.affectedRows;
  }

  // Hard-delete a vehicle by PK
  static async delete(id) {
    const [result] = await db.execute(
      'DELETE FROM Vehicles WHERE vehicle_id = ?',
      [id]
    );
    return result.affectedRows;
  }
}

module.exports = VehicleModel;
