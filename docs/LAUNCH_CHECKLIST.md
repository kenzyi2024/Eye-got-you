# Launch checklist — Eye got you

Status of the 20-item review, adapted for a **mobile app** (web-only items noted). Data posture: **local-only, no server, PHI-free analytics.**

| # | Item | Status | Notes |
|---|------|--------|-------|
| 1 | Privacy policy | ✅ Done | In-app (Settings → Privacy Policy) + `docs/PRIVACY_POLICY.md`. Host at an HTTPS URL for the app stores. Fill `[BRACKETED]` placeholders. |
| 2 | Compress images | ✅ Done | Icon/adaptive/splash/favicon generated + losslessly optimized. Only other asset is `chime.mp3`. |
| 3 | Terms & conditions | ✅ Done | In-app + `docs/TERMS.md`, incl. medical disclaimer. |
| 4 | Page load speed | ➖ Adapted | No web pages. App-startup analog: bundle stays lean; consider Hermes (Expo default) + `expo-doctor`. |
| 5 | Secrets off the frontend | ✅ Done | Audited — no keys/tokens anywhere; `.env*` git-ignored; no network calls. |
| 6 | Fix color contrast | ✅ Done | WCAG AA audit; bumped `textLow` (#6C7893→#8792AC). All text now ≥4.5:1 (or ≥3:1 large). |
| 7 | Force HTTPS | ✅ Done | iOS ATS `NSAllowsArbitraryLoads=false`; Android `usesCleartextTraffic=false`. |
| 8 | Mobile friendly | ✅ Inherent | It's a native mobile app; large touch targets + safe-area insets throughout. |
| 9 | Cookie consent banner | ⤫ N/A | No web views / cookies. Consent handled by the analytics opt-out + disclosure. |
| 10 | Custom 404 page | ⤫ N/A (web) | App has a graceful "medication no longer available" fallback on the detail route. |
| 11 | Meta titles + descriptions | ⤫ N/A (web SEO) | App Store listing metadata is the analog (write when submitting). |
| 12 | Fix broken links | ✅ Done | In-app Privacy/Terms links resolve to real screens; no dead links. |
| 13 | Social preview image | ⤫ N/A (web OG) | App Store screenshots are the analog. |
| 14 | Form validation | ✅ Done | Steppers bounded; frequency clamped 1–6; quiet-hours wrap 0–24h; empty scanned name → "Unnamed medication"; confirm screen requires an explicit YES. |
| 15 | Favicon | ✅ Done | App icon + Android adaptive icon + web favicon + notification icon, all themed. |
| 16 | Spam protection | ⤫ N/A | No public forms/backend to spam. |
| 17 | Sitemap + robots.txt | ⤫ N/A (web) | — |
| 18 | Analytics | ✅ Done | PHI-free, allow-list-only wrapper with opt-out; no network sink by default. |
| 19 | Alt text on images | ✅ Done | Accessibility labels on all icons/controls; decorative visuals hidden from screen readers. |
| 20 | One clear CTA | ✅ Done | Home's primary action is "＋ Scan a bottle" (single filled button; reinforced in the empty state). |

## Security & compliance (the important part)

- **On-device encryption** — store AES-encrypted with a key in the device keystore (`docs/SECURITY.md`).
- **Data minimization** — no name/DOB/SSN/insurance/contact/location; no account.
- **HIPAA** — the current local-only design most likely sits **outside** HIPAA; consumer-health rules (FTC, state laws, app-store policies) still apply. See `docs/COMPLIANCE.md`.
- **First-run medical disclaimer** gate + "Delete all my data" control.

## Before you submit to the stores

1. Have an attorney review Privacy Policy + Terms; fill all `[BRACKETED]` placeholders.
2. Host the Privacy Policy at a public HTTPS URL; add it in App Store Connect + Play Console.
3. Complete Apple **App Privacy** + Google **Data safety** as "data not collected / stays on device."
4. Run `npx expo install --fix`, then `npx expo-doctor`.
5. Re-open `docs/COMPLIANCE.md` if you ever add sync, accounts, or provider integrations.
