# Backend

Node.js and TypeScript backend for the CivicPulse project.

## Quick start

1. Copy `.env.example` to `.env`
2. Set your PostgreSQL connection values
3. Create the `civicpulse` database
4. Apply `sql/001_initial_schema.sql`
5. Apply `sql/002_seed_core_data.sql`
6. Run `npm install`
7. Run `npm run dev`

Alternative local setup:

- Run `npm run db:init` to apply both SQL files using the configured PostgreSQL connection

## Main folders

- `src/config` environment config
- `src/db` PostgreSQL connection
- `src/routes` shared routes
- `src/modules/complaints` complaint APIs
- `sql` database schema files

## First routes

- `GET /api/health`
- `GET /api/departments`
- `GET /api/domains`
- `GET /api/complaints`
- `GET /api/complaints/citizen/:citizenId`
- `GET /api/complaints/:id`
- `GET /api/complaints/:id/history`
- `POST /api/complaints`
- `PATCH /api/complaints/:id/status`
- `POST /api/complaints/:id/assign`
