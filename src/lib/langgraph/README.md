# LangGraph Module - MedBook Triage & Scheduling

## Overview

This module implements AI agent orchestration using **LangGraph.js**, preparing the system to be a multi-tenant B2B SaaS ("Clinic-in-a-Box").

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        LangGraph Flow                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────┐                                                    │
│  │  START   │                                                    │
│  └────┬─────┘                                                    │
│       │                                                          │
│       ▼                                                          │
│  ┌──────────┐     ┌─────────────┐     ┌──────────────┐          │
│  │  Router  │────▶│  Scheduling │────▶│Pre-Anamnesis │          │
│  └────┬─────┘     └──────┬──────┘     └──────────────┘          │
│       │                  │                                        │
│       │                  ▼                                        │
│       │           ┌─────────────┐                                │
│       │           │Doubt Resol. │                                │
│       │           └─────────────┘                                │
│       │                                                          │
│       └──────────▶┌──────────────┐                               │
│                   │ Doubt Resol. │                               │
│                   └──────────────┘                               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Components

### 1. State (Global State)

File: `state.ts`

The state holds all information shared between nodes:

- **messages**: Conversation history
- **patientId/clinicId**: Multi-tenant identifiers
- **intent**: Identified intent (QUESTION/SCHEDULING/CANCELLATION/PRE_ANAMNESIS/UNKNOWN)
- **Clinical data**: Symptoms, history, pain intensity
- **Scheduling data**: Professional, date, time

### 2. Nodes

File: `nodes.ts`

| Node | Function |
|-----|--------|
| `routerNode` | Classifies user intent via LLM |
| `doubtResolutionNode` | Answers clinic-related questions |
| `schedulingNode` | Manages appointment scheduling |
| `preAnamnesisNode` | Conducts conversational pre-anamnesis |

### 3. Edges (Conditional Edges)

File: `edges.ts`

| Edge | Logic |
|--------|--------|
| `routeAfterRouter` | Redirects based on intent |
| `routeAfterDoubt` | Always ends |
| `routeAfterScheduling` | Always ends |
| `routeAfterPreAnamnesis` | Always ends |

### 4. Tools

Tools are called automatically by the **Scheduling** and **Pre-Anamnesis** nodes via the LLM's function calling.

| Tool | Description | DB Integration |
|------|-----------|---------------|
| `check_calendar` | Looks up available time slots | PostgreSQL (professionals) |
| `create_event` | Creates an appointment | PostgreSQL (appointments, users) |
| `cancel_event` | Cancels an appointment | PostgreSQL (appointments) |
| `query_knowledge_base` | Answers clinic FAQs | RAG knowledge base |
| `save_pre_anamnesis` | Saves pre-anamnesis data | PostgreSQL (triage_sessions) |

**Scheduling flow:**
1. User says "I'd like to book an appointment"
2. Router classifies it as `SCHEDULING`
3. Scheduling Node calls the LLM with the available tools
4. LLM decides to call `check_calendar` → looks up slots in the DB
5. LLM presents the options to the patient
6. Patient confirms → LLM calls `create_event` → creates the record in the DB

### 5. Graph (Main Graph)

File: `graph.ts`

Compiles all components into an executable graph.

## Basic Usage

### 1. Run the Graph

```typescript
import { runChatGraph } from "@/lib/langgraph/graph";
import { HumanMessage } from "@langchain/core/messages";

const result = await runChatGraph({
  messages: [new HumanMessage("I'd like to schedule an appointment")],
  clinicId: "clinic-uuid",
  sessionId: "session-uuid",
});

console.log(result.intent); // "SCHEDULING"
```

### 2. Use via the Chat API

```bash
POST /api/chat
Content-Type: application/json

{
  "message": "I need an appointment",
  "sessionId": "session-uuid"
}
```

### 3. Use Tools Individually

```typescript
import { checkCalendarTool } from "@/lib/langgraph/tools";

const result = await checkCalendarTool.invoke({
  clinicId: "clinic-uuid",
  date: "2026-08-10",
});

const slots = JSON.parse(result);
console.log(slots.availableSlots);
```

## Example Flows

### Flow 1: General Question

1. User: "What insurance do you accept?"
2. Router → Intent: QUESTION
3. Doubt Resolution → Answers using the clinic's knowledge base

### Flow 2: Direct Scheduling

1. User: "I'd like to book an appointment"
2. Router → Intent: SCHEDULING
3. Scheduling → Looks up availability
4. User picks a time
5. Scheduling → Creates the appointment

### Flow 3: Pre-Anamnesis

1. User: "I've had a headache for 3 days"
2. Router → Intent: PRE_ANAMNESIS
3. Pre-Anamnesis → Collects symptoms, history, and contact info
4. Pre-Anamnesis → Saves the triage session

## Configuration

### Environment Variables

```env
# Groq (LLM)
GROQ_API_KEY=your-groq-key
GROQ_MODEL=llama-3.3-70b-versatile

# Database (already configured)
DATABASE_URL=postgresql://...
```

## Persistence

The system uses **PostgresSaver** to persist conversation sessions between calls.

- **Multi-turn**: The full history is kept between calls using `session_id` / `thread_id`

```typescript
// Example usage with persistence
const result = await runChatGraph(input, "session-uuid");

// A second call with the same session_id resumes the conversation
const result2 = await runChatGraph(input2, "session-uuid");
```

## Streaming

The chat API supports streaming via `streamChatGraph`, which yields:

- `node_start` — a graph node has started
- `node_complete` — a node produced output
- `done` — the conversation finished, with the final state

## File Structure

```
src/lib/langgraph/
├── state.ts      # State definition
├── nodes.ts       # Graph nodes
├── edges.ts       # Conditional edges
├── tools.ts        # Tools (function calling)
├── persistence.ts  # Checkpointer / session persistence
├── graph.ts        # Compiled main graph
└── README.md       # This file
```

## Next Steps

1. [x] Session persistence (PostgresSaver)
2. [x] Response streaming
3. [x] Real tools wired to PostgreSQL (check_calendar, create_event)
4. [ ] Token-level streaming
5. [ ] Human-in-the-loop escalation for urgent cases
6. [ ] Admin monitoring dashboard
7. [ ] Broader unit and integration test coverage
