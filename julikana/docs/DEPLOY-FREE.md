# Zero-budget deploy (no credit card)

Supabase alone can't run Julikana — it's a **database + storage** service, not
a server host. So the free stack splits the work across three free tiers, none
of which require a card:

| Piece | Service | Free? | Role |
|---|---|---|---|
| Database | **Supabase** | yes, no card | Postgres + media storage |
| Queue | **Upstash** | yes, no card | Redis for BullMQ |
| API + workers | **Koyeb** | yes, no card | runs the Docker image |

Total cost: **$0**. (Trade-off: free tiers sleep on idle and have small limits
— fine for testing and first clients; upgrade one piece at a time as you grow.)

---

## 1. Database — Supabase (2 min)
1. **supabase.com** → New project (pick a region near you, e.g. Frankfurt).
2. Project Settings → **Database** → **Connection string** → **URI**.
   Use the **Session mode** string (port **5432**) — it works for both the app
   and migrations. It looks like:
   `postgresql://postgres.<ref>:<password>@aws-0-...pooler.supabase.com:5432/postgres`
3. Save that — it's your `DATABASE_URL`.
4. (Optional, for media uploads) Project Settings → **API** → copy the URL and
   the `service_role` key → these become `SUPABASE_URL` and
   `SUPABASE_SERVICE_ROLE_KEY`, with `STORAGE_DRIVER=supabase`.

## 2. Redis — Upstash (2 min)
1. **upstash.com** → sign up → **Create Database** (Redis) → pick a region.
2. Copy the **`rediss://`** connection URL (TLS). That's your `REDIS_URL`.
   (The app already detects `rediss://` and enables TLS automatically.)

## 3. API — Koyeb (5 min)
1. **koyeb.com** → sign up (GitHub login, no card) → **Create Web Service**.
2. Source: your GitHub repo `talentfrontier/talentfrontier.github.io`.
3. Builder: **Dockerfile**.
   - **Work directory / build context:** `julikana`
   - **Dockerfile path:** `apps/api/Dockerfile`
4. **Environment variables** (paste these):
   - `DATABASE_URL` = your Supabase URI (step 1)
   - `REDIS_URL` = your Upstash URL (step 2)
   - `JWT_SECRET` = any long random string
   - `JWT_REFRESH_SECRET` = another long random string
   - `SUPERADMIN_EMAILS` = your email
   - `GOOGLE_GEMINI_API_KEY` = your Gemini key (free tier works) — OR `ANTHROPIC_API_KEY`. One AI key is required so Domo can think.
   - (optional) `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `STORAGE_DRIVER=supabase`
5. **Port:** Koyeb injects `PORT` automatically and the app honors it. Health
   check path: `/health`.
6. Deploy. First build ~5–8 min. Migrations run automatically on boot.
7. When it's healthy, copy the public URL, e.g.
   `https://julikana-<you>.koyeb.app`. Verify: open `…/health` → `{"status":"ok"}`.

## 4. Point the app at it
Give me the Koyeb URL (or set it yourself in
`julikana/apps/mobile/eas.json` → `build.preview.env.EXPO_PUBLIC_API_URL`) and
re-run the **Julikana Android APK** GitHub Action. Domo goes live.

---

### Notes & fallbacks
- If Koyeb ever asks for a card, the same Docker image runs identically on
  **Render's free web service** (`render.yaml` is set to the free plan now) or
  **Railway** — pick whichever doesn't ask you for one.
- Free API tiers **sleep when idle**, so the first request after a pause takes
  a few seconds and scheduled autopilot won't fire while asleep. For always-on
  autonomous posting you'll eventually want one paid instance (~$5/mo) — but for
  building, onboarding, and testing, free is fine.
- Supabase free Postgres pauses after ~1 week of inactivity; just resume it in
  the dashboard.
