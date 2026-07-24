import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { googleConnections } from "@/db/schema";
import { db } from "@/db";
import { verifySessionToken, COOKIE_NAME } from "@/lib/auth";
import { getOAuthCalendarClient } from "@/lib/google";
import { listEvents } from "@/lib/google/calendar";
import { listUpcomingEvents } from "@/lib/calendar/google";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const calendarId = process.env.GOOGLE_CALENDAR_ID;
    if (!calendarId) {
      return NextResponse.json({ error: "Calendar not configured", events: [] });
    }

    const cookie = request.cookies.get(COOKIE_NAME);
    let events: Awaited<ReturnType<typeof listUpcomingEvents>> = [];

    if (cookie) {
      const session = await verifySessionToken(cookie.value);
      if (session) {
        const [connection] = await db
          .select()
          .from(googleConnections)
          .where(eq(googleConnections.userId, session.userId))
          .limit(1);

        if (connection) {
          const calendar = await getOAuthCalendarClient({
            accessToken: connection.accessToken,
            refreshToken: connection.refreshToken,
            expiresAt: connection.expiresAt,
            scope: connection.scope,
            email: connection.email,
          });
          events = await listEvents(calendar, calendarId) as typeof events;
          return NextResponse.json({ events, method: "oauth" });
        }
      }
    }

    events = await listUpcomingEvents(calendarId);
    return NextResponse.json({ events, method: "service-account" });
  } catch (error) {
    console.error("[CALENDAR EVENTS ERROR]", error);
    return NextResponse.json({ error: "Failed to fetch events", events: [] }, { status: 500 });
  }
}
