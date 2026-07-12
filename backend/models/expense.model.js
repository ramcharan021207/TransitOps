// expense.model.js
// Data-access layer for Expenses.

const db = require('../config/db');

class ExpenseModel {
  static async getAll() {
    const [rows] = await db.query('SELECT * FROM Expenses ORDER BY expense_date DESC, expense_id DESC');
    return rows;
  }

  static async getById(id) {
    const [rows] = await db.query(
      'SELECT * FROM Expenses WHERE expense_id = ?',
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
    const { vehicle_id, expense_type, expense_amount, expense_date } = data;

    const sql = `
      INSERT INTO Expenses (vehicle_id, expense_type, expense_amount, expense_date)
      VALUES (?, ?, ?, ?)
    `;

    const [result] = await db.execute(sql, [
      vehicle_id,
      expense_type,
      expense_amount,
      expense_date,
    ]);

    return result.insertId;
  }

  static async update(id, data) {
    const allowed = ['vehicle_id', 'expense_type', 'expense_amount', 'expense_date'];
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
    const sql = 'UPDATE Expenses SET ' + fields.join(', ') + ' WHERE expense_id = ?';
    const [result] = await db.execute(sql, values);
    return result.affectedRows;
  }

  static async delete(id) {
    const [result] = await db.execute(
      'DELETE FROM Expenses WHERE expense_id = ?',
      [id]
    );
    return result.affectedRows;
  }
}

module.exports = ExpenseModel;
