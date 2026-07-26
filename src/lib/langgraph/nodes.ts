import { SystemMessage, HumanMessage, AIMessage } from "@langchain/core/messages";
import { getClinicContext } from "@/lib/rag/knowledge-base";
import { hardenSystemPrompt, sanitizeInput, validateOutput } from "@/lib/security/guardrails";
import { createGroqChatModel, executeToolCalls, schedulingTools, preAnamnesisTools } from "./tools";
import type { ChatStateType, Intent } from "./state";

const ROUTER_PROMPT = `Você é um roteador para uma clínica médica.
Analise a mensagem do paciente e classifique a intenção.

Mensagem: "{message}"

Classifique em UMA das opções:
- DUVIDA: O paciente quer esclarecer dúvidas sobre horários, convênios, serviços, localização
- AGENDAMENTO: O paciente quer marcar ou verificar disponibilidade de consulta
- CANCELAMENTO: O paciente quer cancelar uma consulta existente
- PRE_ANAMNESE: O paciente está fornecendo dados pessoais, sintomas ou histórico médico
- NAO_IDENTIFICADO: Não se encaixa em nenhum dos acima

Responda APENAS com a intenção (uma palavra, maiúscula, sem acentos).`;

export async function routerNode(state: ChatStateType): Promise<Partial<ChatStateType>> {
  const lastMessage = state.messages[state.messages.length - 1];
  const rawMessage = (lastMessage?.content as string) || "";

  const { clean: userMessage } = sanitizeInput(rawMessage);

  try {
    const model = createGroqChatModel({ temperature: 0, maxTokens: 20 });
    const response = await model.invoke([
      new HumanMessage(ROUTER_PROMPT.replace("{message}", userMessage)),
    ]);

    const raw = (response.content as string || "").trim().toUpperCase();
    const intent = raw.replace(/[^A-Z_]/g, "") as Intent;

    const valid: Intent[] = ["DUVIDA", "AGENDAMENTO", "CANCELAMENTO", "PRE_ANAMNESE"];
    return { intent: valid.includes(intent) ? intent : "NAO_IDENTIFICADO" };
  } catch (error) {
    console.error("[Router Node] Error:", error);
    return { intent: "NAO_IDENTIFICADO" };
  }
}

const DOUBT_SYSTEM_PROMPT = `Você é um assistente virtual de uma clínica médica.
Use as informações abaixo para responder às perguntas do paciente de forma clara e objetiva.
Se não souber a resposta, diga que não tem essa informação e sugira contato direto com a clínica.
Não faça diagnósticos nem prescreva medicamentos.

CONTEXTO DA CLÍNICA:
{context}

Histórico da conversa:
{history}`;

export async function doubtResolutionNode(
  state: ChatStateType
): Promise<Partial<ChatStateType>> {
  const clinicId = state.clinicId;
  const context = await getClinicContext(clinicId);

  const history = state.messages
    .filter((m) => m instanceof HumanMessage || m instanceof AIMessage)
    .map((m) => `${m instanceof HumanMessage ? "Paciente" : "Assistente"}: ${m.content}`)
    .join("\n");

  const systemPrompt = hardenSystemPrompt(
    DOUBT_SYSTEM_PROMPT
      .replace("{context}", context || "Nenhuma informacao cadastrada.")
      .replace("{history}", history)
  );

  try {
    const model = createGroqChatModel({ temperature: 0.3, maxTokens: 1024 });
    const response = await model.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage((state.messages[state.messages.length - 1]?.content as string) || ""),
    ]);

    let responseText = typeof response.content === "string"
      ? response.content
      : "Desculpe, nao consegui processar sua pergunta.";

    const outputCheck = validateOutput(responseText);
    if (!outputCheck.safe) {
      responseText = outputCheck.cleaned;
    }

    return { messages: [new AIMessage(responseText)], completed: true };
  } catch (error) {
    return {
      messages: [new AIMessage("Desculpe, ocorreu um erro ao processar sua pergunta.")],
      error: String(error),
    };
  }
}

const SCHEDULING_SYSTEM_PROMPT = `Você é o assistente virtual oficial de atendimento da clínica médica MedBook.
Sua missão é ajudar o paciente com agendamento de consultas e esclarecimento de dúvidas.

REGRAS OBRIGATÓRIAS:
1. Sempre pergunte o NOME COMPLETO e TELEFONE do paciente caso ainda não saiba.
2. Pergunte a data e o horário desejado para a consulta.
3. Use a ferramenta check_calendar para verificar os horários disponíveis.
4. Apresente os horários ao paciente.
5. Quando o paciente confirmar a data e hora, execute OBRIGATORIAMENTE a ferramenta create_event passando patientName, patientPhone, date, time para salvar o agendamento no banco de dados.

Seja muito educado, atencioso e humano. Responda em português.`;

export async function schedulingNode(
  state: ChatStateType
): Promise<Partial<ChatStateType>> {
  const history = state.messages
    .filter((m) => m instanceof HumanMessage || m instanceof AIMessage);

  const systemPrompt = hardenSystemPrompt(SCHEDULING_SYSTEM_PROMPT);
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
        messages: [new AIMessage(followUp.content as string || "Consulta agendada com sucesso!")],
        completed: true,
      };
    }

    return {
      messages: [new AIMessage(response.content as string || "Por favor, me informe seu nome, telefone e o dia/horário desejado para a consulta.")],
    };
  } catch (error) {
    return {
      messages: [new AIMessage("Desculpe, ocorreu um erro ao verificar a agenda. Por favor, me informe seu nome e telefone para tentarmos novamente.")],
      error: String(error),
    };
  }
}

const PRE_ANAMNESE_SYSTEM_PROMPT = `Você é o assistente de pré-anamnese e triagem da clínica MedBook.
Conduza um atendimento acolhedor para entender as necessidades de saúde do paciente.

PASSO A PASSO:
1. Solicite o NOME COMPLETO e TELEFONE para cadastro do paciente.
2. Pergunte qual a queixa principal ou quais sintomas o paciente está sentindo e há quanto tempo.
3. Pergunte sobre medicamentos em uso, alergias ou condições de saúde.
4. Assim que coletar a queixa/sintomas e nome, execute OBRIGATORIAMENTE a ferramenta save_pre_anamnesis para salvar no banco de dados da clínica.

Alerta de Segurança: Não forneça diagnósticos nem prescreva medicamentos.`;

export async function preAnamnesisNode(
  state: ChatStateType
): Promise<Partial<ChatStateType>> {
  const history = state.messages
    .filter((m) => m instanceof HumanMessage || m instanceof AIMessage);

  const systemPrompt = hardenSystemPrompt(PRE_ANAMNESE_SYSTEM_PROMPT);
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
            "Pre-anamnese concluida! Seus dados foram registrados com sucesso. Obrigado!"
          ),
        ],
        patientData: { ...preAnamnesisArgs, collectionComplete: true } as any,
        completed: true,
      };
    }

    return {
      messages: [new AIMessage(response.content as string || "Vamos iniciar sua pre-anamnese.")],
    };
  } catch (error) {
    return {
      messages: [new AIMessage("Desculpe, ocorreu um erro. Tente novamente.")],
      error: String(error),
    };
  }
}
