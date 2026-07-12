# TransitOps ERP Database Architecture Documentation
**Role:** Senior Database Architect  
**Project:** TransitOps ERP  
**Version:** 1.1  
**Status:** Approved for Production  

---

## 1. Database Overview
The TransitOps ERP database is a relational schema built using MySQL. It is designed to manage a commercial fleet, driver scheduling, transit trips, maintenance tracking, fuel usage, and miscellaneous operating expenses. The schema prioritizes strict referential integrity, domain validation using constraints, and optimized index configurations for operational reporting.

---

## 2. Table-by-Table Specifications

### 2.1. Roles
Stores user authorization levels to enforce Role-Based Access Control (RBAC).
* **`role_id`**: `INT AUTO_INCREMENT PRIMARY KEY`
* **`role_name`**: `VARCHAR(50) NOT NULL UNIQUE` (e.g., Admin, Dispatcher, Driver)

### 2.2. Users
Stores credentials and authorization paths for internal application users.
* **`user_id`**: `INT AUTO_INCREMENT PRIMARY KEY`
* **`name`**: `VARCHAR(100) NOT NULL`
* **`email`**: `VARCHAR(150) NOT NULL UNIQUE` (Used as login identifier)
* **`password_hash`**: `VARCHAR(255) NOT NULL` (Secured using modern hashing algorithms)
* **`role_id`**: `INT NOT NULL` (Foreign key to `Roles`)

### 2.3. Vehicles
Maintains the fleet registry with physical attributes, lifecycle state, and mileage.
* **`vehicle_id`**: `INT AUTO_INCREMENT PRIMARY KEY`
* **`registration_number`**: `VARCHAR(50) NOT NULL UNIQUE` (License plate number)
* **`vehicle_name`**: `VARCHAR(100) NOT NULL` (User-friendly name)
* **`vehicle_type`**: `VARCHAR(50) NOT NULL` (e.g., Truck, Van, Bus, Mini Truck)
* **`maximum_capacity`**: `INT NOT NULL CHECK (maximum_capacity > 0)`
* **`odometer`**: `DECIMAL(10,2) NOT NULL DEFAULT 0.00 CHECK (odometer >= 0)`
* **`acquisition_cost`**: `DECIMAL(12,2) NOT NULL CHECK (acquisition_cost >= 0)`
* **`status`**: `ENUM('Available', 'On Trip', 'In Shop', 'Retired') NOT NULL DEFAULT 'Available'`

### 2.4. Drivers
Maintains safety scores, contact details, licensing status, and shifts.
* **`driver_id`**: `INT AUTO_INCREMENT PRIMARY KEY`
* **`name`**: `VARCHAR(100) NOT NULL`
* **`license_number`**: `VARCHAR(50) NOT NULL UNIQUE`
* **`license_category`**: `VARCHAR(20) NOT NULL`
* **`license_expiry`**: `DATE NOT NULL` (Enforces driver compliance reviews)
* **`phone`**: `VARCHAR(20) NOT NULL UNIQUE`
* **`safety_score`**: `DECIMAL(5,2) NOT NULL DEFAULT 100.00 CHECK (safety_score >= 0 AND safety_score <= 100)`
* **`status`**: `ENUM('Available', 'On Trip', 'Off Duty', 'Suspended') NOT NULL DEFAULT 'Available'`

### 2.5. Trips
Records real-time logistics movements, dispatching a specific vehicle and driver.
* **`trip_id`**: `INT AUTO_INCREMENT PRIMARY KEY`
* **`vehicle_id`**: `INT NOT NULL` (Foreign key to `Vehicles`)
* **`driver_id`**: `INT NOT NULL` (Foreign key to `Drivers`)
* **`source`**: `VARCHAR(150) NOT NULL`
* **`destination`**: `VARCHAR(150) NOT NULL`
* **`departure_date`**: `DATETIME NOT NULL`
* **`arrival_date`**: `DATETIME DEFAULT NULL`
* **`cargo_type`**: `VARCHAR(100) DEFAULT NULL`
* **`cargo_weight`**: `DECIMAL(10,2) DEFAULT NULL CHECK (cargo_weight IS NULL OR cargo_weight >= 0)`
* **`status`**: `ENUM('Scheduled', 'In Progress', 'Completed', 'Cancelled') NOT NULL DEFAULT 'Scheduled'`
* **`created_at`**: `TIMESTAMP DEFAULT CURRENT_TIMESTAMP`
* **`updated_at`**: `TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`

