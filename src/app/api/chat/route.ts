export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import { runChatGraph } from "@/lib/langgraph/graph";
import { getOrCreateSession, getChatMessages, saveChatMessage } from "@/lib/chat/session";
import { db } from "@/db";
import { chatSessions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { checkPatientMessage, checkAssistantReply } from "@/lib/security/guardrails";
import { checkChatRateLimit } from "@/lib/security/rate-limit";

const NAME_PATTERNS = [
  /my name is (.+?)(?:,|\.|!|\?|$)/i,
  /i'?m called (.+?)(?:,|\.|!|\?|$)/i,
  /this is (.+?)(?:,|\.|!|\?|$)/i,
];

const PHONE_PATTERNS = [
  /\(?\d{2}\)?\s?\d{4,5}-?\d{4}/g,
];

function extractName(text: string): string | null {
  for (const pattern of NAME_PATTERNS) {
    const match = text.match(pattern);
    if (match) return match[1].trim();
  }
  return null;
}

function extractPhone(text: string): string | null {
  const digits = text.replace(/\D/g, "");
  if (digits.length >= 10 && digits.length <= 11) {
    return digits;
  }
  return null;
}

async function updatePatientInfo(sessionId: string) {
  const messages = await getChatMessages(sessionId);
  const userMessages = messages.filter(m => m.role === "user");
  const allText = userMessages.map(m => m.content).join(" ");

  const name = extractName(allText);
  const phone = extractPhone(allText);

  if (name || phone) {
    const update: Record<string, string> = {};
    if (name) update.patientName = name;
    if (phone) update.patientPhone = phone;
    await db.update(chatSessions).set(update).where(eq(chatSessions.sessionId, sessionId));
  }
}

export async function POST(request: NextRequest) {
  try {
    const { message, sessionId: incomingId } = await request.json();

    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const clinicId = process.env.CLINIC_ID || "default";
    const sessionId = incomingId || crypto.randomUUID();

    // Rate limiting
    const limit = await checkChatRateLimit(request);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Message limit reached. Please wait a moment." },
        {
          status: 429,
          headers: { "Retry-After": String(Math.ceil(limit.retryAfterMs / 1000)) },
        },
      );
    }

    // Apply guardrails (input inspection + injection neutralisation)
    const safeMessage = checkPatientMessage(message, sessionId, clinicId);

    await getOrCreateSession(sessionId, clinicId);

    const history = await getChatMessages(sessionId);

    const historyMessages = history.map((m) =>
      m.role === "user" ? new HumanMessage(m.content) : new AIMessage(m.content)
    );

    const result = await runChatGraph({
      messages: [...historyMessages, new HumanMessage(safeMessage)],
      sessionId,
      clinicId,
    }, sessionId);

    const lastMessage = result.messages[result.messages.length - 1];
    let reply =
      typeof lastMessage?.content === "string"
        ? lastMessage.content
        : "Sorry, an error occurred while processing your message.";

    // Validate output (redact any leaked secret); the adapter logs internally
    reply = checkAssistantReply(reply, sessionId, clinicId);

    await saveChatMessage(sessionId, "user", message);
    await saveChatMessage(sessionId, "assistant", reply);

    await updatePatientInfo(sessionId);

    return NextResponse.json({ reply, sessionId });
  } catch (error) {
    console.error("[Chat API] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
