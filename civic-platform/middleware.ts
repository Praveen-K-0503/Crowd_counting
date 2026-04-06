import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { decodeSession, SESSION_COOKIE_NAME } from "@/lib/session";

const citizenRoutes = ["/complaints", "/report"];
const adminRoutes = ["/dashboard"];
const fieldRoutes = ["/tasks"];
const sharedRoutes = ["/notifications"];

export function middleware(request: NextRequest) {
  const session = decodeSession(request.cookies.get(SESSION_COOKIE_NAME)?.value);
  const { pathname } = request.nextUrl;

  if (pathname === "/login" && session) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = session.role === "citizen" ? "/complaints" : "/dashboard";
    return NextResponse.redirect(redirectUrl);
  }

  if (citizenRoutes.some((route) => pathname.startsWith(route)) && !session) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    return NextResponse.redirect(redirectUrl);
  }

  if (
    adminRoutes.some((route) => pathname.startsWith(route)) &&
    (!session || (session.role !== "department_operator" && session.role !== "municipal_admin"))
  ) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = session ? session.role === "field_officer" ? "/tasks" : "/complaints" : "/login";
    return NextResponse.redirect(redirectUrl);
  }

  if (
    fieldRoutes.some((route) => pathname.startsWith(route)) &&
    (!session || session.role !== "field_officer")
  ) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = session ? session.role === "citizen" ? "/complaints" : "/dashboard" : "/login";
    return NextResponse.redirect(redirectUrl);
  }

  if (sharedRoutes.some((route) => pathname.startsWith(route)) && !session) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/complaints/:path*", "/report/:path*", "/dashboard/:path*", "/tasks/:path*", "/notifications/:path*", "/login"],
};