### 2.6. Maintenance
Tracks fleet servicing costs, schedules, and active work orders.
* **`maintenance_id`**: `INT AUTO_INCREMENT PRIMARY KEY`
* **`vehicle_id`**: `INT NOT NULL` (Foreign key to `Vehicles`)
* **`service_type`**: `VARCHAR(100) NOT NULL` (e.g., Oil Change, Brake Service)
* **`cost`**: `DECIMAL(10,2) NOT NULL CHECK (cost >= 0)`
* **`maintenance_date`**: `DATE NOT NULL`
* **`status`**: `ENUM('Active', 'Completed') NOT NULL DEFAULT 'Active'`

### 2.7. FuelLogs
Monitors fuel fills, consumption levels, and refueling costs per vehicle.
* **`fuel_id`**: `INT AUTO_INCREMENT PRIMARY KEY`
* **`vehicle_id`**: `INT NOT NULL` (Foreign key to `Vehicles`)
* **`fuel_type`**: `VARCHAR(50) NOT NULL` (e.g., Diesel, Unleaded)
* **`litres`**: `DECIMAL(10,2) NOT NULL CHECK (litres > 0)`
* **`fuel_cost`**: `DECIMAL(10,2) NOT NULL CHECK (fuel_cost >= 0)`
* **`fuel_date`**: `DATE NOT NULL`

### 2.8. Expenses
Captures non-maintenance, non-fuel operational costs (e.g., road tax, tolls, insurance).
* **`expense_id`**: `INT AUTO_INCREMENT PRIMARY KEY`
* **`vehicle_id`**: `INT NOT NULL` (Foreign key to `Vehicles`)
* **`expense_type`**: `VARCHAR(100) NOT NULL` (e.g., Toll Charge, Road Tax, Insurance)
* **`expense_amount`**: `DECIMAL(10,2) NOT NULL CHECK (expense_amount >= 0)`
* **`expense_date`**: `DATE NOT NULL`

---

## 3. Relationships & Referential Integrity
All tables are linked utilizing strict relational constraints with cascading updates and restricted deletions to prevent orphan records.

* **Roles $\to$ Users (`1 : N`)**
  * Defined by `fk_users_role` mapping `Users.role_id` to `Roles.role_id`.
  * Actions: `ON DELETE RESTRICT ON UPDATE CASCADE`. Roles cannot be deleted if users are assigned to them.
* **Vehicles $\to$ Trips (`1 : N`)**
  * Defined by `fk_trips_vehicle` mapping `Trips.vehicle_id` to `Vehicles.vehicle_id`.
  * Actions: `ON DELETE RESTRICT ON UPDATE CASCADE`. A vehicle cannot be deleted if trip logs refer to it.
* **Drivers $\to$ Trips (`1 : N`)**
  * Defined by `fk_trips_driver` mapping `Trips.driver_id` to `Drivers.driver_id`.
  * Actions: `ON DELETE RESTRICT ON UPDATE CASCADE`. A driver cannot be deleted if linked to trip logs.
* **Vehicles $\to$ Maintenance (`1 : N`)**
  * Defined by `fk_maintenance_vehicle` mapping `Maintenance.vehicle_id` to `Vehicles.vehicle_id`.
  * Actions: `ON DELETE RESTRICT ON UPDATE CASCADE`. Prevents deleting vehicle records that have maintenance histories.
* **Vehicles $\to$ FuelLogs (`1 : N`)**
  * Defined by `fk_fuellogs_vehicle` mapping `FuelLogs.vehicle_id` to `Vehicles.vehicle_id`.
  * Actions: `ON DELETE RESTRICT ON UPDATE CASCADE`.
* **Vehicles $\to$ Expenses (`1 : N`)**
  * Defined by `fk_expenses_vehicle` mapping `Expenses.vehicle_id` to `Vehicles.vehicle_id`.
  * Actions: `ON DELETE RESTRICT ON UPDATE CASCADE`.

---

## 4. Indexing Strategy
To optimize reporting performance and ensure O(1) or O(log N) lookup times, a centralized indexing strategy has been applied:

