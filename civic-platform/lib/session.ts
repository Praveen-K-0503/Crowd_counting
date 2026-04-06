export const SESSION_COOKIE_NAME = "civicpulse_session";

export type SessionUser = {
  id: string;
  fullName: string;
  email: string | null;
  role: "citizen" | "department_operator" | "municipal_admin" | "field_officer";
  departmentId: string | null;
  wardId: string | null;
};

export function encodeSession(user: SessionUser) {
  return Buffer.from(JSON.stringify(user), "utf8").toString("base64url");
}

export function decodeSession(value?: string) {
  if (!value) {
    return null;
  }

  try {
    const json =
      typeof Buffer !== "undefined"
        ? Buffer.from(value, "base64url").toString("utf8")
        : decodeURIComponent(escape(atob(value.replace(/-/g, "+").replace(/_/g, "/"))));
    const parsed = JSON.parse(json) as SessionUser;

    if (!parsed?.id || !parsed?.role) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}
