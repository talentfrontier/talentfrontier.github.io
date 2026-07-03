# Lazidential app-link site (GitHub Pages)

This folder is the content of the `talentfrontier.github.io` repository. It makes
`https://talentfrontier.github.io/<path>` links open the Lazidential app DIRECTLY
(verified Android App Links) — including from Telegram inline buttons, which is
impossible with `damco://` or `intent://` bridges alone.

## Files
- `.well-known/assetlinks.json` — proves to Android that this domain belongs to
  `com.damco.damco` (signing-cert SHA256 pinned). **If the app is ever re-signed
  (new EAS keystore), regenerate the fingerprint and update this file.**
- `404.html` — GitHub Pages serves this for every unknown path, so it doubles as
  the "app not installed" fallback: it retries the deep link and shows a button.
- `index.html` — plain landing page.

## Publish (once)
1. Create a **public** repo named exactly `talentfrontier.github.io` on GitHub.
2. Push this folder's CONTENTS as its root on branch `main`.
3. Wait ~1 minute, then verify:
   `curl https://talentfrontier.github.io/.well-known/assetlinks.json`

## App side (rides the next EAS build)
`app.json` → `android.intentFilters` has an autoVerify VIEW filter for this host.
On install, Android fetches assetlinks.json and from then on ALL
`https://talentfrontier.github.io/...` links open the app instantly.
