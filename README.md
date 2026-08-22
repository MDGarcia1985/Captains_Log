# Captain's Log

Offline-first personal chronicle and knowledge graph for phones and tablets. Canonical data is local SQLite plus managed attachments. Google Drive is optional backup, not the primary database.

## Project documents

Read these before changing product behavior or architecture:

- [`docs/captains-log.yaml`](docs/captains-log.yaml) — product and behavior specification
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — implemented system architecture
- [`docs/ROADMAP.md`](docs/ROADMAP.md) — MVP implementation order and scope
- [`docs/DEVNOTES.md`](docs/DEVNOTES.md) — engineering decisions
- [`docs/TEST_LOG.md`](docs/TEST_LOG.md) — verification record
- [`docs/DEVNOTES_STANDARDS.md`](docs/DEVNOTES_STANDARDS.md), [`docs/ANNOTATION_STANDARDS.md`](docs/ANNOTATION_STANDARDS.md), [`docs/TEST_LOG_STANDARDS.md`](docs/TEST_LOG_STANDARDS.md) — documentation standards

## Run

Expo SDK 57. Routes live in `src/app`.

```bash
npm install
npx expo start
```

Then open a development build, Android emulator, iOS simulator, or Expo Go from the Metro UI.

Platform scripts:

```bash
npx expo start --android
npx expo start --ios
npx expo start --web
```

Google sign-in and Drive backup need the OAuth client ID for the **current platform** in `app.json` `expo.extra` or `EXPO_PUBLIC_GOOGLE_{WEB,IOS,ANDROID}_CLIENT_ID`. There is no web-to-native client ID fallback. AuthSession implicit tokens are prototype-only.

## Validate

```bash
npx tsc --noEmit
npx expo lint
node --experimental-strip-types scripts/node-smoke.ts
```

Record results in `docs/TEST_LOG.md` per `docs/TEST_LOG_STANDARDS.md`.
