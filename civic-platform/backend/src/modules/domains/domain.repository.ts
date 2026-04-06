import { db } from "../../db/pool.js";

export async function listDomains() {
  const result = await db.query(
    `
      SELECT
        id,
        name,
        description,
        is_emergency AS "isEmergency",
        is_active AS "isActive"
      FROM domains
      WHERE is_active = TRUE
      ORDER BY is_emergency ASC, name ASC
    `,
  );

  return result.rows;
}
