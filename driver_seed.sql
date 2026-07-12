-- driver_seed.sql
-- Seed data for TransitOps Database - Drivers table

INSERT INTO `Drivers` 
(`name`, `license_number`, `license_category`, `license_expiry`, `phone`, `safety_score`, `status`) 
VALUES
('James Miller', 'LIC-1001-JM', 'HMV', '2028-05-15', '555-0101', 98.50, 'Available'),
('Sarah Connor', 'LIC-1002-SC', 'Truck', '2027-11-20', '555-0102', 100.00, 'On Trip'),
('Robert Johnson', 'LIC-1003-RJ', 'Bus', '2025-08-10', '555-0103', 85.00, 'Off Duty'),
('Emily Davis', 'LIC-1004-ED', 'LMV', '2029-01-05', '555-0104', 92.75, 'Available'),
('Michael Wilson', 'LIC-1005-MW', 'HMV', '2026-03-30', '555-0105', 75.20, 'Suspended'),
('David Brown', 'LIC-1006-DB', 'Truck', '2028-12-12', '555-0106', 95.00, 'Available'),
('Jennifer Garcia', 'LIC-1007-JG', 'Bus', '2027-07-22', '555-0107', 99.00, 'On Trip'),
('William Martinez', 'LIC-1008-WM', 'LMV', '2026-09-18', '555-0108', 88.50, 'Off Duty'),
('Linda Rodriguez', 'LIC-1009-LR', 'Truck', '2030-02-14', '555-0109', 100.00, 'Available'),
('Richard Hernandez', 'LIC-1010-RH', 'Bus', '2025-11-11', '555-0110', 91.25, 'On Trip'),
('Joseph Moore', 'LIC-1011-JM', 'HMV', '2029-06-25', '555-0111', 82.00, 'Suspended'),
('Thomas Taylor', 'LIC-1012-TT', 'LMV', '2028-04-08', '555-0112', 96.80, 'Available'),
('Charles Anderson', 'LIC-1013-CA', 'Truck', '2027-10-31', '555-0113', 94.10, 'Off Duty'),
('Christopher Thomas', 'LIC-1014-CT', 'Bus', '2026-05-19', '555-0114', 89.90, 'Available'),
('Daniel Jackson', 'LIC-1015-DJ', 'HMV', '2028-08-08', '555-0115', 97.30, 'On Trip');
