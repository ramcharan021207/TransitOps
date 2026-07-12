-- trip_schema.sql
-- TransitOps Database Schema - Trips Table

-- -----------------------------------------------------------------------------
-- Explanations of Relationships:
-- -----------------------------------------------------------------------------
-- 1. Vehicles to Trips (One-to-Many):
--    - A Vehicle can be assigned to multiple Trips over time.
--    - A Trip is assigned exactly one Vehicle.
--    - Foreign Key: `vehicle_id` references `Vehicles(vehicle_id)`.
--    - Constraint: A Vehicle cannot be deleted if it is linked to existing trips (ON DELETE RESTRICT).
--
-- 2. Drivers to Trips (One-to-Many):
--    - A Driver can be assigned to multiple Trips over time.
--    - A Trip is assigned exactly one Driver.
--    - Foreign Key: `driver_id` references `Drivers(driver_id)`.
--    - Constraint: A Driver cannot be deleted if they are linked to existing trips (ON DELETE RESTRICT).
-- -----------------------------------------------------------------------------

CREATE TABLE `Trips` (
    `trip_id` INT AUTO_INCREMENT PRIMARY KEY,
    `vehicle_id` INT NOT NULL,
    `driver_id` INT NOT NULL,
    `source` VARCHAR(150) NOT NULL,
    `destination` VARCHAR(150) NOT NULL,
    `departure_date` DATETIME NOT NULL,
    `arrival_date` DATETIME DEFAULT NULL,
    `cargo_type` VARCHAR(100) DEFAULT NULL,
    `cargo_weight` DECIMAL(10, 2) DEFAULT NULL,
    `status` ENUM('Scheduled', 'In Progress', 'Completed', 'Cancelled') NOT NULL DEFAULT 'Scheduled',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign Key Constraints
    CONSTRAINT `fk_trips_vehicle` FOREIGN KEY (`vehicle_id`) REFERENCES `Vehicles`(`vehicle_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `fk_trips_driver` FOREIGN KEY (`driver_id`) REFERENCES `Drivers`(`driver_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    
    -- Data Integrity Constraints
    CONSTRAINT `chk_trip_dates` CHECK (`arrival_date` IS NULL OR `arrival_date` >= `departure_date`),
    CONSTRAINT `chk_trip_cargo_weight` CHECK (`cargo_weight` IS NULL OR `cargo_weight` >= 0)
);

-- Indexes for efficient querying and filtering
CREATE INDEX `idx_trips_vehicle_id` ON `Trips`(`vehicle_id`);
CREATE INDEX `idx_trips_driver_id` ON `Trips`(`driver_id`);
CREATE INDEX `idx_trips_status` ON `Trips`(`status`);
