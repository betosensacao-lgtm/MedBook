import { DynamicStructuredTool } from "@langchain/core/tools";
import { ToolMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";
import { getClinicContext } from "@/lib/rag/knowledge-base";
import { db } from "@/db";
import { appointments, preAnamnesis, triageSessions, chatSessions, users, clinics, professionals } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getAvailability } from "@/lib/scheduling/availability";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
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
  description:
    "Books an appointment at a time confirmed to be free. Call check_calendar first and pass the professionalId whose slot the patient chose. Returns success:false with a reason when the booking cannot be made -- in that case never tell the patient it is booked.",
  schema: z.object({
    // No clinicId: the server knows which clinic it serves. Asking a model for
    // one only invites it to invent a value.
    professionalId: z
      .string()
      .optional()
      .describe("Professional ID returned by check_calendar for the slot the patient chose"),
    patientName: z.string().describe("Patient's name"),
    patientPhone: z.string().describe("Patient's phone number"),
    patientEmail: z.string().optional().describe("Patient's email"),
    date: z.string().describe("Date in YYYY-MM-DD format"),
    time: z.string().describe("Time in HH:MM format"),
    notes: z.string().optional().describe("Notes or reason for the appointment"),
  }),
  func: async ({ professionalId, patientName, patientPhone, patientEmail, date, time, notes }) => {
    try {
      const configuredClinic = process.env.CLINIC_ID;
      if (!configuredClinic || !UUID_PATTERN.test(configuredClinic)) {
        return JSON.stringify({
          success: false,
          error: "clinic_not_configured",
          message: "The clinic is not configured. Do not tell the patient the appointment is booked.",
        });
      }

      const [clinic] = await db
        .select()
        .from(clinics)
        .where(eq(clinics.id, configuredClinic))
        .limit(1);

      if (!clinic) {
        return JSON.stringify({
          success: false,
          error: "clinic_not_found",
          message: "The configured clinic does not exist. Do not tell the patient the appointment is booked.",
        });
      }

      // Book only into a slot that is actually free, read from the same source
      // check_calendar reads. This used to pick `professionals` LIMIT 1 with no
      // ordering, no clinic filter and no isActive filter, and never checked
      // whether the time was taken -- so it could book Dr. A into a slot that
      // had been offered for Dr. B, or double-book one that was already gone.
      const availability = await getAvailability({
        date,
        clinicId: clinic.id,
        professionalId,
      });

      if (!availability.success) {
        return JSON.stringify({
          success: false,
          error: availability.reason,
          message: "Availability could not be confirmed. Do not tell the patient the appointment is booked.",
        });
      }

      const freeFor = availability.byProfessional.filter((p) => p.slots.includes(time));
      if (freeFor.length === 0) {
        return JSON.stringify({
          success: false,
          error: "slot_unavailable",
          message: `${time} is not available on ${date}. Offer one of the listed times instead.`,
          availableSlots: availability.availableSlots,
        });
      }

      const chosen = freeFor[0];

      const [prof] = await db
        .select()
        .from(professionals)
        .where(eq(professionals.id, chosen.professionalId))
        .limit(1);

      if (!prof) {
        return JSON.stringify({
          success: false,
          error: "professional_not_found",
          message: "The professional could not be loaded. Do not tell the patient the appointment is booked.",
        });
      }

      const startMinutes = toMinutes(time);
      if (startMinutes === null) {
        return JSON.stringify({
          success: false,
          error: "invalid_time",
          message: "The time is not valid. Do not tell the patient the appointment is booked.",
        });
      }
      const endTime = toTimeString(startMinutes + (prof.slotDuration ?? 30));

      // Get or create the patient.
      const patientEmailVal = patientEmail || `${patientPhone.replace(/\D/g, "")}@patient.medbook`;
      let [patientUser] = await db
        .select()
        .from(users)
        .where(eq(users.email, patientEmailVal))
        .limit(1);

      if (!patientUser) {
        [patientUser] = await db
          .insert(users)
          .values({
            email: patientEmailVal,
            name: patientName,
            phone: patientPhone,
            role: "patient",
            supabaseId: `patient-${crypto.randomUUID()}`,
          } as any)
          .returning();
      } else {
        await db
          .update(users)
          .set({ name: patientName, phone: patientPhone } as any)
          .where(eq(users.id, patientUser.id));
      }

      // Note: availability was read a moment ago, so two patients racing for the
      // same slot could both pass. Closing that needs a unique index on
      // (professional_id, date, start_time) where status <> 'cancelled'.
      const [appt] = await db
        .insert(appointments)
        .values({
          patientId: patientUser.id,
          clinicId: clinic.id,
          professionalId: prof.id,
          date,
          startTime: time,
          endTime,
          status: "confirmed",
          notes: notes || "Scheduled via MedBook Chat",
        } as any)
        .returning();

      // The chat session's patient details are updated by the route, which knows
      // the current sessionId. This tool used to update `chatSessions` LIMIT 1 --
      // writing one patient's name and phone onto somebody else's conversation.

      return JSON.stringify({
        success: true,
        message: `Appointment scheduled for ${patientName} with ${prof.name} on ${date} at ${time}.`,
        confirmationCode: `MB-${appt.id.slice(0, 6).toUpperCase()}`,
        appointmentId: appt.id,
        professionalName: prof.name,
      });
    } catch (error) {
      // This used to return success:true with an invented confirmation code.
      // The patient was told the appointment was booked, was given a code, and
      // nothing existed in the database.
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
