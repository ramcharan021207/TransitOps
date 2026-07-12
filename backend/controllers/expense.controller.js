// expense.controller.js
// Business logic for Expenses.

const ExpenseModel = require('../models/expense.model');

function validateExpenseData(body, requireAll = true) {
  const errors = [];
  const { vehicle_id, expense_type, expense_amount, expense_date } = body;

  if (requireAll || vehicle_id !== undefined) {
    if (vehicle_id === undefined || vehicle_id === null || Number(vehicle_id) <= 0) {
      errors.push('vehicle_id is required and must be greater than 0.');
    }
  }

  if (requireAll || expense_type !== undefined) {
    if (!expense_type || !expense_type.toString().trim()) {
      errors.push('expense_type is required.');
    }
  }

  if (requireAll || expense_amount !== undefined) {
    const parsedAmount = Number(expense_amount);
    if (expense_amount === undefined || expense_amount === null || Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      errors.push('expense_amount must be greater than 0.');
    }
  }

  if (requireAll || expense_date !== undefined) {
    if (!expense_date) {
      errors.push('expense_date is required.');
    } else {
      const date = new Date(expense_date);
      if (Number.isNaN(date.getTime())) {
        errors.push('expense_date must be a valid date.');
      }
    }
  }

  return errors;
}

exports.getAllExpenses = async (req, res, next) => {
  try {
    const data = await ExpenseModel.getAll();
    return res.success(data);
  } catch (error) {
    console.error('getAllExpenses error:', error);
    return next(error);
  }
};

exports.getExpenseById = async (req, res, next) => {
  try {
    const expense = await ExpenseModel.getById(req.params.id);
    if (!expense) {
      return res.failure('Expense not found.', 404);
    }

    return res.success(expense);
  } catch (error) {
    console.error('getExpenseById error:', error);
    return next(error);
  }
};

exports.createExpense = async (req, res, next) => {
  try {
    const errors = validateExpenseData(req.body, true);
    if (errors.length > 0) {
      return res.failure(errors.join(' '), 400);
    }

    const vehicle = await ExpenseModel.getVehicleById(req.body.vehicle_id);
    if (!vehicle) {
      return res.failure('Vehicle not found.', 404);
    }

    const payload = {
      vehicle_id: Number(req.body.vehicle_id),
      expense_type: req.body.expense_type.trim(),
      expense_amount: Number(req.body.expense_amount),
      expense_date: req.body.expense_date,
    };

    const insertId = await ExpenseModel.create(payload);
    const newExpense = await ExpenseModel.getById(insertId);
    return res.success(newExpense, 201);
  } catch (error) {
    console.error('createExpense error:', error);
    return next(error);
  }
};

exports.updateExpense = async (req, res, next) => {
  try {
    const expense = await ExpenseModel.getById(req.params.id);
    if (!expense) {
      return res.failure('Expense not found.', 404);
    }

    const errors = validateExpenseData(req.body, false);
    if (errors.length > 0) {
      return res.failure(errors.join(' '), 400);
    }

    if (req.body.vehicle_id !== undefined) {
      const vehicle = await ExpenseModel.getVehicleById(req.body.vehicle_id);
      if (!vehicle) {
        return res.failure('Vehicle not found.', 404);
      }
    }

    const affectedRows = await ExpenseModel.update(req.params.id, req.body);
    if (affectedRows === 0) {
      return res.failure('No valid fields provided to update.', 400);
    }

    const updated = await ExpenseModel.getById(req.params.id);
    return res.success(updated);
  } catch (error) {
    console.error('updateExpense error:', error);
    return next(error);
  }
};

exports.deleteExpense = async (req, res, next) => {
  try {
    const expense = await ExpenseModel.getById(req.params.id);
    if (!expense) {
      return res.failure('Expense not found.', 404);
    }

    await ExpenseModel.delete(req.params.id);
    return res.success({ message: 'Expense deleted successfully.' });
  } catch (error) {
    console.error('deleteExpense error:', error);
    return next(error);
  }
};
