# MedBook

A modern clinic scheduling platform with AI-powered triage and pre-anamnesis. Built with Next.js 16, Supabase, LangGraph.js, and deployed on Vercel.

## Features

- **AI Triage** — Multi-turn chat powered by LangGraph.js that classifies patient intent, answers clinic questions, and schedules appointments
- **Online Scheduling** — Conversational appointment booking with the check_calendar and create_event AI tools
- **Pre-Anamnesis** — Conversational collection of chief complaint, symptoms, medications, allergies, and chronic conditions before the visit
- **Admin Dashboard** — Stats, patient list, analytics, clinic knowledge base, and triage sessions
- **WhatsApp Integration** — Send and receive messages via the Meta WhatsApp Business API webhook
- **Document Knowledge Base** — Upload PDFs/DOCX/TXT to ground the AI's answers in clinic-specific information

## Tech Stack

| Layer | Technology |
|--------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Database | PostgreSQL (Supabase) |
| ORM | Drizzle ORM |
| Auth | JWT session cookies (bcrypt password hashing) |
| AI/LLM | Groq (Llama 3.3 70B) |
| AI Agent | LangGraph.js |
| UI | shadcn/ui + Tailwind CSS |
| Email | Resend |
| Messaging | WhatsApp Business API (Meta) |
| Testing | Jest + Testing Library |
| Deploy | Vercel |
| Package Manager | pnpm |

## Quick Start

### Prerequisites

- Node.js 18+
- pnpm
- A Supabase account
- A Groq API key

### Installation

```bash
git clone <repo-url>
cd medbook
pnpm install
```

### Configuration

```bash
cp .env.example .env.local
```

Fill in the environment variables in `.env.local` (see `.env.example` for reference).

### Database

```bash
pnpm db:generate    # Generate migrations
pnpm db:migrate     # Apply migrations
```

### Development

```bash
pnpm dev
```

Visit http://localhost:3000

## Project Structure

```
src/
├── app/
│   ├── (marketing)/                # Public landing page
│   ├── admin/                      # Admin panel (dashboard, patients, analytics, context, super admin)
│   ├── api/
│   │   ├── admin/                  # Auth, clinics, documents, users, LGPD data requests
│   │   ├── chat/                   # AI chat endpoint
│   │   ├── health/                 # Health check endpoint
│   │   └── webhook/                # WhatsApp/Meta webhook
│   ├── auth/                       # Login-adjacent auth pages
│   └── chat/                       # Public + embeddable AI chat widget
├── components/
│   ├── chat/                       # Chat UI components
│   └── ui/                         # Shared UI primitives
├── db/
│   ├── schema.ts                   # Drizzle schema
│   ├── index.ts                    # Database connection
│   └── migrations/                 # Generated migrations
├── lib/
│   ├── langgraph/                  # AI agent (LangGraph.js): state, nodes, edges, tools, graph
│   ├── security/                   # Prompt-injection guardrails
│   ├── rag/                        # Clinic knowledge base retrieval
│   ├── documents/                  # Document upload parsing
│   ├── analytics/                  # Admin dashboard analytics queries
│   ├── patients/                   # Patient queries
│   ├── meta/                       # WhatsApp/Meta message normalization
│   ├── ai.ts                       # Groq client
│   └── auth.ts                     # Session tokens, password hashing, reset tokens
├── styles/globals.css               # Global styles
└── types/index.ts                   # TypeScript types
```

## Available Scripts

| Command | Description |
|---------|-----------|
| `pnpm dev` | Development server |
| `pnpm build` | Production build |
| `pnpm start` | Start production server |
| `pnpm lint` | Lint the code |
| `pnpm test` | Run tests |
| `pnpm test:watch` | Tests in watch mode |
| `pnpm test:coverage` | Tests with coverage |
| `pnpm db:generate` | Generate migrations |
| `pnpm db:migrate` | Apply migrations |
| `pnpm db:studio` | Open Drizzle Studio |
| `pnpm seed-demo` | Seed demo chat sessions |
| `pnpm seed-admin` | Seed an admin user |
| `pnpm health` | Run the health-check script |

## Deployment

The project is set up for deployment on Vercel via the CLI (`vercel --prod`) rather than Git integration — see `src/lib/langgraph/README.md` and the project memory for details on the current deploy flow.

## License

Private project.
