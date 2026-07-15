# Meta App Review — Julikana prep & submission guide

This is the one-time approval (on **you**, the platform owner) that lets your
clients tap "Connect Facebook / Instagram" and have Domo post, read comments,
reply to messages, and pull insights on their behalf. Once approved, onboarding
a client is a 30-second OAuth click — no review per client.

Realistic timeline: **Business Verification** ~2–10 days + **App Review**
~3 days–3 weeks per submission. Start now; it runs in the background while you
build everything else.

---

## 0. What you're requesting (the end state)

| Capability in Julikana | Meta permission(s) | Where it's used in the code |
|---|---|---|
| Let a client pick which Page/IG to connect | `pages_show_list`, `instagram_basic` | `SocialController.connect`, OAuth flow |
| Publish posts/photos/videos to a Page | `pages_manage_posts`, `pages_read_engagement` | `FacebookAdapter.publish` |
| Publish to Instagram (feed/reels) | `instagram_content_publish` | `InstagramAdapter.publish` |
| Read & reply to comments; like comments | `pages_manage_engagement`, `pages_read_user_content`, `instagram_manage_comments` | `FacebookAdapter.fetchComments/replyToComment/likeComment` |
| Reply to Messenger / IG DMs (Domo support) | `pages_messaging`, `instagram_manage_messages` | `WebhooksController.metaEvent` → `ConversationsService`, `FacebookAdapter.sendDirectMessage` |
| Follower counts & post insights | `pages_read_engagement`, `instagram_manage_insights` | `SocialService.syncFollowers`, `AnalyticsService` |

Default, **no review**: `public_profile`, `email`.

> Paid **ad boosting** (`ads_management`) is a **separate, later** track — see
> §8. Do organic first; it's faster to approve.

---

## 1. Prerequisites (have these ready before you submit)

Meta will reject fast if any are missing:

- [ ] A **Meta Business Portfolio** (business.facebook.com) with your business.
- [ ] **Business Verification** documents: legal business name, registration/
      certificate, business address, and a matching phone/website/email. (For a
      Kenyan business: certificate of incorporation or business-name
      registration from eCitizen works.)
- [ ] A public **Privacy Policy URL** — required.
- [ ] A public **Terms of Service URL** — required.
- [ ] A **Data Deletion** URL or callback — required.
- [ ] App **icon** (1024×1024) and a short app description.
- [ ] A **test account** on Julikana the reviewer can log into (email +
      password), already connected to a test Facebook Page + Instagram Business
      account, so the reviewer can see each permission work.
- [ ] Your live API URL: `https://talentfrontier-github-io.onrender.com`.

**The three legal URLs**: host them on your GitHub Pages site (this repo) — e.g.
`https://talentfrontier.github.io/legal/privacy.html`, `/legal/terms.html`,
`/legal/data-deletion.html`. Ask me and I'll generate those pages for you.

---

## 2. Create the Meta app

1. **developers.facebook.com** → My Apps → **Create App**.
2. App type: **Business**.
3. Link it to your Business Portfolio.
4. Note the **App ID** and **App Secret** (Settings → Basic). These become the
   `META_APP_ID` and `META_APP_SECRET` env vars on Render (the owner-managed
   "meta" connector).

## 3. Add products

In the app dashboard → **Add Product**:

- **Facebook Login for Business** — for the client OAuth flow.
- **Instagram** (Instagram API setup with Facebook Login).
- **Messenger** — only if you want Domo answering Messenger/IG DMs.
- **Webhooks** — to receive comments and messages.

### OAuth redirect URI
Facebook Login → Settings → **Valid OAuth Redirect URIs**:
```
https://talentfrontier-github-io.onrender.com/api/v1/social/accounts
```
(Adjust if you add a dedicated `/auth/meta/callback` route later.)

### Webhooks callback
Point Page + Instagram webhooks to:
```
Callback URL:  https://talentfrontier-github-io.onrender.com/api/v1/webhooks/meta
Verify token:  <the value you set for META_APP_SECRET>
```
Subscribe to fields: `feed` (comments), `messages`, `messaging_postbacks`,
`mentions`, `comments`.
> Note: the current code verifies the webhook using `META_APP_SECRET` as the
> verify token. Cleaner is a dedicated `META_WEBHOOK_VERIFY_TOKEN` — tell me and
> I'll add it (5-min change) before you go live.

## 4. Business Verification

App dashboard → **Settings → Business verification** (or via Business Portfolio
→ Security Center). Submit your documents. This gates every advanced permission,
so do it **first** — approval can take a few days.

---

## 5. Request permissions (App Review)

App dashboard → **App Review → Permissions and Features**. For each permission
below, click **Request Advanced Access**, then fill the form. Copy-paste the
justifications (edit the bracketed bits).

