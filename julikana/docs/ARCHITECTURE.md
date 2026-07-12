# Architecture

## System overview

```
 ┌──────────────┐   HTTPS/WSS   ┌───────────────────────────────┐
 │  Next.js web │ ────────────► │           NestJS API          │
 │  (Vercel)    │ ◄──────────── │  REST /api/v1 · WS /realtime  │
 └──────────────┘   SSE/socket  │  Swagger /docs                │
                                └──────┬──────────┬─────────────┘
      social webhooks ─────────────────┘          │
 (Meta, TikTok, …) POST /webhooks/*         ┌─────▼─────┐   ┌──────────┐
                                            │  BullMQ   │──►│  Redis   │
                                            │  queues   │   └──────────┘
                                            └─────┬─────┘
        workers (same process, horizontally scalable):
        agent-task · publish-post · workflow-run · knowledge-ingest · media-generation
                                                  │
                             ┌────────────────────┼────────────────────┐
                        ┌────▼────┐        ┌──────▼──────┐      ┌──────▼──────┐
                        │Postgres │        │ AI providers │      │  Platform   │
                        │(Prisma) │        │ LLM/img/video│      │  APIs (10)  │
                        └─────────┘        └─────────────┘      └─────────────┘
```

## Key decisions

**Multi-tenancy** — every row hangs off `Organization`; the JWT carries
`organizationId` + role, and services always filter by it. Roles (OWNER,
MANAGER, MARKETING, SALES, SUPPORT) are enforced by `RolesGuard` with a
hierarchy so OWNER ⊇ MANAGER ⊇ … .

**Agent-based AI** — one orchestrator (`DomoOrchestrator`) plans; twelve
specialized agents execute. Agents are stateless classes implementing
`JulikanaAgent`; org context is injected as `OrgMemory` on each run. Adding an
agent = one class + one registry entry + one `AgentKind` enum value.

**Provider abstraction** — LLMs, image, video and speech generation each sit
behind an interface with configured-provider failover. No business code
imports a vendor SDK directly; everything is `fetch`-based, so swapping or
adding providers touches one file.

**Queues over cron** — anything slow or third-party (publishing, generation,
ingestion, workflow runs) goes through BullMQ with exponential-backoff retries.
Failures surface as `post_failed` / task-failed notifications, never silently.

**Workflows** — a workflow is a JSON graph (`trigger`, `nodes`, `edges`)
produced by the visual builder. `WorkflowEngineService` subscribes to domain
events (`social.comment`, `lead.created`, …), matches triggers, and enqueues
runs; `WorkflowProcessor` walks the graph breadth-first (`executionOrder`) and
logs each step on the run row.

**AI memory** — three layers:
1. `Organization.businessFacts` / `brandVoice` — structured facts Domo maintains
2. `KnowledgeChunk` — chunked brand-training documents (keyword retrieval now;
   the schema documents the pgvector migration for embeddings)
3. Conversation history — replayed to the support agent per thread

**Security** — argon2 password hashing; short-lived access + refresh JWTs;
TOTP 2FA (otplib); OAuth tokens and TOTP secrets encrypted at rest
(AES-256-GCM via `CryptoService`); API keys stored as SHA-256 hashes; global
rate limiting (`@nestjs/throttler`); helmet; audit log table; role-gated
endpoints; Stripe webhooks signature-verified; GDPR-friendly (org-scoped
cascade deletes).

**Real-time** — one socket.io gateway (`/realtime`) with per-user and per-org
rooms for notifications, conversation messages and agent-task progress, plus
an SSE fallback at `GET /notifications/stream`.

## Scaling path

- API is stateless → replicate behind a load balancer (socket.io needs the
  Redis adapter when replicated; queues already share Redis).
- Workers can move to dedicated processes by importing the same modules and
  disabling the HTTP listener (Kubernetes-ready: one Deployment per queue).
- Postgres: add read replicas for analytics queries; `PlatformMetric` is
  append-only and partitionable by date.
