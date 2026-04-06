import { db } from "../../db/pool.js";
import type { UserContext } from "./user.types.js";

export async function getUserContext(userId: string): Promise<UserContext | null> {
  const result = await db.query<UserContext>(
    `
      SELECT
        u.id,
        u.full_name AS "fullName",
        u.email,
        r.name AS role,
        u.department_id AS "departmentId",
        d.name AS "departmentName",
        u.ward_id AS "wardId"
      FROM users u
      INNER JOIN roles r ON r.id = u.role_id
      LEFT JOIN departments d ON d.id = u.department_id
      WHERE u.id = $1
        AND u.is_active = TRUE
      LIMIT 1
    `,
    [userId],
  );

  return result.rows[0] ?? null;
}

export async function listFieldOfficers(departmentId?: string): Promise<UserContext[]> {
  const result = await db.query<UserContext>(
    `
      SELECT
        u.id,
        u.full_name AS "fullName",
        u.email,
        r.name AS role,
        u.department_id AS "departmentId",
        d.name AS "departmentName",
        u.ward_id AS "wardId"
      FROM users u
      INNER JOIN roles r ON r.id = u.role_id
      LEFT JOIN departments d ON d.id = u.department_id
      WHERE r.name = 'field_officer'
        AND u.is_active = TRUE
        AND ($1::uuid IS NULL OR u.department_id = $1::uuid)
      ORDER BY u.full_name ASC
    `,
    [departmentId ?? null],
  );

  return result.rows;
}

