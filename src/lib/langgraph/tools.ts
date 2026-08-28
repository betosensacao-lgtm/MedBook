import { DynamicStructuredTool } from "@langchain/core/tools";
import { ToolMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";
import { getClinicContext } from "@/lib/rag/knowledge-base";
import { db } from "@/db";
import { appointments, preAnamnesis, triageSessions, chatSessions, users, clinics, professionals } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getAvailability } from "@/lib/scheduling/availability";
import { toMinutes, toTimeString } from "@/lib/scheduling/slots";

// ─── Appointment Scheduling Tool ─────────────────────────────────────────────

export const checkCalendarTool = new DynamicStructuredTool({
  name: "check_calendar",
  description:
    "Looks up real available time slots for the clinic on a given date, computed from each professional's working hours and the appointments already booked. When availability cannot be determined it returns success:false with a reason — in that case tell the patient you could not check, and never guess or offer times.",
  schema: z.object({
    // No clinicId here on purpose: the server knows which clinic it serves, and
    // a model asked for one will invent something like "default", which used to
    // blow up the uuid cast and take the whole lookup down with it.
    professionalId: z
      .string()
      .optional()
      .describe("Professional ID, only if the patient already chose one. Omit otherwise."),
    date: z.string().describe("Date in YYYY-MM-DD format"),
  }),
  func: async ({ date, professionalId }) => {
    const result = await getAvailability({
      date,
      clinicId: process.env.CLINIC_ID,
      professionalId,
    });
    return JSON.stringify(result);
  },
});

export const createEventTool = new DynamicStructuredTool({
  name: "create_event",
  description: "Creates an appointment at the clinic and registers the patient in the database.",
  schema: z.object({
    clinicId: z.string().optional().describe("Clinic ID"),
    professionalId: z.string().optional().describe("Professional ID"),
    patientName: z.string().describe("Patient's name"),
    patientPhone: z.string().describe("Patient's phone number"),
    patientEmail: z.string().optional().describe("Patient's email"),
    date: z.string().describe("Date in YYYY-MM-DD format"),
    time: z.string().describe("Time in HH:MM format"),
    notes: z.string().optional().describe("Notes or reason for the appointment"),
  }),
  func: async ({ patientName, patientPhone, patientEmail, date, time, notes }) => {
    try {
      // 1. Get or create default clinic & professional
      let clinicList = await db.select().from(clinics).limit(1);
      let clinic = clinicList[0];
      if (!clinic) {
        let userList = await db.select().from(users).limit(1);
        let owner = userList[0];
        if (!owner) {
          [owner] = await db.insert(users).values({
            email: "admin@medbook.dev",
            name: "Dr. Admin",
            role: "clinic_admin",
            supabaseId: `sb-${crypto.randomUUID()}`,
          } as any).returning();
        }
        [clinic] = await db.insert(clinics).values({
          name: "MedBook Health Clinic",
          slug: "medbook-health",
          specialty: "general_practice",
          phone: patientPhone || "+1 555 123 4567",
          email: "contact@medbook.dev",
          ownerId: owner.id,
        } as any).returning();
      }

      let profList = await db.select().from(professionals).limit(1);
      let prof = profList[0];
      if (!prof) {
        [prof] = await db.insert(professionals).values({
          clinicId: clinic.id,
          name: "Dr. Alex Carter",
          specialty: "General Practice",
        } as any).returning();
      }

      // 2. Derive a real end time from the professional's slot duration.
      // Checked before any patient row is written: a malformed time must not
      // leave a half-created patient behind and then fail.
      const slotMinutes = prof.slotDuration ?? 30;
      const startMinutes = toMinutes(time);
      if (startMinutes === null) {
        return JSON.stringify({ success: false, error: "invalid_time" });
      }
      const endTime = toTimeString(startMinutes + slotMinutes);

      // 3. Get or create patient user
      let patientEmailVal = patientEmail || `${patientPhone.replace(/\D/g, "")}@patient.medbook`;
      let [patientUser] = await db.select().from(users).where(eq(users.email, patientEmailVal)).limit(1);
      if (!patientUser) {
        [patientUser] = await db.insert(users).values({
          email: patientEmailVal,
          name: patientName,
          phone: patientPhone,
          role: "patient",
          supabaseId: `patient-${crypto.randomUUID()}`,
        } as any).returning();
      } else {
        await db.update(users).set({ name: patientName, phone: patientPhone } as any).where(eq(users.id, patientUser.id));
      }

      // 4. Create appointment
      const [appt] = await db.insert(appointments).values({
        patientId: patientUser.id,
        clinicId: clinic.id,
        professionalId: prof.id,
        date: date,
        startTime: time,
        endTime,
        status: "confirmed",
        notes: notes || "Scheduled via MedBook Chat",
      } as any).returning();

      // 5. Update chat session info
      const sessionList = await db.select().from(chatSessions).limit(1);
      if (sessionList[0]) {
        await db.update(chatSessions).set({
          patientName,
          patientPhone,
          patientEmail: patientEmailVal,
        } as any).where(eq(chatSessions.id, sessionList[0].id));
      }

      const confirmationCode = `MB-${appt.id.slice(0, 6).toUpperCase()}`;

      return JSON.stringify({
        success: true,
        message: `Appointment scheduled successfully for ${patientName} on ${date} at ${time}.`,
        confirmationCode,
        appointmentId: appt.id,
      });
    } catch (error) {
      // This used to return success:true with an invented confirmation code.
      // The patient was told the appointment was booked, was given a code, and
      // nothing existed in the database -- they would arrive at the clinic to
      // find no appointment. A tool must never confirm what it did not do.
      console.error("[CREATE EVENT ERROR]", error);
      return JSON.stringify({
        success: false,
        error: "booking_failed",
        message: "The appointment could not be saved. Do not tell the patient it is booked.",
      });
    }
  },
});

