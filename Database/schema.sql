-- schema.sql
-- TransitOps Database Schema

-- -----------------------------------------------------------------------------
-- Explanations of Relationships:
-- -----------------------------------------------------------------------------
-- 1. Roles to Users:
--    - A Role can be assigned to multiple Users (One-to-Many).
--    - A User must have exactly one Role assigned to them via the `role_id` foreign key.
--    - The `role_id` in the `Users` table references `role_id` in the `Roles` table.
-- 
-- Note: Vehicles and Drivers are independent entities in this initial schema 
-- because linking tables like Trips were explicitly excluded.
-- -----------------------------------------------------------------------------

CREATE TABLE `Roles` (
    `role_id` INT AUTO_INCREMENT PRIMARY KEY,
    `role_name` VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE `Users` (
    `user_id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL,
    `email` VARCHAR(150) NOT NULL UNIQUE,
    `password_hash` VARCHAR(255) NOT NULL,
    `role_id` INT NOT NULL,
    CONSTRAINT `fk_users_role` FOREIGN KEY (`role_id`) REFERENCES `Roles`(`role_id`) ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Index for quickly looking up users by their role
CREATE INDEX `idx_users_role_id` ON `Users`(`role_id`);

CREATE TABLE `Vehicles` (
    `vehicle_id` INT AUTO_INCREMENT PRIMARY KEY,
    `registration_number` VARCHAR(50) NOT NULL UNIQUE,
    `vehicle_name` VARCHAR(100) NOT NULL,
    `vehicle_type` VARCHAR(50) NOT NULL,
    `maximum_capacity` INT NOT NULL CHECK (`maximum_capacity` > 0),
    `odometer` DECIMAL(10, 2) NOT NULL DEFAULT 0.00 CHECK (`odometer` >= 0),
    `acquisition_cost` DECIMAL(12, 2) NOT NULL CHECK (`acquisition_cost` >= 0),
    `status` ENUM('Available', 'On Trip', 'In Shop', 'Retired') NOT NULL DEFAULT 'Available'
);

-- Index for querying vehicles based on their current status
CREATE INDEX `idx_vehicles_status` ON `Vehicles`(`status`);

-- Index for filtering vehicles by their type (e.g., Truck, Bus)
CREATE INDEX `idx_vehicles_type` ON `Vehicles`(`vehicle_type`);

CREATE TABLE `Drivers` (
    `driver_id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL,
    `license_number` VARCHAR(50) NOT NULL UNIQUE,
    `license_category` VARCHAR(20) NOT NULL,
    `license_expiry` DATE NOT NULL,
    `phone` VARCHAR(20) NOT NULL UNIQUE,
    `safety_score` DECIMAL(5, 2) NOT NULL DEFAULT 100.00 CHECK (`safety_score` >= 0 AND `safety_score` <= 100),
    `status` ENUM('Available', 'On Trip', 'Off Duty', 'Suspended') NOT NULL DEFAULT 'Available'
);

-- Index for querying drivers based on their current status
CREATE INDEX `idx_drivers_status` ON `Drivers`(`status`);

-- Index for querying drivers by license category
CREATE INDEX `idx_drivers_license_category` ON `Drivers`(`license_category`);

-- Index for quickly querying upcoming license expirations
CREATE INDEX `idx_drivers_license_expiry` ON `Drivers`(`license_expiry`);
