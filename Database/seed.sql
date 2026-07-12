-- seed.sql
-- Seed data for TransitOps Database - Vehicles table

INSERT INTO `Vehicles` 
(`registration_number`, `vehicle_name`, `vehicle_type`, `maximum_capacity`, `odometer`, `acquisition_cost`, `status`) 
VALUES
('TRK-9843-A', 'Heavy Hauler Alpha', 'Truck', 20000, 15430.50, 120000.00, 'Available'),
('TRK-4921-B', 'Freight Master', 'Truck', 25000, 42100.00, 135000.00, 'On Trip'),
('VAN-1029-X', 'City Sprinter 1', 'Van', 1500, 8900.20, 45000.00, 'Available'),
('VAN-3847-Y', 'Cargo Express', 'Van', 2000, 120400.75, 50000.00, 'In Shop'),
('MIN-7742-C', 'Urban Dash', 'Mini Truck', 3500, 5230.00, 32000.00, 'Available'),
('MIN-2291-D', 'Quick Loader', 'Mini Truck', 4000, 18500.10, 34000.00, 'On Trip'),
('BUS-5501-M', 'Transit Coach A', 'Bus', 55, 34500.00, 250000.00, 'Available'),
('BUS-8812-N', 'City Cruiser', 'Bus', 40, 89100.30, 180000.00, 'Available'),
('TRK-1122-Z', 'Long Haul Zeta', 'Truck', 30000, 250000.00, 150000.00, 'Retired'),
('VAN-9900-W', 'Delivery Pro', 'Van', 1800, 410.50, 48000.00, 'Available');
