# Deployment

## Fastest path — Render Blueprint (one click, browser only)

The repo ships a `render.yaml` blueprint at its root that provisions the API
(Docker), Postgres, and Redis together and runs DB migrations automatically on
first boot.

1. Push this repo to GitHub (already done for talentfrontier).
2. Go to **dashboard.render.com** → sign up / log in (free).
3. **New → Blueprint** → connect GitHub → pick
   `talentfrontier/talentfrontier.github.io` → **Apply**.
4. Render shows the three resources it will create (julikana-api, julikana-db,
   julikana-redis). It will prompt for the `sync: false` secrets — paste at
   least **one** AI key (`ANTHROPIC_API_KEY` recommended). Leave the rest blank
   for now. Click **Apply**.
5. Wait ~5–8 min for the first build. When `julikana-api` is **Live**, click it
   and copy its URL, e.g. `https://julikana-api.onrender.com`.
6. Verify it's up: open `https://julikana-api.onrender.com/health` → `{"status":"ok"}`.

### Point the mobile app at the live API and rebuild
1. Edit `julikana/apps/mobile/eas.json` → `build.preview.env.EXPO_PUBLIC_API_URL`
   → set it to your Render URL from step 5. Commit + push.
2. Re-run the **Julikana Android APK** GitHub Action (Actions tab → Run
   workflow). Install the new APK. Domo is now live — chat, content generation,
   dashboard, CRM and autopilot all run against the real backend.

> Free Postgres on Render expires after 30 days — switch `julikana-db` to the
> `basic` plan for anything real. The `starter` API plan sleeps on idle; bump it
> for always-on autopilot.

## Option A — Docker Compose (single host)

```bash
cp .env.example .env   # fill secrets
docker compose up -d --build
# web :3000 · api :4000 · Swagger :4000/docs
```

Run migrations once: `docker compose exec api npx prisma migrate deploy`.

## Option B — Vercel (web) + Railway/Render (api)

**Web on Vercel**
- Root directory: `julikana/apps/web`
- Build command: `next build` · Install: `npm install` (monorepo detected)
- Env: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_WS_URL` → your API's public URL

**API on Railway or Render**
- Dockerfile path: `julikana/apps/api/Dockerfile`, context `julikana/`
- Attach managed Postgres + Redis; set `DATABASE_URL`, `REDIS_URL`
- Set all secrets from `.env.example` (JWT, OAuth, AI keys, Stripe, platform apps)
- Release command: `npx prisma migrate deploy`
- Health check: `GET /health`

## Option C — Kubernetes

Both Dockerfiles are stateless 12-factor images. Suggested topology:

- `web` Deployment (2+) behind Ingress
- `api` Deployment (2+) — enable the socket.io Redis adapter when >1 replica
- `worker` Deployment reusing the api image with `HTTP_DISABLED=1` (workers
  boot from the same Nest modules; see ARCHITECTURE.md → Scaling path)
- Managed Postgres + Redis (or operators)
- Secrets via `Secret`/external-secrets; config via `ConfigMap`

## Post-deploy checklist

1. `POST /auth/register` a real owner account; disable seed data in prod.
2. Configure each platform app (Meta, TikTok, …) with the callback
   `https://<api>/api/v1/webhooks/<platform>` and OAuth redirect
   `https://<web>/auth/callback`.
3. Point the Stripe webhook at `https://<api>/api/v1/billing/webhook`
   (events: `checkout.session.completed`, `customer.subscription.*`).
4. Set `LLM_ORDER` if you prefer a specific provider order.
5. Verify `/health`, Swagger `/docs`, and a test `POST /ai/instruct`.
