# MedBook — AGENTS.md

## Essential commands

| Command | Description |
|---------|-----------|
| `pnpm dev` | Next.js dev server |
| `pnpm build` | Production build |
| `pnpm lint` | ESLint (Next.js) |
| `pnpm test` | Jest (jsdom, ts-jest) |
| `pnpm db:generate` | Generate SQL migrations with Drizzle Kit |
| `pnpm db:migrate` | Apply migrations to the database |
| `pnpm db:studio` | Drizzle Studio (data browser) |
| `pnpm seed-demo` | Creates 20 demo chat sessions for testing |
| `pnpm seed-admin` | Creates/updates the admin user in the database |
| `pnpm health` | Checks system health (DB, env vars, deploy) |
| `pnpm health:fix` | Checks + auto-fixes issues found |

## Framework & toolchain

- **Next.js 16** App Router, `src/` dir, `@/*` → `src/*`
- **Drizzle ORM** + Supabase PostgreSQL. Migrations use `DIRECT_URL` (the pooler doesn't work for migrations). Runtime uses `DATABASE_URL` (pooler, port 6543, `prepare: false`).
- **LangGraph.js** — the conversational agent. Graph lives in `src/lib/langgraph/` with 4 nodes: `router`, `doubt_resolution`, `scheduling`, `pre_anamnesis`. The router node classifies intent before routing.
- **Scheduling tools** — appointment scheduling is handled by mock/DB-backed tools in `src/lib/langgraph/tools.ts` (`check_calendar`, `create_event`, `cancel_event`). There is no external calendar provider integration.
- **Web Chat** — standalone chat at `/chat` and an embeddable widget via iframe at `/chat/embed`. Uses the same LangGraph agent, persisted in Supabase (`chat_sessions` + `chat_messages` tables).
- **Meta API (deferred)** — WhatsApp/IG/FB code exists in `src/lib/meta/` and `src/app/api/webhook/route.ts` but isn't active in production. The webhook answers the GET verify challenge but doesn't send messages (no verified WABA number).

## Current routes

```
/                        → Public marketing landing page
/admin                   → Appointments & completed-visits overview
/admin/dashboard         → Admin stats dashboard
/admin/patients          → Patient list
/admin/analytics         → Chat analytics
/admin/context            → Clinic knowledge base management (AI context)
/admin/documents          → Document upload for the AI knowledge base
/admin/billing            → WhatsApp Business integration setup guide
/admin/lgpd                → Data privacy: export/delete requests, consent
/admin/super              → Super admin: clinics + system users
/chat                     → Standalone web chat
/chat/embed               → Embeddable chat (iframe snippet)
/api/chat                 → POST endpoint for the chat (message + sessionId → reply)
/api/webhook               → Meta webhook (GET verify — wired up, not active)
/admin/signup              → Public signup for a new clinic
/api/admin/signup          → POST: creates clinic + admin + auto-login
/api/admin/me               → GET: returns the logged-in user
/api/health                 → Health check (DB + tables + RLS)
```

## Things to watch out for

- **`strict: false`** in `tsconfig.json` — relaxed typing, but avoid `any` where practical.
- **Middleware** (`src/proxy.ts`) protects `/admin/:path*` routes. Public routes: login, signup, forgot/reset password. Reads the `admin_session` cookie and validates the JWT. (Next.js 16 uses `proxy.ts`, not `middleware.ts`.)
- **`src/db/schema.ts`** still has a `supabaseId` column on `users` from an earlier Supabase Auth integration — it's populated with a generated UUID rather than a real Supabase user id.
- **Sentry** — error tracking (client + server + edge). Only active if `SENTRY_DSN` is configured. Config in `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`.
- **CI** — `.github/workflows/ci.yml` and `test.yml` run lint + tests on push.
- **Tests** are plain Jest, unit-level only. Current tests in `src/**/*.test.ts` cover utils, chat route, chat session helpers, and graph edge routing.
- Stripe/billing and Google Calendar integrations that appeared in earlier iterations of this project have been removed — the app is chat-first, with scheduling handled entirely through the LangGraph tools and no payment processing.

## Required environment variables

```env
DATABASE_URL=               # Supabase pooler (port 6543, prepare: false)
DIRECT_URL=                 # Supabase direct connection (port 5432, for migrations)
GROQ_API_KEY=                # Groq API key
CLINIC_ID=                   # Default clinic ID in the database
NEXT_PUBLIC_APP_URL=         # Deploy URL (e.g. https://medbook-amber.vercel.app)
JWT_SECRET=                  # Admin session signing secret
RESEND_API_KEY=              # Transactional email
EMAIL_FROM=                  # Sender address for emails
CRON_SECRET=                 # Bearer token for cron/health endpoints

# Sentry (error tracking — optional)
SENTRY_DSN=
NEXT_PUBLIC_SENTRY_DSN=

# Meta/WhatsApp (deferred — not required for the web chat)
META_APP_SECRET=
META_WEBHOOK_VERIFY_TOKEN=
WHATSAPP_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
PAGE_ACCESS_TOKEN=
INSTAGRAM_USER_ID=
FACEBOOK_PAGE_ID=
```

## Workflow

1. Edit the schema in `src/db/schema.ts`
2. `pnpm db:generate` + `pnpm db:migrate`
3. `pnpm test` (existing unit tests)
4. git add/commit/push → deploy via `vercel --prod` (Git integration is disconnected; see project memory)

## Main module map

| Directory | Responsibility |
|-----------|-----------------|
| `src/lib/langgraph/` | The agent graph (state, nodes, edges, tools, persistence, graph) |
| `src/lib/chat/` | Web chat session persistence (`session.ts`, `dashboard.ts`) |
| `src/lib/rag/` | Clinic knowledge base (`clinic_context` table) |
| `src/lib/security/` | Prompt-injection guardrails |
| `src/lib/documents/` | Document upload parsing for the knowledge base |
| `src/lib/meta/` | Meta message normalization and sending (deferred) |
| `src/lib/ai.ts` | Groq client (OpenAI-compatible) with a lazy Proxy |
| `src/db/schema.ts` | Drizzle schema (all tables) |
| `src/app/chat/` | Standalone web chat + embed |
| `src/app/api/chat/` | Web chat API |
| `src/app/admin/` | Admin interface |
| `src/app/api/webhook/` | Meta webhook (deferred) |
| `src/components/chat/` | Chat UI components (`ChatMessages`) |

## Embedding via iframe

```html
<iframe src="https://medbook-amber.vercel.app/chat/embed"
  style="position:fixed;bottom:20px;right:20px;width:380px;height:600px;border:none;border-radius:12px;box-shadow:0 4px 24px rgba(0,0,0,0.15);z-index:9999">
</iframe>
```
