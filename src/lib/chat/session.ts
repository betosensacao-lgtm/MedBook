import { db } from "@/db";
import { chatSessions, chatMessages } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
}

export async function getOrCreateSession(sessionId: string, clinicId?: string): Promise<string> {
  const existing = await db
    .select({ id: chatSessions.sessionId })
    .from(chatSessions)
    .where(eq(chatSessions.sessionId, sessionId))
    .limit(1);

  if (existing.length > 0) return existing[0].id;

  await db.insert(chatSessions).values({ sessionId, clinicId } as any);
  return sessionId;
}

export async function getChatMessages(sessionId: string): Promise<ChatMessage[]> {
  return db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.sessionId, sessionId))
    .orderBy(asc(chatMessages.createdAt));
}

export async function saveChatMessage(
  sessionId: string,
  role: "user" | "assistant",
  content: string
): Promise<void> {
  await db.insert(chatMessages).values({ sessionId, role, content } as any);
}
