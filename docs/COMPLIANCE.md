# Compliance notes — Eye got you

> ⚠️ **Not legal advice.** This is a plain-English orientation for the team, written for the app's current **local-only, no-server, no-PHI-transmission** design. Laws vary by jurisdiction and change over time. Have a healthcare/privacy attorney review before you publish, and re-review if the architecture changes.

## Does HIPAA apply?

Short answer for the current design: **most likely no** — but "HIPAA compliant" is often the wrong frame for a consumer app.

HIPAA governs **covered entities** (healthcare providers, health plans, healthcare clearinghouses) and their **business associates** (vendors that handle protected health information *on a covered entity's behalf*). A tool a patient chooses and uses **for themselves**, where the developer is not acting for a covered entity, is generally **outside HIPAA**. Eye got you stores data only on the user's device and transmits nothing to us, so there is no PHI in our custody and no business-associate relationship.

**HIPAA can attach** if any of these become true — treat each as a trigger to get counsel and likely Business Associate Agreements (BAAs):

- The app syncs data to your servers, or you can access user health data.
- You integrate with, or distribute on behalf of, a clinic/provider/health plan/EHR.
- A provider offers the app to their patients as part of care.

## What DOES apply to a consumer health app

Even outside HIPAA, these are the real obligations to plan for:

- **FTC Act + FTC Health Breach Notification Rule.** The FTC has enforced against health apps for sharing health data without clear consent and for failing to notify users of breaches. The Rule covers many non-HIPAA health apps. Keeping data on-device and not sharing it is the strongest posture here.
- **State privacy laws.** California (CCPA/CPRA — with health data often treated as sensitive), plus Washington's **My Health My Data Act** (broad "consumer health data" definition, consent + a published Consumer Health Data Privacy Policy), Colorado, Virginia, and others. Because the app collects no identifiers and keeps data local, exposure is low — but a published privacy policy and honest disclosures are still expected.
- **GDPR / UK GDPR** if you have EU/UK users: health data is a special category. Local-only processing and data minimization help; you still provide transparency and honor rights.
- **App Store / Google Play health-data policies.** Both require a privacy policy URL, accurate data-safety/nutrition-label disclosures, justified permissions, and restrict secondary use of health data. Fill these out to match this app: essentially "data stays on device, not collected by developer."
- **Medical device / FDA.** A simple medication reminder/organizer is generally **not** a regulated medical device. Do **not** add dosing recommendations, diagnosis, or clinical decision-making — that can pull you into FDA territory. The Terms' medical disclaimer reinforces this boundary.

## How the app already supports this

- **Data minimization** — no identifiers collected (see `docs/SECURITY.md`).
- **On-device encryption** + a "delete all my data" control.
- **Privacy Policy & Terms** in-app and in `/docs` (host the Privacy Policy at a public URL for the app stores).
- **Medical disclaimer** gate on first run + in Terms (not a medical device, verify against the label, follow your clinician).
- **PHI-free analytics** with opt-out.
- **No third-party trackers, ads, or data sales.**

## Before launch — checklist

- [ ] Attorney review of Privacy Policy + Terms; fill all `[BRACKETED]` placeholders (legal entity, contact, governing law).
- [ ] Host the Privacy Policy at a stable HTTPS URL; add it to App Store Connect and Play Console.
- [ ] Complete Apple **App Privacy** + Google **Data safety** forms to reflect "data not collected / stays on device."
- [ ] Confirm permission strings (camera, notifications) are accurate and minimal.
- [ ] Decide EU/UK availability and, if yes, confirm GDPR transparency.
- [ ] If you ever add sync/accounts/provider integrations: revisit HIPAA + BAAs and re-do this analysis.