export const cancelEventTool = new DynamicStructuredTool({
  name: "cancel_event",
  description: "Cancels a scheduled appointment.",
  schema: z.object({
    appointmentId: z.string().describe("ID or code of the appointment to cancel"),
    reason: z.string().optional().describe("Reason for cancellation"),
  }),
  func: async ({ appointmentId, reason }) => {
    // This used to swallow every error and report success unconditionally, so
    // an appointment that was never cancelled -- or never existed -- was
    // reported as cancelled.
    try {
      const cancelled = await db
        .update(appointments)
        .set({ status: "cancelled" } as any)
        .where(eq(appointments.id, appointmentId))
        .returning({ id: appointments.id });

      if (cancelled.length === 0) {
        return JSON.stringify({
          success: false,
          error: "appointment_not_found",
          message: "No appointment matches that identifier; nothing was cancelled.",
        });
      }

      return JSON.stringify({
        success: true,
        message: `Appointment ${appointmentId} cancelled.`,
        reason: reason || "Not specified.",
      });
    } catch (error) {
      console.error("[CANCEL EVENT ERROR]", error);
      return JSON.stringify({
        success: false,
        error: "cancellation_failed",
        message: "The cancellation could not be saved. Do not tell the patient it is cancelled.",
      });
    }
  },
});

// ─── Knowledge Base Tool ──────────────────────────────────────────────────────

export const queryKnowledgeBaseTool = new DynamicStructuredTool({
  name: "query_knowledge_base",
  description: "Queries the clinic's knowledge base to answer questions about hours, insurance, services, and policies.",
  schema: z.object({
    clinicId: z.string().optional().describe("Clinic ID"),
    question: z.string().describe("Patient's question"),
  }),
  func: async ({ clinicId, question }) => {
    try {
      const context = await getClinicContext(clinicId || "default");
      if (!context) {
        return JSON.stringify({
          success: false,
          error: "no_clinic_context",
          message: "No information is on file for this clinic. Say you do not have it and suggest contacting the clinic; do not state hours or insurance.",
        });
      }
      return JSON.stringify({ success: true, context, question });
    } catch (error) {
      // Both branches used to return invented opening hours and insurance
      // policy for a real clinic, marked as successful lookups. Stating a
      // clinic's hours from nowhere is worse than admitting we do not know.
      console.error("[KNOWLEDGE BASE ERROR]", error);
      return JSON.stringify({
        success: false,
        error: "lookup_failed",
        message: "The clinic information could not be read. Say you could not check; do not state hours or insurance.",
      });
    }
  },
});

// ─── Pre-Anamnesis Tool ───────────────────────────────────────────────────────

