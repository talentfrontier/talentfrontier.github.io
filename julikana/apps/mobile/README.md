# Julikana Mobile (Domo in your pocket)

Expo / React Native app: chat with Domo, watch the dashboard, browse leads
and the inbox. Light & dark themes follow the system.

## Get the APK (EAS build)

The APK is compiled on Expo's build servers under **your** Expo account:

```bash
cd julikana/apps/mobile
npm install                      # if not already installed at repo root

# one-time setup
npm i -g eas-cli                 # or use: npx eas-cli
eas login                        # your expo.dev account
eas init                         # links the project, writes projectId into app.json

# point the app at your deployed API (edit eas.json → build.preview.env)
#   EXPO_PUBLIC_API_URL=https://your-api-host

# build the APK
eas build --platform android --profile preview
```

When the build finishes (~10–15 min), EAS prints a download URL and the APK
also appears on your expo.dev dashboard — install it directly on any Android
device. The `production` profile produces an `.aab` for Play Store submission.

## Local development (no build needed)

```bash
npm run dev        # starts Metro; scan the QR with the Expo Go app
```

With the API running locally, the Android emulator reaches it via the default
`http://10.0.2.2:4000`. On a physical device set
`EXPO_PUBLIC_API_URL=http://<your-lan-ip>:4000` when starting Metro.

## UI conventions (keep these)

- **Always respect safe-area insets on edge UI.** Use
  `react-native-safe-area-context` (`SafeAreaProvider` + `useSafeAreaInsets`)
  and pad the header by `insets.top` and the bottom tab bar by
  `insets.bottom`. Never rely on `react-native`'s `SafeAreaView` (it only
  insets on iOS), or the tab bar will overlap Android's gesture bar / nav
  buttons. New bottom-anchored controls must clear the system nav the same way.

## Notes

- `eas.json` profiles: `preview` → APK (internal distribution), `production`
  → app-bundle. Both bake `EXPO_PUBLIC_API_URL` into the JS bundle.
- Signing: EAS generates and stores the Android keystore automatically on
  first build (or `eas credentials` to bring your own).
- The app works without a backend ("Explore the demo") so the APK is
  testable before the API is deployed.
