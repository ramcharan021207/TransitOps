-- indexes.sql
-- TransitOps Database - Reporting Performance Optimization (Indexes and Views)
-- Act as: Senior Database Architect
-- Purpose: Improve reporting query performance and aggregate views.

-- =============================================================================
-- SECTION 1: INDEX CREATION FOR REPORTING PERFORMANCE
-- =============================================================================

-- 1. Index on Vehicles.status
-- Explanation: The status column ('Available', 'On Trip', 'In Shop', 'Retired') is highly 
-- queried in fleet operations. Creating this index enables instant filtering of available 
-- or out-of-service vehicles, optimizing fleet deployment queries.
CREATE INDEX `idx_vehicles_status` ON `Vehicles`(`status`);

-- 2. Index on Drivers.status
-- Explanation: Similar to vehicles, tracking driver status ('Available', 'On Trip', etc.) 
-- is critical for scheduling trips. This index avoids full table scans when searching 
-- for available drivers.
CREATE INDEX `idx_drivers_status` ON `Drivers`(`status`);

-- 3. Index on Trips.status
-- Explanation: Over time, the Trips table grows significantly. Filtering by status 
-- (e.g., 'In Progress', 'Completed') is a frequent reporting action. This index ensures 
-- fast retrieval of active or historic trip records.
CREATE INDEX `idx_trips_status` ON `Trips`(`status`);

-- 4. Index on Maintenance.status
-- Explanation: Speeds up tracking of active maintenance tickets versus completed 
-- service logs. Highly beneficial for maintenance dashboards.
CREATE INDEX `idx_maintenance_status` ON `Maintenance`(`status`);

-- 5. Index on FuelLogs.vehicle_id
-- Explanation: Serves as a foreign key index. In MySQL, joins between Vehicles and 
-- FuelLogs depend on this column. Indexing vehicle_id eliminates nested loop full-scan 
-- lookup penalties during reporting aggregates (like calculating total fuel per vehicle).
CREATE INDEX `idx_fuellogs_vehicle_id` ON `FuelLogs`(`vehicle_id`);

-- 6. Index on Expenses.vehicle_id
-- Explanation: Serves as a foreign key index. Optimizes joins and group-by aggregates 
-- between Vehicles and Expenses, allowing rapid calculation of total operating expenses 
-- (TCO) per vehicle.
CREATE INDEX `idx_expenses_vehicle_id` ON `Expenses`(`vehicle_id`);


-- =============================================================================
-- SECTION 2: SQL VIEWS FOR REPORTING AND ANALYTICS
-- =============================================================================

-- 1. FleetSummary View
-- Explanation: Provides a comprehensive, single-point-of-truth overview of every vehicle 
-- in the fleet. It integrates acquisition cost, active status, odometer, and sums of 
-- all trips, maintenance costs, fuel costs, fuel litres, and miscellaneous expenses.
-- Optimization Note: Relies on the indexes idx_fuellogs_vehicle_id, idx_expenses_vehicle_id, 
-- idx_maintenance_vehicle_id, and idx_trips_vehicle_id to perform fast LEFT JOIN subquery aggregates.
CREATE OR REPLACE VIEW `FleetSummary` AS
SELECT 
    v.vehicle_id,
    v.registration_number,
    v.vehicle_name,
    v.vehicle_type,
    v.status AS vehicle_status,
    v.odometer,
    v.acquisition_cost,
    COALESCE(t.total_trips, 0) AS total_trips,
    COALESCE(m.total_maintenance_cost, 0.00) AS total_maintenance_cost,
    COALESCE(f.total_fuel_cost, 0.00) AS total_fuel_cost,
    COALESCE(f.total_litres, 0.00) AS total_fuel_litres,
    COALESCE(e.total_expenses_amount, 0.00) AS total_expenses_amount,
    (v.acquisition_cost + COALESCE(m.total_maintenance_cost, 0.00) + COALESCE(f.total_fuel_cost, 0.00) + COALESCE(e.total_expenses_amount, 0.00)) AS total_cost_of_ownership
FROM `Vehicles` v
LEFT JOIN (
    SELECT vehicle_id, COUNT(*) AS total_trips 
    FROM `Trips` 
    GROUP BY vehicle_id
) t ON v.vehicle_id = t.vehicle_id
LEFT JOIN (
    SELECT vehicle_id, SUM(cost) AS total_maintenance_cost 
    FROM `Maintenance` 
    GROUP BY vehicle_id
) m ON v.vehicle_id = m.vehicle_id
LEFT JOIN (
    SELECT vehicle_id, SUM(fuel_cost) AS total_fuel_cost, SUM(litres) AS total_litres
    FROM `FuelLogs` 
    GROUP BY vehicle_id
) f ON v.vehicle_id = f.vehicle_id
LEFT JOIN (
    SELECT vehicle_id, SUM(expense_amount) AS total_expenses_amount 
    FROM `Expenses` 
    GROUP BY vehicle_id
) e ON v.vehicle_id = e.vehicle_id;


