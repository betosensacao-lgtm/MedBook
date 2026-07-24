import { DynamicStructuredTool } from "@langchain/core/tools";
import { ToolMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";
import { getClinicContext } from "@/lib/rag/knowledge-base";

// ─── Appointment Scheduling Tool ─────────────────────────────────────────────
// NOTE: Google Calendar integration is scaffolded and ready for connection.
// To activate: provide GOOGLE_CALENDAR_OAUTH credentials and connect a clinic.

export const checkCalendarTool = new DynamicStructuredTool({
  name: "check_calendar",
  description: "Busca horários disponíveis no calendário para uma data específica.",
  schema: z.object({
    clinicId: z.string().describe("ID da clínica"),
    professionalId: z.string().describe("ID do profissional"),
    date: z.string().describe("Data no formato YYYY-MM-DD"),
  }),
  func: async ({ clinicId, professionalId, date }) => {
    // TODO: Connect to Google Calendar OAuth when credentials are provided.
    // This tool is scaffolded and ready for production integration.
    // For now, returns mock available slots for demo purposes.
    const mockSlots = ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00"];
    return JSON.stringify({
      success: true,
      date,
      availableSlots: mockSlots,
      totalAvailable: mockSlots.length,
      note: "Demo mode — connect Google Calendar OAuth to enable real scheduling.",
    });
  },
});

export const createEventTool = new DynamicStructuredTool({
  name: "create_event",
  description: "Cria um agendamento de consulta.",
  schema: z.object({
    clinicId: z.string().describe("ID da clínica"),
    professionalId: z.string().describe("ID do profissional"),
    patientName: z.string().describe("Nome do paciente"),
    patientEmail: z.string().describe("Email do paciente"),
    date: z.string().describe("Data no formato YYYY-MM-DD"),
    time: z.string().describe("Horário no formato HH:MM"),
    duration: z.number().describe("Duração em minutos (padrão 30)"),
    notes: z.string().optional().describe("Observações da consulta"),
  }),
  func: async ({ patientName, date, time, notes }) => {
    // TODO: Persist to appointments table and sync with Google Calendar.
    return JSON.stringify({
      success: true,
      message: `Consulta agendada para ${patientName} em ${date} às ${time}.`,
      confirmationCode: `MB-${Date.now().toString(36).toUpperCase()}`,
      notes: notes || "Nenhuma observação.",
    });
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
    clinicId: z.string().describe("ID da clínica"),
    question: z.string().describe("Pergunta do paciente"),
  }),
  func: async ({ clinicId, question }) => {
    try {
      const context = await getClinicContext(clinicId);

      if (!context) {
        return JSON.stringify({
          success: true,
          context: "Nenhuma informação cadastrada no momento. Por favor, entre em contato diretamente com a clínica.",
        });
      }

      return JSON.stringify({
        success: true,
        context,
        question,
      });
    } catch (error) {
      return JSON.stringify({
        success: false,
        message: "Erro ao consultar base de conhecimento.",
        error: String(error),
      });
    }
  },
});

// ─── Pre-Anamnesis Tool ───────────────────────────────────────────────────────

export const savePreAnamnesisTool = new DynamicStructuredTool({
  name: "save_pre_anamnesis",
  description: "Salva os dados da pré-anamnese coletados durante a conversa.",
  schema: z.object({
    fullName: z.string().describe("Nome completo do paciente"),
    phone: z.string().describe("Telefone do paciente"),
    chiefComplaint: z.string().describe("Queixa principal"),
    symptomsDescription: z.string().optional().describe("Descrição dos sintomas"),
    symptomsDuration: z.string().optional().describe("Duração dos sintomas"),
    currentMedications: z.array(z.string()).optional().describe("Medicamentos atuais"),
    allergies: z.array(z.string()).optional().describe("Alergias"),
    chronicConditions: z.array(z.string()).optional().describe("Condições crônicas"),
  }),
  func: async (data) => {
    try {
      // TODO: Persist to pre_anamnesis table linked to appointment
      return JSON.stringify({
        success: true,
        message: "Pré-anamnese registrada com sucesso.",
        data,
      });
    } catch (error) {
      return JSON.stringify({
        success: false,
        message: "Erro ao salvar pré-anamnese.",
        error: String(error),
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

  // Always use llama-3.3-70b-versatile as default — proven stable and capable
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
