"use server";

import { upsertContextEntry as upsert } from "@/lib/rag/knowledge-base";

export async function upsertContextEntry(clinicId: string, key: string, content: string) {
  try {
    await upsert(clinicId, key, content);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error saving",
    };
  }
}