-- 2. MaintenanceSummary View
-- Explanation: Aggregates maintenance statistics per vehicle. It tracks total maintenance 
-- events, distinguishes between active/completed events, calculates average service costs, 
-- and retrieves the last maintenance date.
-- Optimization Note: The group-by query is highly optimized by the index idx_maintenance_vehicle_id.
CREATE OR REPLACE VIEW `MaintenanceSummary` AS
SELECT 
    v.vehicle_id,
    v.registration_number,
    v.vehicle_name,
    COUNT(m.maintenance_id) AS total_maintenance_events,
    SUM(CASE WHEN m.status = 'Active' THEN 1 ELSE 0 END) AS active_events,
    SUM(CASE WHEN m.status = 'Completed' THEN 1 ELSE 0 END) AS completed_events,
    COALESCE(SUM(m.cost), 0.00) AS total_maintenance_cost,
    COALESCE(AVG(m.cost), 0.00) AS average_maintenance_cost,
    MAX(m.maintenance_date) AS last_maintenance_date
FROM `Vehicles` v
LEFT JOIN `Maintenance` m ON v.vehicle_id = m.vehicle_id
GROUP BY v.vehicle_id, v.registration_number, v.vehicle_name;


-- 3. FuelSummary View
-- Explanation: Summarizes fuel consumption and fuel expenses per vehicle. It provides 
-- critical efficiency metrics such as total litres, total cost, average cost per litre, 
-- and average litres per fillup.
-- Optimization Note: Grouping and join lookups are optimized by idx_fuellogs_vehicle_id.
CREATE OR REPLACE VIEW `FuelSummary` AS
SELECT 
    v.vehicle_id,
    v.registration_number,
    v.vehicle_name,
    COUNT(f.fuel_id) AS total_fuel_fillups,
    COALESCE(SUM(f.litres), 0.00) AS total_litres_consumed,
    COALESCE(SUM(f.fuel_cost), 0.00) AS total_fuel_spending,
    CASE 
        WHEN COALESCE(SUM(f.litres), 0.00) > 0 THEN ROUND(SUM(f.fuel_cost) / SUM(f.litres), 4)
        ELSE 0.0000 
    END AS avg_cost_per_litre,
    COALESCE(AVG(f.litres), 0.00) AS avg_litres_per_fillup,
    MAX(f.fuel_date) AS last_fuel_date
FROM `Vehicles` v
LEFT JOIN `FuelLogs` f ON v.vehicle_id = f.vehicle_id
GROUP BY v.vehicle_id, v.registration_number, v.vehicle_name;


-- 4. ExpenseSummary View
-- Explanation: Summarizes miscellaneous, non-maintenance operational expenses (e.g., tolls, 
-- insurance, road tax) per vehicle, providing count, sum, and average costs.
-- Optimization Note: Grouping and join lookups are optimized by idx_expenses_vehicle_id.
CREATE OR REPLACE VIEW `ExpenseSummary` AS
SELECT 
    v.vehicle_id,
    v.registration_number,
    v.vehicle_name,
    COUNT(e.expense_id) AS total_expense_records,
    COALESCE(SUM(e.expense_amount), 0.00) AS total_expense_amount,
    COALESCE(AVG(e.expense_amount), 0.00) AS average_expense_amount,
    MAX(e.expense_date) AS last_expense_date
FROM `Vehicles` v
LEFT JOIN `Expenses` e ON v.vehicle_id = e.vehicle_id
GROUP BY v.vehicle_id, v.registration_number, v.vehicle_name;


-- 5. TripSummary View
-- Explanation: Aggregates operational trip details per vehicle, breaking down trips 
-- by status (Scheduled, In Progress, Completed, Cancelled) and summing/averaging cargo load details.
-- Optimization Note: Grouping and join lookups are optimized by idx_trips_vehicle_id.
CREATE OR REPLACE VIEW `TripSummary` AS
SELECT 
    v.vehicle_id,
    v.registration_number,
    v.vehicle_name,
    COUNT(t.trip_id) AS total_trips,
    SUM(CASE WHEN t.status = 'Scheduled' THEN 1 ELSE 0 END) AS scheduled_trips,
    SUM(CASE WHEN t.status = 'In Progress' THEN 1 ELSE 0 END) AS in_progress_trips,
    SUM(CASE WHEN t.status = 'Completed' THEN 1 ELSE 0 END) AS completed_trips,
    SUM(CASE WHEN t.status = 'Cancelled' THEN 1 ELSE 0 END) AS cancelled_trips,
    COALESCE(SUM(t.cargo_weight), 0.00) AS total_cargo_weight,
    COALESCE(AVG(t.cargo_weight), 0.00) AS average_cargo_weight
FROM `Vehicles` v
LEFT JOIN `Trips` t ON v.vehicle_id = t.vehicle_id
GROUP BY v.vehicle_id, v.registration_number, v.vehicle_name;
