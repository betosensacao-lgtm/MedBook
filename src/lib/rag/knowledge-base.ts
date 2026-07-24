import { db } from "@/db";
import { clinicContext } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export interface ContextEntry {
  id: string;
  clinicId: string;
  key: string;
  content: string;
  updatedAt: Date;
}

export async function getClinicContext(clinicId: string): Promise<string> {
  const entries = await db
    .select({ key: clinicContext.key, content: clinicContext.content })
    .from(clinicContext)
    .where(eq(clinicContext.clinicId, clinicId));

  if (entries.length === 0) return "";

  return entries
    .map((e) => `[${e.key}]\n${e.content}`)
    .join("\n\n");
}

export async function upsertContextEntry(
  clinicId: string,
  key: string,
  content: string
): Promise<void> {
  const existing = await db
    .select({ id: clinicContext.id })
    .from(clinicContext)
    .where(
      and(
        eq(clinicContext.clinicId, clinicId),
        eq(clinicContext.key, key)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(clinicContext)
      .set({ content, updatedAt: new Date() } as any)
      .where(eq(clinicContext.id, existing[0].id));
  } else {
    await db.insert(clinicContext).values({ clinicId, key, content } as any);
  }
}

export async function getAllContext(clinicId: string): Promise<ContextEntry[]> {
  return db
    .select()
    .from(clinicContext)
    .where(eq(clinicContext.clinicId, clinicId))
    .orderBy(clinicContext.key);
}
