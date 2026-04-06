# Local Database Setup

## Goal

Connect the backend safely to the local PostgreSQL database named `civicpulse` and apply the initial schema without storing secrets in version control.

## Local database values

- Database name: `civicpulse`
- Database user: `postgres`
- Database port: `5432`

Set the password only in the local environment file, not in committed files.

## Step 1: Create the database

Use PostgreSQL and create the database:

```sql
CREATE DATABASE civicpulse;
```

## Step 2: Create the backend environment file

Create a real file at:

- `backend/.env`

Copy the contents of:

- `backend/.env.example`

Then set your local values for:

- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`

## Step 3: Apply the schema

Run the SQL file:

- `backend/sql/001_initial_schema.sql`

This creates the first schema for users, complaints, lifecycle history, routing, assignments, and notifications.

Then run:

- `backend/sql/002_seed_core_data.sql`

This inserts starter roles, departments, wards, domains, routing rules, and sample users used by the current frontend.

## Step 4: Install backend dependencies

From the `backend` folder:

```bash
npm install
```

## Step 5: Start the backend

From the `backend` folder:

```bash
npm run dev
```

## Step 6: Verify health endpoint

Open:

- `GET /api/health`

Expected response:

- status: `ok`
- service: `civicpulse-backend`

## Step 7: Verify complaint endpoints

Test:

- `GET /api/departments`
- `GET /api/domains`
- `GET /api/complaints`
- `POST /api/complaints`
- `GET /api/complaints/:id`

## Recommended next step after setup

Once the local DB is connected successfully:

1. add status update API
2. add assignment API
3. add citizen-specific complaint list API
4. connect frontend forms to backend

## Notes

- Keep `backend/.env` local only.
- Do not commit passwords.
- Use the health route first before testing complaint APIs.
