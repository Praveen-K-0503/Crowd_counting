import { db } from "../../db/pool.js";
import type { AuthUser, RegisterInput } from "./auth.types.js";

type AuthUserRow = AuthUser & {
  passwordHash: string | null;
};

export async function getUserForLogin(email: string): Promise<AuthUserRow | null> {
  const result = await db.query<AuthUserRow>(
    `
      SELECT
        u.id,
        u.full_name AS "fullName",
        u.email,
        r.name AS role,
        u.department_id AS "departmentId",
        u.ward_id AS "wardId",
        u.password_hash AS "passwordHash"
      FROM users u
      INNER JOIN roles r ON r.id = u.role_id
      WHERE lower(u.email) = lower($1)
        AND u.is_active = TRUE
      LIMIT 1
    `,
    [email],
  );

  return result.rows[0] ?? null;
}

export async function createCitizenUser(input: RegisterInput): Promise<AuthUserRow> {
  const result = await db.query<AuthUserRow>(
    `
      INSERT INTO users (
        full_name,
        email,
        phone,
        password_hash,
        role_id
      )
      SELECT
        $1,
        lower($2),
        $3,
        $4,
        r.id
      FROM roles r
      WHERE r.name = 'citizen'
      RETURNING
        id,
        full_name AS "fullName",
        email,
        'citizen' AS role,
        department_id AS "departmentId",
        ward_id AS "wardId",
        password_hash AS "passwordHash"
    `,
    [input.fullName, input.email, input.phone ?? null, input.password],
  );

  const user = result.rows[0];

  if (!user) {
    throw new Error("Citizen role is not configured");
  }

  return user;
}