| Index Name | Table | Column(s) Indexed | Purpose |
| :--- | :--- | :--- | :--- |
| `idx_users_role_id` | `Users` | `role_id` | Speeds up RBAC access checks |
| `idx_vehicles_status` | `Vehicles` | `status` | Enhances quick lookups for dispatch operations |
| `idx_vehicles_type` | `Vehicles` | `vehicle_type` | Speeds up vehicle class analytics |
| `idx_drivers_status` | `Drivers` | `status` | Enhances dispatcher scheduling dashboard views |
| `idx_drivers_license_category`| `Drivers` | `license_category` | Speeds up category qualifications filters |
| `idx_drivers_license_expiry` | `Drivers` | `license_expiry` | Facilitates license compliance audit notifications |
| `idx_trips_vehicle_id` | `Trips` | `vehicle_id` | Optimizes vehicle trip logs aggregations |
| `idx_trips_driver_id` | `Trips` | `driver_id` | Optimizes driver workload reporting |
| `idx_trips_status` | `Trips` | `status` | Speeds up status dashboard views |
| `idx_maintenance_vehicle_id` | `Maintenance` | `vehicle_id` | Speeds up fleet maintenance audit trails |
| `idx_maintenance_status` | `Maintenance` | `status` | Optimizes active repair ticket counts |
| `idx_fuellogs_vehicle_id` | `FuelLogs` | `vehicle_id` | Speeds up vehicle fuel summary aggregates |
| `idx_fuellogs_fuel_date` | `FuelLogs` | `fuel_date` | Optimizes date-bounded fuel usage audits |
| `idx_expenses_vehicle_id` | `Expenses` | `vehicle_id` | Speeds up vehicle miscellaneous cost aggregates |
| `idx_expenses_expense_date` | `Expenses` | `expense_date` | Optimizes date-bounded expense audits |

---

## 5. Data Integrity Constraints
* **Checks on Values**:
  * `maximum_capacity` must be positive (> 0).
  * `odometer` must be non-negative (>= 0).
  * `acquisition_cost`, `cost`, `fuel_cost`, and `expense_amount` must be non-negative (>= 0).
  * `litres` must be positive (> 0).
  * `cargo_weight` must be non-negative (>= 0) if specified.
  * `safety_score` must lie strictly between `0.00` and `100.00`.
* **Checks on Dates**:
  * `chk_trip_dates`: Enforces that `arrival_date` is greater than or equal to `departure_date` (or remains NULL for active trips).
* **Unique Constraints**:
  * Unique keys prevent duplicate business registration data for: `Roles.role_name`, `Users.email`, `Vehicles.registration_number`, `Drivers.license_number`, and `Drivers.phone`.

---

## 6. Seed Data Summary
Mock seed data has been prepared to facilitate fast testing and development using realistic values:

* **Vehicles (`seed.sql`)**: 10 records encompassing Trucks, Vans, Buses, and Mini Trucks.
* **Drivers (`driver_seed.sql`)**: 15 drivers with categories like `HMV`, `LMV`, `Truck`, `Bus` with varying safety scores and expiry dates.
* **Maintenance (`maintenance_seed.sql`)**: 15 records representing standard services (Oil Change, Brake Service, Engine Repair, Battery/Tyre Replacement).
* **Fuel (`fuel_seed.sql`)**: 20 logs covering different fuel types (`Diesel`, `Unleaded`), consumption in liters, and realistic fill-up costs.
* **Expenses (`expense_seed.sql`)**: 20 miscellaneous logs (Tolls, Insurance, Parking fees, Tracking system subscriptions).

---

## 7. Reporting Views

### 7.1. `FleetSummary`
Generates a complete picture of total operating expenditures and utilization metrics per vehicle. It aggregates active status, current odometer readings, historical trips count, total servicing expenditures, total fuel consumption (liters and cost), total operational expenses, and computes the complete **Total Cost of Ownership (TCO)** for each asset.

### 7.2. `MaintenanceSummary`
Aggregates maintenance data per vehicle. Tracks total maintenance events, breaks down active vs. completed tasks, reports the total and average maintenance spending, and exposes the last servicing date.

### 7.3. `FuelSummary`
Tracks fleet fuel efficiency and expenses. Reports the total fill-ups, sum of liters consumed, total fuel spending, average liters per fill-up, and calculates the exact average cost per liter.

### 7.4. `ExpenseSummary`
Captures non-maintenance, non-fuel expenses per vehicle (e.g. road taxes, registrations, insurance fees). Exposes total expense records, overall expense spending, average expense cost, and the latest transaction date.

### 7.5. `TripSummary`
Maintains operational productivity statistics per vehicle, tracking total trips, scheduling distributions (Scheduled, In Progress, Completed, Cancelled), and total/average cargo weight transported.
