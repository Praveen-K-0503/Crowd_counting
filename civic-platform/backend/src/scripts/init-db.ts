import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { db } from "../db/pool.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const sqlDir = path.resolve(__dirname, "../../sql");

async function markLegacyMigrations() {
  const rolesCheck = await db.query<{ exists: string | null }>(
    `SELECT to_regclass('public.roles')::text AS exists`,
  );

  if (rolesCheck.rows[0]?.exists) {
    await db.query(
      `
        INSERT INTO schema_migrations (file_name)
        VALUES ('001_initial_schema.sql')
        ON CONFLICT (file_name) DO NOTHING
      `,
    );
  }

  const seedCheck = await db.query<{ hasSeed: boolean }>(
    `
      SELECT EXISTS (SELECT 1 FROM domains LIMIT 1)
         AND EXISTS (SELECT 1 FROM departments LIMIT 1)
         AND EXISTS (SELECT 1 FROM users LIMIT 1) AS "hasSeed"
    `,
  );

  if (seedCheck.rows[0]?.hasSeed) {
    await db.query(
      `
        INSERT INTO schema_migrations (file_name)
        VALUES ('002_seed_core_data.sql')
        ON CONFLICT (file_name) DO NOTHING
      `,
    );
  }
}

async function run() {
  const files = ["001_initial_schema.sql", "002_seed_core_data.sql", "003_performance_indexes.sql"];

  await db.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id BIGSERIAL PRIMARY KEY,
      file_name TEXT NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await markLegacyMigrations();

  for (const file of files) {
    const existing = await db.query<{ file_name: string }>(
      `
        SELECT file_name
        FROM schema_migrations
        WHERE file_name = $1
        LIMIT 1
      `,
      [file],
    );

    if (existing.rows[0]) {
      console.log(`Skipped ${file}`);
      continue;
    }

    const fullPath = path.join(sqlDir, file);
    const sql = await fs.readFile(fullPath, "utf8");
    await db.query(sql);
    await db.query(`INSERT INTO schema_migrations (file_name) VALUES ($1)`, [file]);
    console.log(`Applied ${file}`);
  }

  await db.end();
}

run().catch(async (error) => {
  console.error("Database initialization failed:");
  console.error(error instanceof Error ? error.message : error);
  await db.end().catch(() => undefined);
  process.exit(1);
});
