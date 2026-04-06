import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import pool from "@/lib/db";
import { encodeSession, SESSION_COOKIE_NAME, type SessionUser } from "@/lib/session";

type UserRow = SessionUser & { passwordHash: string | null };

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { email?: string; password?: string };
    const email = body.email?.trim().toLowerCase() ?? "";
    const password = body.password ?? "";

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }
    if (!password) {
      return NextResponse.json({ error: "Password is required" }, { status: 400 });
    }

    // Query users table joined with roles
    const result = await pool.query<UserRow>(
      `SELECT
         u.id,
         u.full_name   AS "fullName",
         u.email,
         r.name        AS role,
         u.department_id AS "departmentId",
         u.ward_id     AS "wardId",
         u.password_hash AS "passwordHash"
       FROM users u
       INNER JOIN roles r ON r.id = u.role_id
       WHERE lower(u.email) = $1
         AND u.is_active = TRUE
       LIMIT 1`,
      [email],
    );

    const user = result.rows[0] ?? null;

    if (!user) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    // Support both real bcrypt hashes AND the dev-placeholder-hash used in seed data
    let passwordValid = false;
    if (user.passwordHash === "dev-placeholder-hash" && password === "civicpulse123") {
      passwordValid = true;
    } else if (user.passwordHash) {
      passwordValid = await bcrypt.compare(password, user.passwordHash);
    }

    if (!passwordValid) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const { passwordHash: _ph, ...sessionUser } = user;
    const cookieStore = await cookies();

    cookieStore.set(SESSION_COOKIE_NAME, encodeSession(sessionUser), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 12,
    });

    return NextResponse.json({ data: sessionUser });
  } catch (error) {
    console.error("[login] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Login failed" },
      { status: 500 },
    );
  }
}
