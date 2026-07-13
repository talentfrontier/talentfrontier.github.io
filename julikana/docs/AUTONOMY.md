# Autonomous Domo — capabilities & the lines we hold

This documents the "Domo runs itself" features and, just as importantly, the
three places where we build the **compliant, effective** version instead of the
literal request — because the literal version would get your accounts banned or
create legal/PCI liability, which defeats the purpose.

## What Domo does unsupervised

- **Autopilot** (`/autopilot`): flip it on and Domo keeps the content pipeline
  full, schedules posts into each platform's audience-active hours, and posts
  continuously — within **safe per-platform daily ceilings** (`PacingService`).
  Owners read **progress reports** (`GET /autopilot/report`); no supervision
  needed. Quiet hours are respected; posting minutes are humanised (no robotic
  round-number timestamps).
- **Self-optimization** (`OptimizerService`, every 6h): reads how posts actually
  performed, makes more of what works, eases off what doesn't, nudges timing
  toward the best hours, and (optionally, within a weekly budget) auto-boosts
  winners.
- **Accepts new tasks while running**: the agent queue runs several agents
  concurrently; a new user instruction is enqueued at **higher priority** than
  background autopilot work, so it jumps ahead while in-flight tasks finish.
- **Raw footage → edited commercial video**: feed Domo raw clips
  (`rawMediaAssetIds` + `preferences`) and the Video Creator writes an edit
  decision list (cuts, order, captions, transitions, music, voiceover) and the
  media worker renders a polished short.
- **Sheng / Swahili voice**: set org `locale` to `sheng`, `sw`, or `sw-sheng`
  and every agent writes like a Gen-Z Nairobian — natural code-switching,
  current slang, the right emoji energy (`MemoryService.localeInstruction`).
- **Owner-only connectors** (`/connectors`): only accounts in
  `SUPERADMIN_EMAILS` can add or enable integrations (including custom apps).
  Regular users only see which connectors are *available*; never the secrets.
- **Boosting** (`/boost`): boost any post with a budget + duration; the API
  validates against each platform's real minimum daily spend, tells you which
  payment method would pay, detects whether the ad account already has funding
  connected, and supports "always use this card" via a saved default method.

## The three lines we hold (and why)

### 1. Growth volume — fast but never spammy
"Post as many times as possible / cold-DM until they close, without getting
flagged" is a spam pattern. Platforms detect and ban it; a tool built to *evade*
detection is a spam tool. Instead Domo maximises **sustainable** output and
leans on **inbound + opt-in** engagement (reply instantly to everyone who
interacts first). `OutreachService` **refuses** to target anyone without
`interactionProof` — no scraping strangers. This grows accounts faster over
weeks because the accounts stay alive and the engagement is real.

### 2. Payments — tokenized only, never raw cards
We **never** store a card number, expiry, or CVV — storing a CVV is prohibited
by PCI-DSS, full stop. Cards are collected directly by **Stripe** (SetupIntent
→ we keep only a token + safe last4 for display). Ad spend can also run on
**M-Pesa STK push** (Daraja), which needs no card at all. "Always use this card"
= a saved default tokenized method, not stored PANs.

### 3. Ad-account funding — via official APIs
Domo doesn't type your card into each platform's ad manager (PCI + ToS
violation). It boosts through each platform's **official Marketing API** with a
tokenized funding source, honouring their budget/duration structures.

The net effect is the product you wanted — a marketing employee that runs itself
and promotes even itself — built so it survives contact with real platforms and
real regulators.
