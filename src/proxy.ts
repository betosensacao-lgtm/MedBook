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

// Este arquivo trazia sua própria cópia do encadeamento
// `JWT_SECRET || ADMIN_PASSWORD || "<literal público>"` e sua própria
// verificação, sem fixar o algoritmo. Passar pelo agent-core elimina o
// fallback e garante que middleware e rotas validem sessão do mesmo jeito.

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
