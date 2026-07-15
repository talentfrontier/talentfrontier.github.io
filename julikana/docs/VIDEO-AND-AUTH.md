# Video Studio + account features

This covers three things just added: AI **video generation** (Veo/Runway/…),
**"keep me signed in"**, and **forgot password**.

---

## 1. Video Studio

Domo can generate short promo/UGC-style videos from a text prompt. In the
mobile app it's the **Studio** tab: type a prompt, pick an aspect ratio, tap
**Generate video**. The app polls until the clip renders (~1–3 min) and plays
it back inline.

Under the hood:

- `POST /api/v1/media/video` → starts generation, returns a `contentItemId`.
- The **media-generation worker** polls the provider until the render is done,
  saves a `MediaAsset`, and flips the `ContentItem` to `READY`.
- `GET /api/v1/media/video/:id` → poll status (`GENERATING` / `READY` / `FAILED`).
- `GET /api/v1/media/:assetId/file` → streams the finished video. For Veo the
  file needs the server-side key, so this proxy fetches it server-side — **the
  key never reaches the client.**

### Providers

Selection order (first configured one wins; override per request with
`provider`):

| Provider | Env var | Notes |
|---|---|---|
| **Veo** (default) | `GOOGLE_GEMINI_API_KEY` | Same key Domo already uses. Set `VEO_MODEL` to change the model (default `veo-3.0-generate-001`). |
| Runway | `RUNWAY_API_KEY` | Gen-4 turbo; returns a public hosted URL. |
| Higgsfield | `HIGGSFIELD_API_KEY` | Endpoint is a placeholder — fill in real values when you have access. |
| Pika | `PIKA_API_KEY` | Same as above. |

> **Honest cost note:** video generation is **not free**. Veo through the
> Gemini API is billed per second and generally requires a **billing-enabled**
> Google API key — the free Gemini text tier does not include Veo. Everything
> else in Julikana still runs on free tiers; video is the one paid piece.
> `POST /media/video` returns `503 No video provider configured` until at least
> one key above is set.

Tuning env vars: `VIDEO_POLL_INTERVAL_MS` (default 15000),
`VIDEO_POLL_TIMEOUT_MS` (default 480000).

---

## 2. Keep me signed in

The sign-in / register screen has a **"Keep me signed in"** checkbox (on by
default). When on, the refresh token is stored in the device keychain
(`expo-secure-store`) and, on next launch, exchanged via `POST /auth/refresh`
for a fresh access token — so you land straight in the app. Tap the **J badge**
in the header to sign out (clears the stored token). When off, the session
lives only in memory and ends when the app is closed.

Refresh-token lifetime is `JWT_REFRESH_EXPIRES_IN` (default `30d`).

---

## 3. Forgot password

Flow: **Forgot password?** (on the Sign in screen) → enter email → we email a
one-time code → enter the code + a new password → you're signed in.

- `POST /auth/forgot-password` — always returns `{ ok: true }` (never reveals
  whether an email exists). Stores only a **hash** of the token with a 1-hour
  expiry.
- `POST /auth/reset-password` — `{ token, password }`; sets the new password and
  returns tokens.

**Delivery:** the reset email sends through the same transport as campaigns, so
it only actually arrives once an email provider is configured:

```
EMAIL_PROVIDER=resend
RESEND_API_KEY=...          # Resend has a free tier
EMAIL_FROM=security@yourdomain
```

Until then the transport just logs the message (nothing is delivered). For
**testing before email is set up**, set `AUTH_RESET_RETURN_TOKEN=true` in a
non-production environment and the code is returned in the API response (and the
app pre-fills it). Never enable that in production.
