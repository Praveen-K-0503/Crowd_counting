import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import pool from "@/lib/db";
import { encodeSession, SESSION_COOKIE_NAME, type SessionUser } from "@/lib/session";

type UserRow = SessionUser & { passwordHash: string | null };

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      fullName?: string;
      email?: string;
      phone?: string;
      password?: string;
    };

    const fullName = body.fullName?.trim() ?? "";
    const email = body.email?.trim().toLowerCase() ?? "";
    const phone = body.phone?.trim() || null;
    const password = body.password ?? "";

    // Validation
    if (!fullName) {
      return NextResponse.json({ error: "Full name is required" }, { status: 400 });
    }
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }
    if (!password || password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    // Check if email already exists
    const existing = await pool.query("SELECT id FROM users WHERE lower(email) = $1", [email]);
    if (existing.rows.length > 0) {
      return NextResponse.json({ error: "An account already exists for this email" }, { status: 409 });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Look up citizen role ID
    const roleResult = await pool.query("SELECT id FROM roles WHERE name = 'citizen' LIMIT 1");
    const roleId = roleResult.rows[0]?.id;
    if (!roleId) {
      return NextResponse.json({ error: "Citizen role is not configured in the database" }, { status: 500 });
    }

    // Insert new user
    const insertResult = await pool.query<UserRow>(
      `INSERT INTO users (full_name, email, phone, password_hash, role_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING
         id,
         full_name   AS "fullName",
         email,
         'citizen'   AS role,
         department_id AS "departmentId",
         ward_id     AS "wardId",
         password_hash AS "passwordHash"`,
      [fullName, email, phone, passwordHash, roleId],
    );

    const user = insertResult.rows[0];
    const { passwordHash: _ph, ...sessionUser } = user;

    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, encodeSession(sessionUser), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 12,
    });

    return NextResponse.json({ data: sessionUser }, { status: 201 });
  } catch (error) {
    console.error("[register] Error:", error);
    const message = error instanceof Error ? error.message : "Registration failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
