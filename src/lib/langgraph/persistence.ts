/**
 * Persistência de sessão para o LangGraph.
 *
 * Usa SqliteSaver para persistir sessões em disco.
 * As sessões sobrevivem a reinícios do servidor.
 *
 * Uso:
 *   import { getCheckpointer, getConfig } from "@/lib/langgraph/persistence";
 *   const result = await graph.invoke(input, getConfig("session-id"));
 */
import { BaseCheckpointSaver } from "@langchain/langgraph";
import path from "path";
import fs from "fs";
import type { RunnableConfig } from "@langchain/core/runnables";

let _checkpointer: BaseCheckpointSaver | null = null;
let _setupPromise: Promise<void> | null = null;

export function getCheckpointer(): BaseCheckpointSaver {
  if (!_checkpointer) {
    const { Pool } = require("pg");
    const { PostgresSaver } = require("@langchain/langgraph-checkpoint-postgres");
    
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    _checkpointer = new PostgresSaver(pool);
    _setupPromise = (_checkpointer as any).setup();
    console.log("[Persistence] PostgresSaver conectado (pg)");
  }
  return _checkpointer;
}

export async function ensureCheckpointerSetup() {
  if (_setupPromise) {
    await _setupPromise;
  }
}

export function getConfig(threadId: string) {
  return {
    configurable: {
      thread_id: threadId,
    },
  } satisfies RunnableConfig;
}
