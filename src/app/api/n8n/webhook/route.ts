export const maxDuration = 60;

import { NextResponse } from "next/server";
import { HumanMessage } from "@langchain/core/messages";
import { runChatGraph } from "@/lib/langgraph/graph";
import { applyGuardrails, validateOutput } from "@/lib/security/guardrails";

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const expectedSecret = process.env.N8N_WEBHOOK_SECRET;

    if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const reqBody = await request.json();
    console.log("[N8N MEDBOOK PAYLOAD RECEBIDO]:", reqBody); 
    
    const data = reqBody.body ? reqBody.body : reqBody;

    const clinicId = reqBody.clinicId || data.clinicId || "default";
    const sessionId = reqBody.sessionId || data.sessionId || crypto.randomUUID();
    const text = reqBody.text || data.message || "";
    const platform = reqBody.platform || data.platform || "n8n_webhook";

    if (!text) {
      return NextResponse.json(
        { status: "error", message: "Missing required field: text (patient message)" },
        { status: 400 }
      );
    }

    // Apply security guardrails
    const { safeMessage } = applyGuardrails(text, sessionId, clinicId);

    const result = await runChatGraph(
      {
        messages: [new HumanMessage(safeMessage)],
        clinicId: clinicId,
        platform: platform,
        sessionId: sessionId,
      },
      sessionId
    );

    const lastMessage = result.messages[result.messages.length - 1];
    let reply = typeof lastMessage?.content === "string" ? lastMessage.content : "";

    const outputCheck = validateOutput(reply);
    if (!outputCheck.safe) {
      reply = outputCheck.cleaned;
    }

    return NextResponse.json({ 
      status: "ok", 
      message: "Patient message processed by LangGraph",
      reply: reply,
      intent: result.intent,
      patientData: result.patientData,
      completed: result.completed,
      sessionId: sessionId
    });

  } catch (error) {
    console.error("[N8N WEBHOOK ERROR]", error);
    return NextResponse.json(
      { status: "error", message: "Internal server error" }, 
      { status: 500 }
    );
  }
}
