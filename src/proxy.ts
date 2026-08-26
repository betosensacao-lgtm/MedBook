import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  verifySessionToken,
  DEFAULT_COOKIE_NAME as COOKIE_NAME,
} from "@betosensacao-lgtm/agent-core";

interface SessionPayload {
  userId: string;
  email: string;
  role: "admin" | "super_admin";
  clinicId: string | null;
}

// This file used to carry its own copy of the
// `JWT_SECRET || ADMIN_PASSWORD || "<public literal>"` chain and its own
// verification, without pinning the algorithm. Going through agent-core
// removes the fallback and makes the middleware and the routes validate a
// session the same way.

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname === "/admin/login" ||
    pathname === "/admin/signup" ||
    pathname === "/admin/forgot-password" ||
    pathname === "/admin/reset-password"
  ) {
    return NextResponse.next();
  }

  const cookie = request.cookies.get(COOKIE_NAME);
  if (!cookie) {
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const session = await verifySessionToken<SessionPayload>(cookie.value);
  if (!session) {
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const response = NextResponse.next();
  response.headers.set("x-user-id", session.userId);
  response.headers.set("x-user-email", session.email);
  response.headers.set("x-user-role", session.role);
  if (session.clinicId) {
    response.headers.set("x-clinic-id", session.clinicId);
  }

  return response;
}

export const config = {
  matcher: "/admin/:path*",
};
