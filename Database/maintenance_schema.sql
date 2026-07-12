-- maintenance_schema.sql
-- TransitOps Database Schema - Maintenance Table

CREATE TABLE `Maintenance` (
    `maintenance_id` INT AUTO_INCREMENT PRIMARY KEY,
    `vehicle_id` INT NOT NULL,
    `service_type` VARCHAR(100) NOT NULL,
    `cost` DECIMAL(10, 2) NOT NULL CHECK (`cost` >= 0),
    `maintenance_date` DATE NOT NULL,
    `status` ENUM('Active', 'Completed') NOT NULL DEFAULT 'Active',
    
    -- Foreign Key Constraint ensuring the vehicle exists
    CONSTRAINT `fk_maintenance_vehicle` FOREIGN KEY (`vehicle_id`) REFERENCES `Vehicles`(`vehicle_id`) ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Index for quick lookups of a specific vehicle's maintenance history
CREATE INDEX `idx_maintenance_vehicle_id` ON `Maintenance`(`vehicle_id`);

-- Index for quickly filtering maintenance tasks that are still active
CREATE INDEX `idx_maintenance_status` ON `Maintenance`(`status`);
