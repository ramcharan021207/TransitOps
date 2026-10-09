# TransitOps 🚚

**TransitOps is a fleet and transit operations management system** built to organize drivers, vehicles, trips, maintenance, fuel records, and operating expenses in one place.

Developed as a hackathon project, TransitOps combines a browser-based dashboard with a Node.js/Express API and a MySQL relational database.

## Features

- **Dashboard:** a central overview of fleet and operational activity.
- **Driver management:** maintain driver details, licence information and expiry dates, contact numbers, safety scores, and availability status.
- **Fleet management:** record vehicle registration, type, capacity, odometer reading, acquisition cost, and status.
- **Trip management:** manage trip origin and destination, assigned driver and vehicle, departure and arrival times, cargo details, and trip status.
- **Maintenance tracking:** record services, dates, costs, and maintenance status.
- **Fuel tracking:** log fuel type, quantity, date, and cost.
- **Expense tracking:** keep vehicle-related operational expenses such as tolls, parking, insurance, and other costs.
- **Reports and analytics:** backend reporting routes and database documentation for fleet and operating-cost summaries.
- **Relational database:** MySQL tables with keys, constraints, indexes, and sample seed data.

> The exact functionality available in a running instance depends on the database setup and on which frontend/API flows have been configured and tested.

## Tech Stack

| Layer | Technologies |
|---|---|
| Frontend | HTML, CSS, JavaScript |
| Backend | Node.js, Express.js |
| Database | MySQL |
| Database driver | `mysql2` |
| Configuration and middleware | `dotenv`, `cors` |

## Repository Structure

```text
TransitOps/
├── Database/
│   ├── database_documentation.md
│   ├── schema.sql
│   ├── seed.sql
│   ├── driver_seed.sql
│   ├── trip_schema.sql
│   ├── maintenance_schema.sql
│   ├── maintenance_seed.sql
│   ├── fuel_schema.sql
│   ├── fuel_seed.sql
│   ├── expense_schema.sql
│   ├── expense_seed.sql
│   └── indexes.sql
├── backend/
│   ├── config/
│   │   └── db.js
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   ├── server.js
│   └── package.json
├── fronten_ui/
│   ├── dashboard.html
│   ├── drivers.html
│   ├── fleet.html
│   ├── trips.html
│   ├── maintenance.html
│   ├── fuel.html
│   ├── login.html
│   └── global.css
└── frontend_logic/
    ├── common.js
    ├── analytics.js
    ├── drivers.js
    ├── fleet.js
    ├── trips.js
    ├── maintenance.js
    └── fuel.js
```

**Note:** The UI folder is currently named `fronten_ui` in the repository. The tree above keeps that existing name so the paths are copyable.

## Getting Started

### Prerequisites

Install:

- [Node.js](https://nodejs.org/) (LTS recommended)
- [MySQL](https://dev.mysql.com/downloads/)
- [Git](https://git-scm.com/)

### 1. Clone the repository

```bash
git clone https://github.com/ramcharan021207/TransitOps.git
cd TransitOps
```

### 2. Create the MySQL database

Start your MySQL server and create the database:

```sql
CREATE DATABASE transitops;
```

Open MySQL Workbench or another MySQL client and execute the SQL scripts in the `Database/` folder. Use `database_documentation.md` as the guide to the schema and relationships. Run the core schema and the additional schema files for trips, maintenance, fuel, and expenses on a fresh database; then run the matching seed files if you want sample records.

**Important:** Some schema files create tables or indexes and may not be safe to run repeatedly. Use a fresh database for initial setup, and check the existing schema before rerunning scripts.

### 3. Configure environment variables

Inside `backend/`, create a local `.env` file with your own MySQL settings:

```env
PORT=5000
DB_HOST=localhost
DB_USER=your_mysql_user
DB_PASSWORD=your_mysql_password
DB_NAME=transitops
JWT_SECRET=replace_with_a_long_random_secret
```

Adjust these values to match your local environment. Do not commit real credentials or secrets to version control. If the repository contains a tracked `.env`, remove it from version control and keep local secrets in an ignored file before deploying or sharing the project further.

### 4. Install backend dependencies

From the repository root:

```bash
cd backend
npm install express cors dotenv mysql2
```

These are the packages directly used by the current backend entry point and MySQL connection module. If additional packages are introduced during development, add them to the backend dependency list as well.

### 5. Start the backend server

From `backend/`, run:

```bash
node server.js
```

The server uses port `5000` by default. To use another port, set `PORT` in your `.env` file.

### 6. Open the frontend

Open `fronten_ui/login.html` or `fronten_ui/dashboard.html` in your browser. Make sure the backend is running and the API base URL configured in the frontend JavaScript matches your local backend address.

## API Route Groups

The Express app mounts these route groups:

| Resource | Base path |
|---|---|
| Authentication | `/api/auth` |
| Vehicles | `/api/vehicles` |
| Drivers | `/api/drivers` |
| Trips | `/api/trips` |
| Maintenance | `/api/maintenance` |
| Fuel | `/api/fuel` |
| Expenses | `/api/expenses` |
| Reports | `/api/reports` |

The exact operations and request fields are defined in `backend/routes/` and `backend/controllers/`. For example, the current driver routes include listing drivers, retrieving one driver, creating, updating, and deleting a driver.

The server formats responses in a common structure:

```json
{
  "success": true,
  "data": {}
}
```

Errors use this structure:

```json
{
  "success": false,
  "message": "Error description"
}
```

## Database Overview

The relational data model covers these main entities:

- **Roles and Users:** application user details and role assignments.
- **Drivers:** licence, contact, safety score, and availability information.
- **Vehicles:** vehicle identity, capacity, mileage, cost, and status.
- **Trips:** vehicle/driver assignments, routes, schedule, cargo, and trip status.
- **Maintenance:** service history and related costs.
- **FuelLogs:** fuel records, quantities, and costs.
- **Expenses:** additional vehicle-related operating expenses.

Foreign keys connect trips and vehicle-cost records to their associated vehicles and drivers. Unique and check constraints support data integrity, while indexes are defined to support common lookups and reports. Consult `Database/database_documentation.md` for the documented design and reporting summaries.

## Security and Deployment Notes

- Use a dedicated MySQL account with only the privileges the application needs; avoid using the MySQL `root` account in production.
- Keep `.env` out of Git and use a strong, unique secret for any token-based authentication.
- Validate all incoming data and add authentication and role-based authorization to protected endpoints before production use.
- The current authentication route file is a placeholder; do not assume the login UI alone provides secure authentication.
- Test frontend-to-backend integration, error handling, and database setup in the target environment before deploying.

## Contributing

1. Fork the repository.
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m "Describe your change"`
4. Push the branch and open a pull request.

## License

No explicit license is currently documented in the repository. Contact the repository owner before reusing or redistributing the project.

---

**TransitOps — one place to manage your fleet operations.**
