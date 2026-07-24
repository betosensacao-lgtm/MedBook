import { db } from "@/db";
import { chatSessions, chatMessages } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export interface DashboardStats {
  totalSessions: number;
  sessionsToday: number;
  totalMessages: number;
  messagesToday: number;
  recentSessions: Array<{
    sessionId: string;
    patientName: string | null;
    patientPhone: string | null;
    patientEmail: string | null;
    messageCount: number;
    createdAt: Date;
  }>;
}

export async function getDashboardStats(_clinicId?: string): Promise<DashboardStats> {
  const allSessions = await db.select().from(chatSessions);
  const allMessages = await db.select().from(chatMessages);

  const todayStr = new Date().toISOString().slice(0, 10);

  const sessionsToday = allSessions.filter(s => {
    const d = new Date(s.createdAt);
    return d.toISOString().slice(0, 10) === todayStr;
  });

  const messagesToday = allMessages.filter(m => {
    const d = new Date(m.createdAt);
    return d.toISOString().slice(0, 10) === todayStr;
  });

  const recent = [...allSessions]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 20);

  const recentSessions = recent.map(s => {
    const msgCount = allMessages.filter(m => m.sessionId === s.sessionId).length;
    return {
      sessionId: s.sessionId,
      patientName: s.patientName ?? null,
      patientPhone: s.patientPhone ?? null,
      patientEmail: s.patientEmail ?? null,
      messageCount: msgCount,
      createdAt: s.createdAt,
    };
  });

  return {
    totalSessions: allSessions.length,
    sessionsToday: sessionsToday.length,
    totalMessages: allMessages.length,
    messagesToday: messagesToday.length,
    recentSessions,
  };
}
