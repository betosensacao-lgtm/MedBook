import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, COOKIE_NAME } from "@/lib/auth";
import { db } from "@/db";
import { chatSessions, chatMessages } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const cookie = request.cookies.get(COOKIE_NAME);
    if (!cookie) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const session = await verifySessionToken(cookie.value);
    if (!session) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Find sessions with this email
    const sessions = await db
      .select()
      .from(chatSessions)
      .where(eq(chatSessions.patientEmail, email.toLowerCase().trim()));

    if (sessions.length === 0) {
      return NextResponse.json({
        message: "No data found for this email.",
      });
    }

    // Collect all data
    const userData: Record<string, unknown>[] = [];

    for (const s of sessions) {
      const messages = await db
        .select()
        .from(chatMessages)
        .where(eq(chatMessages.sessionId, s.sessionId))
        .orderBy(chatMessages.createdAt);

      userData.push({
        sessionId: s.sessionId,
        name: s.patientName,
        phone: s.patientPhone,
        email: s.patientEmail,
        createdAt: s.createdAt,
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
          createdAt: m.createdAt,
        })),
      });
    }

    // In production, send email with JSON attachment
    console.log(`[LGPD Export] Data export request for ${email}: ${sessions.length} sessions`);

    return NextResponse.json({
      message: `Request submitted. Found ${sessions.length} record(s). Your data will be sent by email within 48h.`,
      recordCount: sessions.length,
      // In dev, return the data directly
      ...(process.env.NODE_ENV !== "production" && { data: userData }),
    });
  } catch (error) {
    console.error("[LGPD Export API] Error:", error);
    return NextResponse.json(
      { error: "Error processing request" },
      { status: 500 }
    );
  }
}
