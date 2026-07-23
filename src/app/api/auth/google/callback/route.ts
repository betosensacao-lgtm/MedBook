import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getTokensFromCode } from "@/lib/google";
import { googleConnections } from "@/db/schema";
import { db } from "@/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const googleError = searchParams.get("error");

    if (googleError) {
      console.error("[GOOGLE CALLBACK]", googleError);
      return NextResponse.redirect(new URL("/admin?google=error", request.url));
    }

    if (!code) {
      return NextResponse.redirect(new URL("/admin?google=no_code", request.url));
    }

    const tokens = await getTokensFromCode(code);

    // TODO: get userId from session (Supabase Auth)
    const userId = "system";

    const existing = await db
      .select()
      .from(googleConnections)
      .where(eq(googleConnections.userId, userId))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(googleConnections)
        .set({
          email: tokens.email,
          scope: tokens.scope,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresAt: tokens.expiresAt,
          updatedAt: new Date(),
        })
        .where(eq(googleConnections.userId, userId));
    } else {
      await db.insert(googleConnections).values({
        userId,
        email: tokens.email,
        scope: tokens.scope,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresAt,
      });
    }

    return NextResponse.redirect(new URL("/admin?google=connected", request.url));
  } catch (error) {
    console.error("[GOOGLE CALLBACK ERROR]", error);
    return NextResponse.redirect(new URL("/admin?google=error", request.url));
  }
}
