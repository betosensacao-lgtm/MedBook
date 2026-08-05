# MedBook — Project Context (July 2026)

## Status at the time

Landing page redesigned, pricing implemented, admin functional with demo data. Stripe checkout integrated.

---

---

## What was done

### Landing page
- Full redesign: Sora (headings) + Inter (body), refined palette (`#F5F8FA`), animated chat preview
- 6 feature cards, pricing (3 tiers), testimonials, final CTA, footer
- Tested on mobile (375px), tablet (768px), desktop (1280px) — zero horizontal scroll

### Pricing
- `pricing_plans` table with 3 tiers: Starter R$97/mo, Professional R$197/mo, Enterprise R$397/mo
- `clinics` updated with `plan_id` FK, `billing_cycle`, `trial_ends_at`, `conversations_used_monthly`
- Seed: `pnpm seed-plans`
- API: `GET/POST /api/admin/clinics`, `GET/PATCH/DELETE /api/admin/clinics/[id]`, `GET /api/admin/plans`

### Demo data seed
- `pnpm seed-demo`: 20 chat sessions with realistic patients (names, phones, emails) spread over the last 14 days
- Dashboards and analytics populated with data

### Fixed
- **500 error on analytics/dashboard**: Date objects inside `sql\` raw templates — replaced with Drizzle's `lt()`
- **Plans API**: `where(asc())` → `orderBy(asc())`
- **Landing redirect**: `src/app/page.tsx` was redirecting the route to /admin
- **Chat initial message**: AI greeting added to /chat and /chat/embed
- **Deprecation warning**: `cross-env NODE_OPTIONS=--no-deprecation` for Windows

### Tests and build
- 59/59 tests passing
- 27 routes building
- Zero console errors/warnings on the frontend
- Pushed to origin (scheduleclinic) and aria-med

---

## Architecture (at the time)

### Main stack
- **Next.js 16** App Router, `src/` dir, `@/*` → `src/*`
- **Drizzle ORM** + Supabase PostgreSQL
- **LangGraph.js** — conversational agent (3 nodes: doubt_resolution, scheduling, pre_anamnesis)
- **Google Calendar API** — service account
- **Groq** — LLM provider (OpenAI-compatible)

### Routes at the time
```
/                   → landing page
/chat               → standalone web chat
/chat/embed         → chat embed (iframe)
/admin/login        → admin login
/admin/dashboard    → metrics dashboard
/admin/analytics    → detailed metrics
/admin/super        → super admin (clinic + plan CRUD)
/admin/patients     → patients
/admin/contexto     → knowledge base
/admin              → Google calendar
/api/chat           → POST chat endpoint
/api/admin/clinics  → clinic CRUD
/api/admin/plans    → list plans
/api/health         → health check
```

### Database (at the time)
- Tables: `users`, `clinics`, `pricing_plans`, `professionals`, `chat_sessions`, `chat_messages`, `appointments`, `clinic_context`, `triage_sessions`, `triage_messages`
- `chat_sessions`: session_id, clinic_id, patient_name, patient_phone, patient_email, created_at
- `chat_messages`: session_id, role (user/assistant), content, created_at
- `pricing_plans`: name, slug, price_monthly/yearly (in cents), max_professionals, max_conversations_monthly, features JSONB

---

## Next steps (priority, at the time)

### 1. Public deploy
- Deploy to Vercel with a public URL for clients to access
- Configure a custom domain
- Verify environment variables on deploy

### 2. Activate WhatsApp
- Code exists in `src/lib/meta/` but without a verified WABA number
- Needed: verified WhatsApp Business number + Meta webhook configuration
- Activate `src/app/api/webhook/route.ts` (at the time it only answered the GET verify challenge)

### 3. Checkout / subscription flow ✅
- Stripe SDK integrated (`src/lib/stripe.ts`)
- API: `POST /api/stripe/create-checkout-session` — creates a Stripe Checkout session
- API: `POST /api/stripe/create-portal-session` — Stripe Customer Portal
- Webhook: `POST /api/stripe/webhook` — `checkout.session.completed`, `customer.subscription.*`, `invoice.payment_failed`
- Seed: `pnpm seed-stripe-products` — creates products/prices in Stripe and saves the IDs to the DB
- Public `/pricing` page with a monthly/yearly toggle
- Admin `/admin/billing` page with current plan, usage, upgrade/downgrade
- Columns added to the schema: `stripe_product_id`, `stripe_price_id_monthly`, `stripe_price_id_yearly` on `pricing_plans`
- **Needed**: `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` in .env.local + Vercel

### 4. New-clinic onboarding ✅
- `/admin/signup` page with a full form (name, email, password, clinic, specialty, phone)
- API `POST /api/admin/signup` — creates `users` + `clinics` + `adminUsers` in a transaction, auto-login
- Middleware (`src/middleware.ts`) active — protects `/admin/*`, except login/signup/forgot/reset
- Login page links to signup
- Landing page CTAs point to `/admin/signup`
- Checkout and portal use the `clinicId` from the JWT session, no longer a hardcoded env var
- API `GET /api/admin/me` — returns the logged-in user from the cookie

### 5. Landing page SEO
- Meta tags, OG image, description
- Google Analytics / Plausible
- Sitemap

---

## Useful commands (at the time)

| Command | Description |
|---------|-----------|
| `pnpm dev` | Dev server |
| `pnpm build` | Production build |
| `pnpm test` | Jest (59 tests) |
| `pnpm seed-plans` | Seed pricing_plans (3 tiers) |
| `pnpm seed-demo` | Seed 20 demo chat sessions |

## Things to watch out for (at the time)
- `ignoreBuildErrors: true` — TS errors don't block the build
- `matcher: []` in middleware — never runs
- `strict: false` in tsconfig — relaxed typing
- Legacy columns in the schema: `stripeCustomerId`, `subscriptionId`, `supabaseId` (still in the DB, unused)
- Google Calendar private key needs `replace(/\\n/g, "\n")` (already handled)

> **Note:** This file is a point-in-time snapshot from July 2026. Stripe billing, Google Calendar, and `pricing_plans` were subsequently removed from the project — see [AGENTS.md](AGENTS.md) for the current architecture.