### Justifications (ready to paste)

**`pages_show_list`**
> Julikana is a marketing-automation platform. After a business owner connects
> with Facebook Login, we call this permission to display the list of Pages they
> manage so they can choose which Page to connect. No action is taken without
> the user selecting a Page.

**`pages_read_engagement`**
> We read the connected Page's posts and engagement metrics to show the business
> owner their performance dashboard and to let our AI assistant recommend
> improvements. Data is shown only to the authenticated owner of that Page.

**`pages_manage_posts`**
> The core feature: the business owner (or our AI assistant, on their explicit
> instruction) composes content in Julikana and publishes it to their own
> connected Page. This permission creates those posts via the Pages API.

**`pages_manage_engagement`** and **`pages_read_user_content`**
> To help businesses respond to their audience, Julikana reads comments on the
> business's own Page posts and lets the owner (or our AI, on their behalf)
> reply to and like those comments from a unified inbox.

**`pages_messaging`**
> Businesses use Julikana to answer customer messages. With the owner's consent,
> our AI assistant replies to Messenger conversations on the business's Page,
> within Meta's messaging policy windows, and escalates to a human when needed.

**`instagram_basic`**
> After connecting, we read the business's own Instagram Business account profile
> and media to display it in their dashboard and let them select it for posting.

**`instagram_content_publish`**
> The business owner composes content in Julikana and publishes it to their own
> connected Instagram Business account (feed posts and reels).

**`instagram_manage_comments`**
> Julikana shows the business the comments on their own Instagram posts and lets
> them (or our AI, on their instruction) reply to and moderate those comments.

**`instagram_manage_insights`**
> We read insights for the business's own Instagram account and posts to power
> their analytics dashboard and AI recommendations.

**`instagram_manage_messages`** *(only if doing IG DMs)*
> With the owner's consent, our AI assistant replies to Instagram Direct
> messages the business receives, within Meta's messaging policy windows.

---

## 6. The screencast (the part reviewers actually judge)

Record ONE clear screen recording (Loom/phone screen record) that shows a real
end-to-end flow. Reviewers reject vague videos. It must show:

1. Logging into Julikana with the **test account** you provided.
2. Clicking **Connect Facebook** → the Facebook Login dialog → granting the
   permissions → returning to Julikana with the Page/IG connected.
3. Each requested permission **actually working**, e.g.:
   - Compose a post in Julikana → publish → show it live on the Page/IG
     (`pages_manage_posts` / `instagram_content_publish`).
   - Open a post's comments in Julikana → reply to one → show the reply on the
     post (`*_manage_comments` / `pages_manage_engagement`).
   - Show a Messenger/IG message arriving in Julikana's inbox and a reply going
     out (`pages_messaging` / `instagram_manage_messages`).
   - Show the analytics/insights screen populated (`*_insights`).

In the submission's **"How to test"** box, write numbered steps matching the
video and include the test-account credentials and which Page/IG to use.

---

## 7. Go Live

Once permissions are approved and business verification is done, flip the app
from **Development** to **Live** (top toggle). Only then can real clients — not
just your test users — connect. Then set `META_APP_ID` / `META_APP_SECRET` on
Render and enable the "meta" connector (owner-only, in the app).

---

## 8. Later: paid boosting (Marketing API)

The Boost feature needs `ads_management` / `ads_read` via the **Marketing API**,
which has stricter access (Standard access first; Advanced sometimes needs a
business relationship or higher app tier). Treat it as a **second** submission
after organic posting is live and earning trust. M-Pesa-funded boosts and the
per-platform ad flows are wired but dormant until this is granted.

---

## 9. Common rejection reasons (avoid these)

- Screencast doesn't clearly show the permission being used → **most common**.
- App in Development mode when submitted, or reviewer can't log in → provide a
  working test account.
- Missing/placeholder Privacy Policy or Data Deletion URL.
- Requesting permissions the app doesn't visibly use.
- Business Verification not completed first.

---

## 10. Your ordered checklist

1. [ ] Create Business Portfolio + start **Business Verification**.
2. [ ] Ask me to generate the **privacy / terms / data-deletion** pages.
3. [ ] Create the **Business** app; add Facebook Login, Instagram, Webhooks.
4. [ ] Set redirect URI + webhook callback to the live API.
5. [ ] Create a **test account** in Julikana; connect a test Page + IG.
6. [ ] Record the **screencast**.
7. [ ] Submit each permission with the justifications above.
8. [ ] Respond to reviewer feedback; re-submit if needed.
9. [ ] Flip app to **Live**; set `META_APP_ID`/`SECRET` on Render; enable the
       connector.
10. [ ] (Later) Marketing API access for boosting.
