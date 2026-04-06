import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { db } from "../db/pool.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const sqlDir = path.resolve(__dirname, "../../sql");

async function run() {
  const fullPath = path.join(sqlDir, "002_seed_core_data.sql");
  const sql = await fs.readFile(fullPath, "utf8");
  await db.query(sql);
  console.log("Applied 002_seed_core_data.sql");
  await db.end();
}

run().catch(async (error) => {
  console.error("Database seed failed:");
  console.error(error instanceof Error ? error.message : error);
  await db.end().catch(() => undefined);
  process.exit(1);
});
