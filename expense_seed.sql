-- expense_seed.sql
-- Seed data for TransitOps Database - Expenses table

INSERT INTO `Expenses` 
(`vehicle_id`, `expense_type`, `expense_amount`, `expense_date`) 
VALUES
(1, 'Toll Charge', 45.00, '2026-05-01'),
(2, 'Vehicle Insurance', 1200.00, '2026-05-02'),
(3, 'Washing & Cleaning', 35.00, '2026-05-03'),
(4, 'GPS Tracking Subscription', 20.00, '2026-05-04'),
(5, 'Parking Fee', 15.00, '2026-05-05'),
(6, 'Road Tax', 180.00, '2026-05-06'),
(7, 'Registration Fee', 450.00, '2026-05-07'),
(8, 'Toll Charge', 60.00, '2026-05-08'),
(9, 'Permit Renewal', 250.00, '2026-05-10'),
(10, 'Vehicle Insurance', 850.00, '2026-05-12'),
(1, 'Washing & Cleaning', 75.00, '2026-05-15'),
(2, 'GPS Tracking Subscription', 25.00, '2026-05-18'),
(3, 'Toll Charge', 12.50, '2026-05-20'),
(4, 'Parking Fee', 10.00, '2026-05-22'),
(5, 'Washing & Cleaning', 40.00, '2026-05-25'),
(6, 'Toll Charge', 22.00, '2026-05-27'),
(7, 'GPS Tracking Subscription', 30.00, '2026-05-28'),
(8, 'Washing & Cleaning', 90.00, '2026-05-29'),
(9, 'Toll Charge', 55.00, '2026-06-02'),
(10, 'Toll Charge', 18.00, '2026-06-05');
