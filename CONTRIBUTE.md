# Contributing to Captain's Log

Thank you for helping improve Captain's Log. Contributions should preserve the application's offline-first design, keep local SQLite and managed attachments authoritative, and treat Google Drive as optional backup rather than the primary database.

## Before You Begin

Read the project references relevant to your change:

- [`docs/captains-log.yaml`](docs/captains-log.yaml) defines product behavior.
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) describes the implemented architecture.
- [`docs/ROADMAP.md`](docs/ROADMAP.md) defines current scope and implementation order.
- [`docs/DEVNOTES.md`](docs/DEVNOTES.md) records engineering decisions.
- [`docs/ANNOTATION_STANDARDS.md`](docs/ANNOTATION_STANDARDS.md) defines source documentation requirements.
- [`docs/TEST_LOG_STANDARDS.md`](docs/TEST_LOG_STANDARDS.md) defines verification and evidence requirements.

This project uses Expo SDK 57. Consult the [versioned Expo SDK 57 documentation](https://docs.expo.dev/versions/v57.0.0/) before changing Expo configuration, packages, routing, or platform integrations.

## Development Setup

Install dependencies and start Expo:

```bash
npm install
npx expo start
```

Platform-specific development commands are also available:

```bash
npm run android
npm run ios
npm run web
```

Google authentication and Drive backup require a platform-specific OAuth client ID. Configure it through `app.json` under `expo.extra` or with the appropriate `EXPO_PUBLIC_GOOGLE_{WEB,IOS,ANDROID}_CLIENT_ID` environment variable. Never commit credentials, tokens, personal data, or local archives.

## Making a Change

1. Keep each change focused on one feature, fix, or documentation concern.
2. Follow the boundaries and dependency direction documented in `docs/ARCHITECTURE.md`.
3. Preserve offline behavior and avoid making optional network services a prerequisite for core logging workflows.
4. Add or update source annotations according to `docs/ANNOTATION_STANDARDS.md`.
5. Record material architectural, interface, persistence, security, or platform decisions in the append-only `docs/DEVNOTES.md` journal.
6. Add tests or smoke coverage appropriate to the risk and record executed verification in the append-only `docs/TEST_LOG.md` journal.

Project-authored source files must use this ownership and license metadata in their file headers:

```text
Author:
    Michael Garcia

Contact:
    michael@mandedesign.studio

License:
    SPDX-License-Identifier: MPL-2.0
```

Generated files, vendored dependencies, lockfiles, data files, and formats that cannot safely contain comments are exempt from source headers.

## Validation

Run the full static and smoke-test suite before submitting a change:

```bash
npm run typecheck
npm run lint
npm run test:node
```

Use the T0–T3 validation level appropriate to the change as described in `docs/TEST_LOG_STANDARDS.md`. Do not report a test as passing unless it was actually executed and its expected result was observed.

## Submitting a Contribution

In a pull request or patch description:

- explain the problem and the resulting behavior;
- identify material design decisions and their related `DEV-...` records;
- list the validation commands executed and related `TEST-...` records;
- call out migrations, compatibility concerns, known limitations, or follow-up work;
- include screenshots or recordings when the user interface changes materially.

Keep commits reviewable and avoid including unrelated formatting, generated output, local environment files, or dependency changes that are not required by the contribution.

## License

By contributing, you agree that your contribution will be licensed under the [Mozilla Public License 2.0](LICENSE). Copyright for the project is held by Michael Garcia, M&E Design, 2026, except where a file contains a different applicable notice.
