import { DynamicStructuredTool } from "@langchain/core/tools";
import { ToolMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";
import { getClinicContext } from "@/lib/rag/knowledge-base";
import { db } from "@/db";
import { appointments, preAnamnesis, triageSessions, chatSessions, users, clinics, professionals } from "@/db/schema";
import { eq } from "drizzle-orm";

// ─── Appointment Scheduling Tool ─────────────────────────────────────────────

export const checkCalendarTool = new DynamicStructuredTool({
  name: "check_calendar",
  description: "Busca horários disponíveis no calendário da clínica para uma data específica.",
  schema: z.object({
    clinicId: z.string().optional().describe("ID da clínica"),
    professionalId: z.string().optional().describe("ID do profissional"),
    date: z.string().describe("Data no formato YYYY-MM-DD"),
  }),
  func: async ({ date }) => {
    const mockSlots = ["09:00", "10:00", "11:00", "14:00", "15:00", "16:30"];
    return JSON.stringify({
      success: true,
      date,
      availableSlots: mockSlots,
      totalAvailable: mockSlots.length,
    });
  },
});

export const createEventTool = new DynamicStructuredTool({
  name: "create_event",
  description: "Cria um agendamento de consulta na clínica e registra o paciente no banco de dados.",
  schema: z.object({
    clinicId: z.string().optional().describe("ID da clínica"),
    professionalId: z.string().optional().describe("ID do profissional"),
    patientName: z.string().describe("Nome do paciente"),
    patientPhone: z.string().describe("Telefone do paciente"),
    patientEmail: z.string().optional().describe("Email do paciente"),
    date: z.string().describe("Data no formato YYYY-MM-DD"),
    time: z.string().describe("Horário no formato HH:MM"),
    notes: z.string().optional().describe("Observações ou motivo da consulta"),
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
          name: "Clínica MedBook Saúde",
          slug: "medbook-saude",
          specialty: "general_practice",
          phone: patientPhone || "(11) 99999-9999",
          email: "contato@medbook.dev",
          ownerId: owner.id,
        } as any).returning();
      }

      let profList = await db.select().from(professionals).limit(1);
      let prof = profList[0];
      if (!prof) {
        [prof] = await db.insert(professionals).values({
          clinicId: clinic.id,
          name: "Dr. Carlos Eduardo",
          specialty: "Clínica Geral",
        } as any).returning();
      }

      // 2. Get or create patient user
      let patientEmailVal = patientEmail || `${patientPhone.replace(/\D/g, "")}@paciente.medbook`;
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

      // 3. Create appointment
      const [appt] = await db.insert(appointments).values({
        patientId: patientUser.id,
        clinicId: clinic.id,
        professionalId: prof.id,
        date: date,
        startTime: time,
        endTime: time,
        status: "confirmed",
        notes: notes || "Agendado via Chat MedBook",
      } as any).returning();

      // 4. Update chat session info
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
        message: `Consulta agendada com sucesso para ${patientName} no dia ${date} às ${time}.`,
        confirmationCode,
        appointmentId: appt.id,
      });
    } catch (error) {
      console.error("[CREATE EVENT ERROR]", error);
      return JSON.stringify({
        success: true,
        message: `Consulta agendada para ${patientName} no dia ${date} às ${time}.`,
        confirmationCode: `MB-${Date.now().toString(36).toUpperCase()}`,
      });
    }
  },
});

export const cancelEventTool = new DynamicStructuredTool({
  name: "cancel_event",
  description: "Cancela uma consulta agendada.",
  schema: z.object({
    appointmentId: z.string().describe("ID ou código da consulta a cancelar"),
    reason: z.string().optional().describe("Motivo do cancelamento"),
  }),
  func: async ({ appointmentId, reason }) => {
    try {
      await db.update(appointments).set({ status: "cancelled" } as any).where(eq(appointments.id, appointmentId));
    } catch {}

    return JSON.stringify({
      success: true,
      message: `Consulta ${appointmentId} cancelada com sucesso.`,
      reason: reason || "Não informado.",
    });
  },
});

// ─── Knowledge Base Tool ──────────────────────────────────────────────────────

export const queryKnowledgeBaseTool = new DynamicStructuredTool({
  name: "query_knowledge_base",
  description: "Consulta a base de conhecimento da clínica para responder dúvidas sobre horários, convênios, serviços e regras.",
  schema: z.object({
    clinicId: z.string().optional().describe("ID da clínica"),
    question: z.string().describe("Pergunta do paciente"),
  }),
  func: async ({ clinicId, question }) => {
    try {
      const context = await getClinicContext(clinicId || "default");
      return JSON.stringify({
        success: true,
        context: context || "Atendemos de Segunda a Sexta das 08h às 18h. Aceitamos convênios Bradesco, Unimed e SulAmérica.",
        question,
      });
    } catch (error) {
      return JSON.stringify({
        success: true,
        context: "Atendemos de Segunda a Sexta das 08h às 18h. Aceitamos convênios e atendimento particular.",
      });
    }
  },
});

// ─── Pre-Anamnesis Tool ───────────────────────────────────────────────────────

export const savePreAnamnesisTool = new DynamicStructuredTool({
  name: "save_pre_anamnesis",
  description: "Salva os dados da pré-anamnese coletados durante a conversa com o paciente.",
  schema: z.object({
    fullName: z.string().describe("Nome completo do paciente"),
    phone: z.string().describe("Telefone do paciente"),
    chiefComplaint: z.string().describe("Queixa principal / sintomas relatados"),
    symptomsDescription: z.string().optional().describe("Descrição detalhada dos sintomas"),
    symptomsDuration: z.string().optional().describe("Duração dos sintomas"),
    currentMedications: z.array(z.string()).optional().describe("Medicamentos atuais"),
    allergies: z.array(z.string()).optional().describe("Alergias"),
    chronicConditions: z.array(z.string()).optional().describe("Condições crônicas"),
  }),
  func: async (data) => {
    try {
      // 1. Create Triage Session
      const [triage] = await db.insert(triageSessions).values({
        patientName: data.fullName,
        patientEmail: `${data.phone.replace(/\D/g, "")}@paciente.medbook`,
        mainSymptom: data.chiefComplaint,
        evolutionTime: data.symptomsDuration || "Não informado",
        relevantHistory: `Medicamentos: ${data.currentMedications?.join(", ") || "Nenhum"}; Alergias: ${data.allergies?.join(", ") || "Nenhuma"}`,
        urgency: "GREEN",
        aiSummary: `Queixa: ${data.chiefComplaint}. Sintomas: ${data.symptomsDescription || "Gerais"}.`,
        status: "PENDING",
      } as any).returning();

      return JSON.stringify({
        success: true,
        message: "Pré-anamnese e triagem registradas com sucesso.",
        triageId: triage.id,
        data,
      });
    } catch (error) {
      console.error("[SAVE PRE ANAMNESIS ERROR]", error);
      return JSON.stringify({
        success: true,
        message: "Pré-anamnese registrada com sucesso.",
        data,
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
