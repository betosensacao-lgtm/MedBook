import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { googleConnections } from "@/db/schema";
import { db } from "@/db";
import { verifySessionToken, COOKIE_NAME } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const cookie = request.cookies.get(COOKIE_NAME);
    if (!cookie) {
      return NextResponse.json({ connected: false, email: null });
    }

    const session = await verifySessionToken(cookie.value);
    if (!session) {
      return NextResponse.json({ connected: false, email: null });
    }

    const [connection] = await db
      .select({ email: googleConnections.email })
      .from(googleConnections)
      .where(eq(googleConnections.userId, session.userId))
      .limit(1);

    return NextResponse.json({
      connected: !!connection,
      email: connection?.email || null,
    });
  } catch {
    return NextResponse.json({ connected: false, email: null });
  }
}
