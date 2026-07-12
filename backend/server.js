const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  req.requestId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);

  res.success = (data, statusCode = 200) => res.status(statusCode).json({ success: true, data });
  res.failure = (message, statusCode = 400) => res.status(statusCode).json({ success: false, message });

  next();
});

// Placeholder route imports
const authRoutes = require('./routes/auth.routes');
const vehicleRoutes = require('./routes/vehicle.routes');
const driverRoutes = require('./routes/driver.routes');
const tripRoutes = require('./routes/trip.routes');
const maintenanceRoutes = require('./routes/maintenance.routes');
const fuelRoutes = require('./routes/fuel.routes');
const expenseRoutes = require('./routes/expense.routes');
const reportRoutes = require('./routes/report.routes');

app.use('/api/auth', authRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/fuel', fuelRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/reports', reportRoutes);

app.use((req, res) => {
  const message = req.path.startsWith('/api/')
    ? 'API endpoint not found.'
    : 'Route not found.';
  return res.failure(message, 404);
});

app.use((err, req, res, next) => {
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} failed`, err.stack || err.message);
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Internal server error.';
  return res.failure(message, statusCode);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
