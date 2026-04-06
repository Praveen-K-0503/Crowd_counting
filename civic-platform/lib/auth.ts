import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { decodeSession, SESSION_COOKIE_NAME, type SessionUser } from "@/lib/session";

export async function getCurrentUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  return decodeSession(cookieStore.get(SESSION_COOKIE_NAME)?.value);
}

export async function requireUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function requireRole(allowedRoles: SessionUser["role"][]) {
  const user = await requireUser();

  if (!allowedRoles.includes(user.role)) {
    redirect(user.role === "citizen" ? "/complaints" : user.role === "field_officer" ? "/tasks" : "/");
  }

  return user;
}
