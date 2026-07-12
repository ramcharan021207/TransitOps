-- fuel_schema.sql
-- TransitOps Database Schema - FuelLogs Table

-- -----------------------------------------------------------------------------
-- Explanations of Relationships:
-- -----------------------------------------------------------------------------
-- 1. Vehicles to FuelLogs (One-to-Many):
--    - A Vehicle can have multiple FuelLogs entries over time.
--    - A FuelLog entry belongs to exactly one Vehicle.
--    - Foreign Key: `vehicle_id` references `Vehicles(vehicle_id)`.
--    - Constraint: A Vehicle cannot be deleted if it is linked to existing fuel logs (ON DELETE RESTRICT).
-- -----------------------------------------------------------------------------

CREATE TABLE `FuelLogs` (
    `fuel_id` INT AUTO_INCREMENT PRIMARY KEY,
    `vehicle_id` INT NOT NULL,
    `fuel_type` VARCHAR(50) NOT NULL,
    `litres` DECIMAL(10, 2) NOT NULL CHECK (`litres` > 0),
    `fuel_cost` DECIMAL(10, 2) NOT NULL CHECK (`fuel_cost` >= 0),
    `fuel_date` DATE NOT NULL,
    
    -- Foreign Key Constraint ensuring the vehicle exists
    CONSTRAINT `fk_fuellogs_vehicle` FOREIGN KEY (`vehicle_id`) REFERENCES `Vehicles`(`vehicle_id`) ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Index for quick lookups of a specific vehicle's fuel history
CREATE INDEX `idx_fuellogs_vehicle_id` ON `FuelLogs`(`vehicle_id`);

-- Index for querying fuel logs by date range
CREATE INDEX `idx_fuellogs_fuel_date` ON `FuelLogs`(`fuel_date`);
