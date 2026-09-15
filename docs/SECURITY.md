# Security overview — Eye got you

_Last updated September 15, 2026. This describes how the app protects data today; it is not a certification._

## Threat model in one line

Eye got you is a **local-first** app: all health data lives on the user's device and is never transmitted. So the risks that matter are device-level (lost/stolen/unlocked phone, device backups, a filesystem dump) — not server breaches, because there is no server holding health data.

## Data minimization

The single most effective control is storing as little as possible. The app deliberately collects **no direct identifiers**:

- ✅ Stored (on device only): medication name + strength you confirm, which eye, dosing schedule, reminder settings, dose/skip logs.
- ❌ Never collected: name, email, phone, date of birth, SSN or government ID, insurance/payment info, precise location, contacts, or any account.

Because there is no identity attached, the stored data is low-sensitivity even before encryption.

## Encryption at rest

- The persisted store is **AES-encrypted** (`src/lib/secureStorage.ts`) before it is written to `AsyncStorage`.
- The encryption key is a random 256-bit value generated on first run and stored in the **device keystore** — iOS Keychain / Android Keystore — via `expo-secure-store`, marked `WHEN_UNLOCKED_THIS_DEVICE_ONLY` (not synced to iCloud/Google, not included in device backups).
- "Delete all my data" (Settings) removes the store **and destroys the key**, making any residual ciphertext permanently unreadable.

This sits on top of the OS app sandbox and full-device encryption. Defense in depth — not absolute. A jailbroken/rooted device, or one handed over while unlocked, remains at risk.

## Transport security

The app makes **no network calls today**. As a forward guard we still enforce HTTPS-only:

- iOS: `NSAppTransportSecurity.NSAllowsArbitraryLoads = false` (`app.json`).
- Android: `usesCleartextTraffic = false` (`app.json`).

If a future feature (e.g. NDC drug-name lookup) adds networking, it must use HTTPS and send **no** health data.

## Secrets

There are **no API keys, tokens, or credentials** in the app or repo (audited). `.env*` is git-ignored. If secrets are ever needed, they must not ship in the client bundle — use a backend or a secrets manager, never hardcode.

## Analytics

Optional and **PHI-free by construction** (`src/lib/analytics.ts`): a closed allow-list of non-health event names, numeric/boolean props only, a scrubber that drops anything else, and a user opt-out. No network sink is wired by default.

## Permissions

Only **camera** (read the bottle) and **notifications** (reminders). No photos-library, location, contacts, or microphone access.

## Responsible disclosure

Security reports: **[security@yourdomain.com]**. Please allow reasonable time to remediate before public disclosure.
