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
      .select({ sessionId: chatSessions.sessionId })
      .from(chatSessions)
      .where(eq(chatSessions.patientEmail, email.toLowerCase().trim()));

    let deletedMessages = 0;
    let deletedSessions = 0;

    for (const s of sessions) {
      // Delete messages first
      const msgs = await db
        .delete(chatMessages)
        .where(eq(chatMessages.sessionId, s.sessionId))
        .returning({ id: chatMessages.id });

      deletedMessages += msgs.length;
      deletedSessions++;
    }

    // Delete sessions
    await db
      .delete(chatSessions)
      .where(eq(chatSessions.patientEmail, email.toLowerCase().trim()));

    // Anonymize patient data in remaining records
    await db
      .update(chatSessions)
      .set({
        patientName: null,
        patientPhone: null,
        patientEmail: null,
      } as any)
      .where(eq(chatSessions.patientEmail, email.toLowerCase().trim()));

    console.log(`[LGPD Delete] Deleted ${deletedSessions} sessions and ${deletedMessages} messages for ${email}`);

    return NextResponse.json({
      message: `Data deleted successfully: ${deletedSessions} session(s) and ${deletedMessages} message(s).`,
      deletedSessions,
      deletedMessages,
    });
  } catch (error) {
    console.error("[LGPD Delete API] Error:", error);
    return NextResponse.json(
      { error: "Error deleting data" },
      { status: 500 }
    );
  }
}
