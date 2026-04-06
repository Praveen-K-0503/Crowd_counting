# Backend Structure

## Goal

Create a clean backend foundation for the civic platform so PostgreSQL integration, complaint APIs, routing logic, and lifecycle actions can be implemented in a scalable way.

## Chosen backend direction

- Node.js
- TypeScript
- Express
- PostgreSQL

## Why this structure

- Easy to integrate with the existing Next.js frontend
- Clear separation between API, config, database, and feature modules
- Good for iterative development
- Simple to extend with queues, background jobs, and AI services later

## Backend folder layout

- `backend/package.json`
- `backend/tsconfig.json`
- `backend/.env.example`
- `backend/src/server.ts`
- `backend/src/app.ts`
- `backend/src/config/env.ts`
- `backend/src/db/pool.ts`
- `backend/src/routes/health.ts`
- `backend/src/modules/complaints/`
- `backend/src/modules/users/`
- `backend/src/modules/departments/`
- `backend/src/modules/routing/`
- `backend/src/modules/notifications/`

## Initial module responsibilities

### config

- load environment variables
- validate required settings

### db

- create PostgreSQL connection pool
- export shared database client

### routes

- register top-level routes
- keep health and system routes separate

### modules/complaints

- create complaint
- fetch complaint list
- fetch complaint detail
- update complaint status
- add complaint notes

First files:

- `complaint.types.ts`
- `complaint.repository.ts`
- `complaint.service.ts`
- `complaint.routes.ts`

### modules/users

- auth support later
- profile and role data

### modules/departments

- department metadata
- queue views
- assignment support

### modules/routing

- domain-to-department rules
- priority scoring
- escalation logic

### modules/notifications

- notification creation
- read and mark as read later

## Environment variables

Use environment config, not hard-coded secrets.

Recommended variables:

- `PORT`
- `NODE_ENV`
- `DB_HOST`
- `DB_PORT`
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`
- `DB_SSL`

## API direction for the first phase

### Health

- `GET /api/health`

### Complaints

- `POST /api/complaints`
- `GET /api/complaints`
- `GET /api/complaints/:id`
- `PATCH /api/complaints/:id/status`
- `POST /api/complaints/:id/assign`

### Citizen

- `GET /api/citizens/:id/complaints`

Current simplified route:

- `GET /api/complaints/citizen/:citizenId`

### Admin

- `GET /api/admin/complaints`
- `GET /api/admin/complaints/:id`
- `POST /api/admin/complaints/:id/assign`

## Notes

- Keep the backend stateless.
- Keep validation and business logic out of route files.
- Add auth after the complaint workflow is stable.
