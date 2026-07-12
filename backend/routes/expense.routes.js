// expense.routes.js
// Maps /api/expenses endpoints to controller handlers.

const express = require('express');
const router = express.Router();
const expenseController = require('../controllers/expense.controller');

router.get('/', expenseController.getAllExpenses);
router.get('/:id', expenseController.getExpenseById);
router.post('/', expenseController.createExpense);
router.put('/:id', expenseController.updateExpense);
router.delete('/:id', expenseController.deleteExpense);

module.exports = router;
