# API reference (summary)

Live, always-current documentation is served by Swagger at **`/docs`** on the
running API. Base path: `/api/v1`. All endpoints except `auth/*`, `webhooks/*`,
`billing/webhook` and `/health` require `Authorization: Bearer <JWT>`.

| Area | Endpoints |
|---|---|
| **auth** | `POST /auth/register`, `POST /auth/login` (2FA-aware), `POST /auth/refresh`, `GET /auth/google[/callback]`, `GET /auth/microsoft[/callback]`, `POST /auth/2fa/setup`, `POST /auth/2fa/enable` |
| **users** | `GET/PATCH /users/me` |
| **organization** | `GET/PATCH /organization`, `POST /organization/members`, `DELETE /organization/members/:userId` |
| **ai (Domo)** | `POST /ai/instruct` — natural-language job → agent plan · `POST /ai/onboard` — business description → profile · `GET /ai/agents` · `GET /ai/tasks` · `GET /ai/suggestions` · `POST /ai/suggestions/:id/dismiss` · `GET /ai/memory` |
| **leads (CRM)** | `GET/POST /leads`, `GET /leads/funnel`, `GET/PATCH /leads/:id`, `POST /leads/:id/stage`, `POST /leads/:id/notes`, `POST /leads/:id/follow-ups` |
| **conversations** | `GET /conversations`, `GET /conversations/:id`, `POST /conversations/:id/messages` (human takeover), `POST /conversations/inbound`, `POST /conversations/:id/status` |
| **content** | `GET /content`, `GET/PATCH/DELETE /content/:id`, `POST /content/:id/approve` |
| **media** | `POST /media/presign` (direct upload), `POST /media`, `GET /media` |
| **social** | `GET/POST /social/accounts`, `DELETE /social/accounts/:id`, `GET /social/scheduled`, `POST /social/schedule`, `POST /social/sync-followers` |
| **campaigns** | `GET/POST /campaigns`, `GET /campaigns/:id`, `PATCH /campaigns/:id/status` |
| **workflows** | `GET/POST /workflows`, `GET/PATCH/DELETE /workflows/:id` |
| **analytics** | `GET /analytics/summary`, `GET /analytics/timeseries?days=30`, `GET /analytics/best-posts` |
| **notifications** | `GET /notifications`, `POST /notifications/:id/read`, `POST /notifications/read-all`, `SSE /notifications/stream` |
| **billing** | `POST /billing/checkout`, `GET /billing/usage`, `POST /billing/webhook` (Stripe) |
| **brand training** | `GET/POST /brand/sources`, `DELETE /brand/sources/:id` |
| **webhooks** | `GET/POST /webhooks/meta` (verification + events), `POST /webhooks/:platform` |

**Real-time:** socket.io namespace `/realtime` (auth: `{ token }`) emits
`notification`, `conversation.message`, `agent.task`.

**Errors:** consistent envelope `{ statusCode, path, timestamp, message }`;
validation errors list per-field messages. Rate limit: 120 req/min/IP.
