-- maintenance_seed.sql
-- Seed data for TransitOps Database - Maintenance table

INSERT INTO `Maintenance` 
(`vehicle_id`, `service_type`, `cost`, `maintenance_date`, `status`) 
VALUES
(1, 'Oil Change', 150.00, '2025-10-01', 'Completed'),
(2, 'Tyre Replacement', 800.00, '2025-10-05', 'Completed'),
(3, 'Brake Service', 450.00, '2025-11-10', 'Completed'),
(4, 'Engine Repair', 2500.00, '2026-07-10', 'Active'),
(5, 'Battery Replacement', 200.00, '2025-12-01', 'Completed'),
(6, 'Oil Change', 175.50, '2026-06-25', 'Completed'),
(7, 'Tyre Replacement', 1200.00, '2026-05-15', 'Completed'),
(8, 'Brake Service', 300.00, '2026-07-01', 'Active'),
(9, 'Engine Repair', 3500.00, '2026-03-20', 'Completed'),
(10, 'Oil Change', 130.00, '2026-07-05', 'Active'),
(1, 'Battery Replacement', 250.00, '2026-01-15', 'Completed'),
(2, 'Brake Service', 500.00, '2026-04-10', 'Completed'),
(3, 'Oil Change', 140.00, '2026-05-22', 'Completed'),
(5, 'Tyre Replacement', 600.00, '2026-07-11', 'Active'),
(7, 'Engine Repair', 4200.00, '2026-07-12', 'Active');
