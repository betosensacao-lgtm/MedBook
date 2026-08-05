import { StateGraph, START, END } from "@langchain/langgraph";
import { ChatState, type ChatStateType } from "./state";
import {
  routerNode,
  doubtResolutionNode,
  schedulingNode,
  preAnamnesisNode,
} from "./nodes";
import {
  routeAfterRouter,
  routeAfterDoubt,
  routeAfterScheduling,
  routeAfterPreAnamnesis,
} from "./edges";
import { getCheckpointer, ensureCheckpointerSetup } from "./persistence";
import type { RunnableConfig } from "@langchain/core/runnables";

function createChatGraph() {
  return new StateGraph(ChatState)
    .addNode("router", routerNode)
    .addNode("doubt_resolution", doubtResolutionNode)
    .addNode("scheduling", schedulingNode)
    .addNode("pre_anamnesis", preAnamnesisNode)
    .addEdge(START, "router")
    .addConditionalEdges("router", routeAfterRouter, {
      doubt_resolution: "doubt_resolution",
      scheduling: "scheduling",
      pre_anamnesis: "pre_anamnesis",
      __end__: END,
    })
    .addConditionalEdges("doubt_resolution", routeAfterDoubt, {
      __end__: END,
    })
    .addConditionalEdges("scheduling", routeAfterScheduling, {
      __end__: END,
    })
    .addConditionalEdges("pre_anamnesis", routeAfterPreAnamnesis, {
      __end__: END,
    });
}

const checkpointer = getCheckpointer();
export const chatGraph = createChatGraph().compile({ checkpointer });

export type ChatGraphInput = typeof ChatState.State;
export type ChatGraphOutput = typeof ChatState.State;

const defaultState: ChatGraphInput = {
  messages: [],
  platform: "whatsapp",
  userId: "",
  sessionId: "",
  clinicId: "",
  intent: "UNKNOWN",
  calendarId: "",
  professionalName: "",
  preferredDate: null,
  preferredTime: null,
  eventId: null,
  patientData: { collectionComplete: false },
  clinicContext: "",
  completed: false,
  error: null,
  locale: "en",
};

export async function runChatGraph(
  input: Partial<ChatGraphInput>,
  threadId?: string
) {
  const state = { ...defaultState, ...input };
  const config: RunnableConfig = threadId
    ? { configurable: { thread_id: threadId } }
    : {};

  await ensureCheckpointerSetup();
  return chatGraph.invoke(state, config);
}

export async function* streamChatGraph(
  input: Partial<ChatGraphInput>,
  threadId?: string
): AsyncGenerator<{
  type: "node_start" | "node_complete" | "done";
  node?: string;
  output?: string;
  state?: ChatGraphOutput;
}> {
  const state = { ...defaultState, ...input };
  const config: RunnableConfig = threadId
    ? { configurable: { thread_id: threadId } }
    : {};

  await ensureCheckpointerSetup();
  const stream = await chatGraph.stream(state, {
    ...config,
    streamMode: ["updates"],
  });

  let finalState: ChatGraphOutput | null = null;

  for await (const chunk of stream) {
    let nodeEntries: [string, unknown][] = [];

    if (Array.isArray(chunk) && chunk.length === 2) {
      const [, nodeState] = chunk;
      if (typeof nodeState === "object" && nodeState !== null && !(nodeState instanceof Uint8Array)) {
        nodeEntries = Object.entries(nodeState as Record<string, unknown>);
      }
    } else if (typeof chunk === "object" && chunk !== null && !(chunk instanceof Uint8Array)) {
      nodeEntries = Object.entries(chunk as unknown as Record<string, unknown>);
    }

    for (const [nodeName, nodeState] of nodeEntries) {
      if (/^\d+$/.test(nodeName)) continue;

      yield { type: "node_start", node: nodeName };

      const messages = (nodeState as unknown as Record<string, unknown>)?.messages as Array<unknown> | undefined;
      if (messages?.length) {
        const lastMsg = messages[messages.length - 1] as unknown as Record<string, unknown>;
        if (lastMsg?.content) {
          yield {
            type: "node_complete",
            node: nodeName,
            output: String(lastMsg.content),
          };
        }
      }

      finalState = { ...finalState, ...(nodeState as unknown as Partial<ChatGraphOutput>) };
    }
  }

  yield { type: "done", state: finalState || { ...defaultState, ...input } };
}
