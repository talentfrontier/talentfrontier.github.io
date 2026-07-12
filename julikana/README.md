# Julikana

**AI-powered marketing automation platform.** Domo — the main agent — acts as a
company's complete digital marketing employee: it creates content, publishes
across social platforms, answers customers, qualifies leads, and moves deals
through the funnel with minimal human intervention.

The user types *"I own a real estate company"* and Domo becomes their marketing
department.

## Monorepo layout

```
julikana/
├── apps/
│   ├── api/          NestJS backend (REST + WebSockets + BullMQ workers)
│   │   ├── prisma/   PostgreSQL schema (Prisma) + seed
│   │   └── src/modules/
│   │       ├── ai/           Domo orchestrator + 12 specialized agents + providers
│   │       ├── auth/         JWT, Google/Microsoft OAuth, TOTP 2FA
│   │       ├── crm/          Leads, scoring, funnel transitions
│   │       ├── conversations/ Omnichannel inbox + AI auto-reply
│   │       ├── social/       10 platform adapters + publish worker + webhooks
│   │       ├── workflows/    Event-triggered automation engine
│   │       ├── campaigns/ content/ media/ analytics/ brand/ billing/ ...
│   └── web/          Next.js dashboard (Tailwind, dark/light, SVG charts)
├── packages/shared/  Types shared by both apps
├── docker-compose.yml
└── docs/             Architecture & deployment guides
```

## Quick start

```bash
cp .env.example .env          # fill in at least DATABASE_URL/REDIS_URL
docker compose up postgres redis -d

npm install
npm run db:generate
npx --workspace @julikana/api prisma migrate dev --name init
npm run db:seed               # demo org + 25 leads

npm run dev                   # web on :3000, api on :4000, Swagger on :4000/docs
```

Without any AI keys the product still runs: Domo falls back to a deterministic
heuristic planner and the dashboard shows demo data. Add `ANTHROPIC_API_KEY`
(or OpenAI/Gemini) to unlock real generation.

## The agent system

`DomoOrchestrator` receives an instruction ("Promote my new laptop"), loads the
org's memory (business facts, brand voice, knowledge chunks), asks an LLM to
plan 1–5 tasks, and queues each to a specialized agent via BullMQ:

| Agent | Job |
|---|---|
| CONTENT_CREATOR | Platform-tailored posts & carousels |
| COPYWRITER | Blogs, landing pages, email/SMS/WhatsApp campaigns |
| IMAGE_CREATOR | Ads, posters, product shots (OpenAI Images / Flux / SD) |
| VIDEO_CREATOR | Reels & shorts with scripts (Runway / Higgsfield / Pika) |
| SOCIAL_MEDIA_MANAGER | Schedules content at best posting times |
| CUSTOMER_SUPPORT | Answers DMs, books appointments, collects contacts |
| LEAD_QUALIFIER | Re-scores leads, auto-advances qualified ones |
| CRM_MANAGER | Dedupes leads, schedules follow-ups |
| ANALYTICS | Plain-language performance insights |
| CAMPAIGN_OPTIMIZER | Budget & creative recommendations |
| TREND_RESEARCH | Trending topics & hashtags |
| SEO | Keyword-optimized articles |

LLM calls route through `LlmRouter` (Anthropic → OpenAI → Gemini failover).

## Testing & CI

```bash
npm test          # Jest unit tests (scoring, funnel, planner, workflow graph)
npm run typecheck
```

GitHub Actions (`.github/workflows/julikana-ci.yml` at repo root) runs
typecheck, tests against Postgres+Redis services, build, and Docker images.

## Deployment

- **Frontend** → Vercel (root `apps/web`) or the provided Dockerfile
- **API + workers** → Railway / Render / AWS via `apps/api/Dockerfile`
- **Everything at once** → `docker compose up`

See `docs/DEPLOYMENT.md` for environment specifics and `docs/API.md` for the
endpoint map (live Swagger at `/docs`).
