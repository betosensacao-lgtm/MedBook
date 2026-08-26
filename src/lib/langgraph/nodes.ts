import { SystemMessage, HumanMessage, AIMessage } from "@langchain/core/messages";
import { getClinicContext } from "@/lib/rag/knowledge-base";
import { buildSystemPrompt, checkAssistantReply } from "@/lib/security/guardrails";
import { createGroqChatModel, executeToolCalls, schedulingTools, preAnamnesisTools } from "./tools";
import type { ChatStateType, Intent } from "./state";

const ROUTER_PROMPT = `You are a router for a medical clinic.
Analyze the patient's message and classify the intent.

Message: "{message}"

Classify into ONE of the options:
- QUESTION: The patient wants to clarify questions about hours, insurance, services, or location
- SCHEDULING: The patient wants to book or check availability for an appointment
- CANCELLATION: The patient wants to cancel an existing appointment
- PRE_ANAMNESIS: The patient is providing personal data, symptoms, or medical history
- UNKNOWN: Doesn't fit any of the above

Respond with ONLY the intent (one word, uppercase, no punctuation).`;

export async function routerNode(state: ChatStateType): Promise<Partial<ChatStateType>> {
  const lastMessage = state.messages[state.messages.length - 1];
  // Already inspected upstream by the chat route; inspecting again here would
  // double-wrap a neutralised injection.
  const userMessage = (lastMessage?.content as string) || "";

  try {
    const model = createGroqChatModel({ temperature: 0, maxTokens: 20 });
    const response = await model.invoke([
      new HumanMessage(ROUTER_PROMPT.replace("{message}", userMessage)),
    ]);

    const raw = (response.content as string || "").trim().toUpperCase();
    const intent = raw.replace(/[^A-Z_]/g, "") as Intent;

    const valid: Intent[] = ["QUESTION", "SCHEDULING", "CANCELLATION", "PRE_ANAMNESIS"];
    return { intent: valid.includes(intent) ? intent : "UNKNOWN" };
  } catch (error) {
    console.error("[Router Node] Error:", error);
    return { intent: "UNKNOWN" };
  }
}

// Instructions only. The clinic context and the conversation history are
// appended AFTER the hardened block, so the security rules are never the last
// thing the model reads.
const DOUBT_SYSTEM_PROMPT_INSTRUCTIONS = `You are a virtual assistant for a medical clinic.
Use the information below to answer the patient's questions clearly and objectively.
If you don't know the answer, say you don't have that information and suggest contacting the clinic directly.
Do not make diagnoses or prescribe medication.`;

export async function doubtResolutionNode(
  state: ChatStateType
): Promise<Partial<ChatStateType>> {
  const clinicId = state.clinicId;
  const context = await getClinicContext(clinicId);

  const history = state.messages
    .filter((m) => m instanceof HumanMessage || m instanceof AIMessage)
    .map((m) => `${m instanceof HumanMessage ? "Patient" : "Assistant"}: ${m.content}`)
    .join("\n");

  const systemPrompt = `${buildSystemPrompt(DOUBT_SYSTEM_PROMPT_INSTRUCTIONS)}

CLINIC CONTEXT:
${context || "No information on file."}

Conversation history:
${history}`;

  try {
    const model = createGroqChatModel({ temperature: 0.3, maxTokens: 1024 });
    const response = await model.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage((state.messages[state.messages.length - 1]?.content as string) || ""),
    ]);

    const rawResponseText = typeof response.content === "string"
      ? response.content
      : "Sorry, I couldn't process your question.";

    const responseText = checkAssistantReply(
      rawResponseText,
      state.sessionId,
      clinicId,
    );

    return { messages: [new AIMessage(responseText)], completed: true };
  } catch (error) {
    return {
      messages: [new AIMessage("Sorry, an error occurred while processing your question.")],
      error: String(error),
    };
  }
}

const SCHEDULING_SYSTEM_PROMPT = `You are the official virtual assistant for the MedBook medical clinic.
Your mission is to help the patient schedule appointments and answer questions.

MANDATORY RULES:
1. Always ask for the patient's FULL NAME and PHONE NUMBER if you don't already have them.
2. Ask for the desired date and time for the appointment.
3. Use the check_calendar tool to check available times.
4. Present the available times to the patient.
5. Once the patient confirms the date and time, you MUST call the create_event tool with patientName, patientPhone, date, and time to save the appointment to the database.

Be very polite, attentive, and human. Respond in English.`;

export async function schedulingNode(
  state: ChatStateType
): Promise<Partial<ChatStateType>> {
  const history = state.messages
    .filter((m) => m instanceof HumanMessage || m instanceof AIMessage);

  const systemPrompt = buildSystemPrompt(SCHEDULING_SYSTEM_PROMPT);
  const model = createGroqChatModel().bindTools(schedulingTools);

  try {
    const response = await model.invoke([
      new SystemMessage(systemPrompt),
      ...history,
    ]);

    if (response.tool_calls?.length) {
      const toolMessages = await executeToolCalls(response.tool_calls);
      const followUp = await model.invoke([
        new SystemMessage(systemPrompt),
        ...history,
        response,
        ...toolMessages,
      ]);

      return {
        messages: [new AIMessage(followUp.content as string || "Appointment scheduled successfully!")],
        completed: true,
      };
    }

    return {
      messages: [new AIMessage(response.content as string || "Please tell me your name, phone number, and the day/time you'd like for your appointment.")],
    };
  } catch (error) {
    return {
      messages: [new AIMessage("Sorry, an error occurred while checking the schedule. Please tell me your name and phone number so we can try again.")],
      error: String(error),
    };
  }
}

const PRE_ANAMNESIS_SYSTEM_PROMPT = `You are the pre-anamnesis and triage assistant for the MedBook clinic.
Conduct a welcoming conversation to understand the patient's health needs.

STEP BY STEP:
1. Ask for the FULL NAME and PHONE NUMBER to register the patient.
2. Ask what the chief complaint or symptoms are and how long the patient has had them.
3. Ask about current medications, allergies, or health conditions.
4. As soon as you've collected the complaint/symptoms and name, you MUST call the save_pre_anamnesis tool to save it to the clinic's database.

Safety Notice: Do not provide diagnoses or prescribe medication.`;

export async function preAnamnesisNode(
  state: ChatStateType
): Promise<Partial<ChatStateType>> {
  const history = state.messages
    .filter((m) => m instanceof HumanMessage || m instanceof AIMessage);

  const systemPrompt = buildSystemPrompt(PRE_ANAMNESIS_SYSTEM_PROMPT);
  const model = createGroqChatModel().bindTools(preAnamnesisTools);

  try {
    const response = await model.invoke([
      new SystemMessage(systemPrompt),
      ...history,
    ]);

    if (response.tool_calls?.length) {
      const toolMessages = await executeToolCalls(response.tool_calls);

      const preAnamnesisArgs = response.tool_calls[0].args;

      return {
        messages: [
          new AIMessage(
            "Pre-anamnesis complete! Your information has been recorded successfully. Thank you!"
          ),
        ],
        patientData: { ...preAnamnesisArgs, collectionComplete: true } as any,
        completed: true,
      };
    }

    return {
      messages: [new AIMessage(response.content as string || "Let's start your pre-anamnesis.")],
    };
  } catch (error) {
    return {
      messages: [new AIMessage("Sorry, an error occurred. Please try again.")],
      error: String(error),
    };
  }
}
