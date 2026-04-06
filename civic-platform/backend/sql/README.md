# SQL Files

## Current files

- `001_initial_schema.sql`
- `002_seed_core_data.sql`

## Usage

Apply the schema file to the `civicpulse` PostgreSQL database before running the complaint APIs.

Recommended order:

1. create database
2. apply `001_initial_schema.sql`
3. apply `002_seed_core_data.sql`
4. start backend

Future migrations should continue with:

- `003_...`
- `004_...`
