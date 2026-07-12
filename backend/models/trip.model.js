// trip.model.js
// Data-access layer for the Trips table.
// All SQL lives here. Zero business logic.

const db = require('../config/db');

class TripModel {

  // ── Fetch all trips (joined with vehicle & driver names) ─────────────────────
  static async getAll() {
    const sql = 
      SELECT
        t.*,
        v.registration_number,
        v.vehicle_name,
        d.name AS driver_name
      FROM Trips t
      LEFT JOIN Vehicles v ON t.vehicle_id  = v.vehicle_id
      LEFT JOIN Drivers  d ON t.driver_id   = d.driver_id
      ORDER BY t.trip_id DESC
    ;
    const [rows] = await db.query(sql);
    return rows;
  }

  // ── Fetch one trip by PK (with join) ────────────────────────────────────────
  static async getById(id) {
    const sql = 
      SELECT
        t.*,
        v.registration_number,
        v.vehicle_name,
        d.name AS driver_name
      FROM Trips t
      LEFT JOIN Vehicles v ON t.vehicle_id  = v.vehicle_id
      LEFT JOIN Drivers  d ON t.driver_id   = d.driver_id
      WHERE t.trip_id = ?
    ;
    const [rows] = await db.query(sql, [id]);
    return rows[0];
  }

  // ── Insert a new trip ────────────────────────────────────────────────────────
  static async create(data) {
    const {
      vehicle_id,
      driver_id,
      origin,
      destination,
      start_time,
      notes,
    } = data;

    const sql = 
      INSERT INTO Trips
        (vehicle_id, driver_id, origin, destination, start_time, status, notes)
      VALUES (?, ?, ?, ?, ?, 'Scheduled', ?)
    ;
    const [result] = await db.execute(sql, [
      vehicle_id,
      driver_id,
      origin,
      destination,
      start_time,
      notes || null,
    ]);
    return result.insertId;
  }

  // ── Update trip fields ───────────────────────────────────────────────────────
  static async update(id, data) {
    const allowed = [
      'vehicle_id',
      'driver_id',
      'origin',
      'destination',
      'start_time',
      'end_time',
      'status',
      'notes',
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
    const sql = 'UPDATE Trips SET ' + fields.join(', ') + ' WHERE trip_id = ?';
    const [result] = await db.execute(sql, values);
    return result.affectedRows;
  }

  // ── Hard-delete a trip ───────────────────────────────────────────────────────
  static async delete(id) {
    const [result] = await db.execute(
      'DELETE FROM Trips WHERE trip_id = ?',
      [id]
    );
    return result.affectedRows;
  }

  // ── Helpers used by the controller ──────────────────────────────────────────

  // Get the raw status of a vehicle
  static async getVehicleStatus(vehicleId) {
    const [rows] = await db.query(
      'SELECT status FROM Vehicles WHERE vehicle_id = ?',
      [vehicleId]
    );
    return rows[0];
  }

  // Get the raw status of a driver
  static async getDriverStatus(driverId) {
    const [rows] = await db.query(
      'SELECT status FROM Drivers WHERE driver_id = ?',
      [driverId]
    );
    return rows[0];
  }

  // Flip vehicle status
  static async setVehicleStatus(vehicleId, status) {
    await db.execute(
      'UPDATE Vehicles SET status = ? WHERE vehicle_id = ?',
      [status, vehicleId]
    );
  }

  // Flip driver status
  static async setDriverStatus(driverId, status) {
    await db.execute(
      'UPDATE Drivers SET status = ? WHERE driver_id = ?',
      [status, driverId]
    );
  }
}

module.exports = TripModel;