export const savePreAnamnesisTool = new DynamicStructuredTool({
  name: "save_pre_anamnesis",
  description: "Saves the pre-anamnesis data collected during the conversation with the patient.",
  schema: z.object({
    fullName: z.string().describe("Patient's full name"),
    phone: z.string().describe("Patient's phone number"),
    chiefComplaint: z.string().describe("Chief complaint / reported symptoms"),
    symptomsDescription: z.string().optional().describe("Detailed description of symptoms"),
    symptomsDuration: z.string().optional().describe("Duration of symptoms"),
    currentMedications: z.array(z.string()).optional().describe("Current medications"),
    allergies: z.array(z.string()).optional().describe("Allergies"),
    chronicConditions: z.array(z.string()).optional().describe("Chronic conditions"),
  }),
  func: async (data) => {
    try {
      // 1. Create Triage Session
      const [triage] = await db.insert(triageSessions).values({
        patientName: data.fullName,
        patientEmail: `${data.phone.replace(/\D/g, "")}@patient.medbook`,
        mainSymptom: data.chiefComplaint,
        evolutionTime: data.symptomsDuration || "Not specified",
        relevantHistory: `Medications: ${data.currentMedications?.join(", ") || "None"}; Allergies: ${data.allergies?.join(", ") || "None"}`,
        urgency: "GREEN",
        aiSummary: `Complaint: ${data.chiefComplaint}. Symptoms: ${data.symptomsDescription || "General"}.`,
        status: "PENDING",
      } as any).returning();

      return JSON.stringify({
        success: true,
        message: "Pre-anamnesis and triage recorded successfully.",
        triageId: triage.id,
        data,
      });
    } catch (error) {
      // This reported success while the patient's symptom report was lost.
      console.error("[SAVE PRE ANAMNESIS ERROR]", error);
      return JSON.stringify({
        success: false,
        error: "save_failed",
        message: "The triage information could not be saved. Do not tell the patient it was recorded.",
      });
    }
  },
});

// ─── Tool Collections ─────────────────────────────────────────────────────────

export const allTools = [
  checkCalendarTool,
  createEventTool,
  cancelEventTool,
  queryKnowledgeBaseTool,
  savePreAnamnesisTool,
];

export const schedulingTools = [
  checkCalendarTool,
  createEventTool,
  cancelEventTool,
];

export const preAnamnesisTools = [
  savePreAnamnesisTool,
];

// ─── AI Model Factory ─────────────────────────────────────────────────────────

export function createGroqChatModel(params?: {
  temperature?: number;
  maxTokens?: number;
}) {
  const openrouterKey = process.env.OPENROUTER_API_KEY?.trim();
  const apiKey = openrouterKey || process.env.GROQ_API_KEY?.trim();
  const baseURL = openrouterKey
    ? "https://openrouter.ai/api/v1"
    : "https://api.groq.com/openai/v1";

  const model = openrouterKey
    ? (process.env.OPENROUTER_MODEL?.trim() || "meta-llama/llama-3.3-70b-instruct")
    : (process.env.GROQ_MODEL?.trim() || "llama-3.3-70b-versatile");

  return new ChatOpenAI({
    model,
    temperature: params?.temperature ?? 0.3,
    maxTokens: params?.maxTokens ?? 1024,
    apiKey: apiKey ?? "missing-key",
    configuration: {
      baseURL,
    },
  });
}

// ─── Tool Execution Helper ────────────────────────────────────────────────────

export async function executeToolCalls(
  toolCalls: Array<{ name: string; args: Record<string, unknown>; id?: string }>
): Promise<ToolMessage[]> {
  const results: ToolMessage[] = [];

  for (const tc of toolCalls) {
    const tool = allTools.find((t) => t.name === tc.name);
    if (tool) {
      try {
        const result = await tool.func(tc.args as Parameters<typeof tool.func>[0]);
        results.push(
          new ToolMessage({
            content: typeof result === "string" ? result : JSON.stringify(result),
            tool_call_id: tc.id ?? crypto.randomUUID(),
            name: tc.name,
          })
        );
      } catch (error) {
        results.push(
          new ToolMessage({
            content: JSON.stringify({ error: String(error) }),
            tool_call_id: tc.id ?? crypto.randomUUID(),
            name: tc.name,
          })
        );
      }
    }
  }

  return results;
}
