-- expense_schema.sql
-- TransitOps Database Schema - Expenses Table

-- -----------------------------------------------------------------------------
-- Explanations of Relationships:
-- -----------------------------------------------------------------------------
-- 1. Vehicles to Expenses (One-to-Many):
--    - A Vehicle can have multiple Expenses entries over time.
--    - An Expense entry is associated with exactly one Vehicle.
--    - Foreign Key: `vehicle_id` references `Vehicles(vehicle_id)`.
--    - Constraint: A Vehicle cannot be deleted if it is linked to existing expenses (ON DELETE RESTRICT).
-- -----------------------------------------------------------------------------

CREATE TABLE `Expenses` (
    `expense_id` INT AUTO_INCREMENT PRIMARY KEY,
    `vehicle_id` INT NOT NULL,
    `expense_type` VARCHAR(100) NOT NULL,
    `expense_amount` DECIMAL(10, 2) NOT NULL CHECK (`expense_amount` >= 0),
    `expense_date` DATE NOT NULL,
    
    -- Foreign Key Constraint ensuring the vehicle exists
    CONSTRAINT `fk_expenses_vehicle` FOREIGN KEY (`vehicle_id`) REFERENCES `Vehicles`(`vehicle_id`) ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Index for quick lookups of a specific vehicle's expenses
CREATE INDEX `idx_expenses_vehicle_id` ON `Expenses`(`vehicle_id`);

-- Index for querying expenses by date range
CREATE INDEX `idx_expenses_expense_date` ON `Expenses`(`expense_date`);
