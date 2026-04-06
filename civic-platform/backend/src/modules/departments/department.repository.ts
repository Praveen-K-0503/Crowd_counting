import { db } from "../../db/pool.js";

export async function listDepartments() {
  const result = await db.query(
    `
      SELECT
        id,
        name,
        code,
        description,
        is_emergency AS "isEmergency",
        is_active AS "isActive"
      FROM departments
      WHERE is_active = TRUE
      ORDER BY is_emergency DESC, name ASC
    `,
  );

  return result.rows;
}
