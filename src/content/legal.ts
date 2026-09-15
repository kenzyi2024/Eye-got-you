/**
 * Eye got you — Legal & policy content (single source of truth)
 * ------------------------------------------------------------------
 * Rendered in-app by LegalScreen and mirrored to /docs/*.md for hosting
 * (app stores require a reachable privacy-policy URL).
 *
 * ⚠️ These are carefully written templates for a LOCAL-ONLY app that
 * transmits no health data. They are NOT legal advice. Before you
 * publish, have a healthcare/privacy attorney review them and fill the
 * [BRACKETED] placeholders (legal entity, contact, governing law).
 */

export const LEGAL_META = {
  appName: 'Eye got you',
  company: '[COMPANY / DEVELOPER NAME]',
  contactEmail: '[support@yourdomain.com]',
  governingLaw: '[Your state/country]',
  effectiveDate: 'September 15, 2026',
};

export interface LegalSection {
  heading: string;
  body: string;
}

export interface LegalDoc {
  title: string;
  updated: string;
  intro: string;
  sections: LegalSection[];
}

/* -------------------------------------------------------------------------- */
/*  Medical disclaimer (also shown as a first-run gate)                        */
/* -------------------------------------------------------------------------- */

export const DISCLAIMER_SHORT =
  'Eye got you helps you organize your eye-drop routine. It is NOT a medical ' +
  'device and does not give medical advice. Always follow your doctor’s and ' +
  'pharmacist’s instructions, and check every dose against the actual bottle ' +
  'label. In an emergency, call your local emergency number.';

/* -------------------------------------------------------------------------- */
/*  Privacy Policy                                                             */
/* -------------------------------------------------------------------------- */

export const PRIVACY_POLICY: LegalDoc = {
  title: 'Privacy Policy',
  updated: LEGAL_META.effectiveDate,
  intro:
    `${LEGAL_META.appName} is built privacy-first. Your medication information ` +
    `stays on your device — we do not run servers that receive it, we cannot ` +
    `see it, and we never sell or share it.`,
  sections: [
    {
      heading: 'The short version',
      body:
        'Everything you enter or scan is stored only on your phone and encrypted ' +
        'at rest. Camera images are processed on your device and never uploaded. ' +
        'We collect no account, no name, no date of birth, no insurance or ' +
        'contact details. Optional, privacy-preserving analytics contain no ' +
        'health information and can be turned off.',
    },
    {
      heading: 'Information stored on your device',
      body:
        'When you add a medication we store: the medication name and strength you ' +
        'confirm, which eye it is for, your dosing schedule and reminder settings, ' +
        'and the times you log or skip a dose. This lives in encrypted storage on ' +
        'your device only. It is not transmitted to us or to any third party.',
    },
    {
      heading: 'Information we do NOT collect',
      body:
        'We do not collect your name, email, phone number, date of birth, Social ' +
        'Security number, insurance or payment information, precise location, ' +
        'contacts, or any government identifier. There is no sign-up and no account.',
    },
    {
      heading: 'Camera',
      body:
        'The camera is used only to read your bottle’s barcode or label so you do ' +
        'not have to type it. Image frames are analyzed on your device in the ' +
        'moment and are not saved to your photo library, not stored by the app, ' +
        'and not uploaded anywhere.',
    },
    {
      heading: 'Analytics (optional, no health data)',
      body:
        'If you leave analytics on, we may record de-identified, aggregate signals ' +
        'such as “app opened”, “scan completed”, or a crash report. These never ' +
        'include a medication name, dosage, schedule, or anything that identifies ' +
        'you or your health. You can turn analytics off at any time in Settings.',
    },
    {
      heading: 'Notifications',
      body:
        'Dose reminders are scheduled locally by your device. A reminder may show ' +
        'a medication name on your lock screen; if you prefer, disable reminders ' +
        'per bottle or hide notification content in your system settings.',
    },
    {
      heading: 'How your data is protected',
      body:
        'Data is encrypted at rest using a key held in your device’s secure ' +
        'keystore (iOS Keychain / Android Keystore), on top of the operating ' +
        'system’s app sandbox and device encryption. No security is absolute — a ' +
        'lost, unlocked, or jailbroken/rooted device can still be at risk, which ' +
        'is why we deliberately store as little as possible.',
    },
    {
      heading: 'Your choices and controls',
      body:
        'You can edit or archive any medication, and delete all app data at any ' +
        'time from Settings — deleting also destroys the encryption key, rendering ' +
        'any residual data unreadable. Uninstalling the app removes its data from ' +
        'your device.',
    },
    {
      heading: 'Children',
      body:
        'Eye got you is intended for use by adults or by a caregiver on a ' +
        'patient’s behalf. It is not directed to children under 13, and we do not ' +
        'knowingly collect information from them.',
    },
    {
      heading: 'Your privacy rights',
      body:
        'Depending on where you live (for example under GDPR or CCPA/CPRA), you ' +
        'may have rights to access, correct, or delete personal data. Because your ' +
        'data never leaves your device, you exercise these rights directly in the ' +
        'app. Questions: ' + LEGAL_META.contactEmail + '.',
    },
    {
      heading: 'Changes to this policy',
      body:
        'If we change this policy we will update the date above and, for material ' +
        'changes, surface a notice in the app. Continued use after an update means ' +
        'you accept the revised policy.',
    },
    {
      heading: 'Contact',
      body:
        `${LEGAL_META.company}. Questions about privacy: ${LEGAL_META.contactEmail}.`,
    },
  ],
};

/* -------------------------------------------------------------------------- */
/*  Terms & Conditions                                                         */
/* -------------------------------------------------------------------------- */

export const TERMS: LegalDoc = {
  title: 'Terms & Conditions',
  updated: LEGAL_META.effectiveDate,
  intro:
    `Please read these Terms carefully. By using ${LEGAL_META.appName} you agree ` +
    `to them. If you do not agree, do not use the app.`,
  sections: [
    {
      heading: 'Medical disclaimer — please read',
      body:
        'Eye got you is a personal organizing tool. It is NOT a medical device, ' +
        'is not FDA-cleared, and does not provide medical advice, diagnosis, or ' +
        'treatment. It does not replace your doctor, pharmacist, or professional ' +
        'medical judgment. Always follow the instructions on your prescription and ' +
        'bottle label, and verify every medication and dose against the actual ' +
        'bottle before use. Do not rely on the app as your only reminder. Never ' +
        'disregard or delay professional medical advice because of something in ' +
        'this app. In a medical emergency, call your local emergency number.',
    },
    {
      heading: 'Scanning may be imperfect',
      body:
        'Barcode and label recognition can misread or fail. The confirmation ' +
        'screen exists for a reason: it is your responsibility to confirm the ' +
        'medication is correct. When in doubt, enter details from the label ' +
        'yourself and consult your pharmacist.',
    },
    {
      heading: 'The washout and timing features are aids, not orders',
      body:
        'Interval calculations, the 5-minute washout timer, and the 30-day discard ' +
        'countdown are general conveniences. Your prescriber’s instructions always ' +
        'take precedence. Confirm timing and discard dates with your care team.',
    },
    {
      heading: 'License',
      body:
        'We grant you a personal, non-exclusive, non-transferable, revocable ' +
        'license to use the app for your own medication management. You may not ' +
        'copy, resell, reverse-engineer, or misuse the app.',
    },
    {
      heading: 'No warranty',
      body:
        'The app is provided “as is” and “as available”, without warranties of any ' +
        'kind, express or implied, including fitness for a particular purpose and ' +
        'non-infringement. We do not warrant that reminders will always fire, that ' +
        'scanning will be accurate, or that the app will be uninterrupted or ' +
        'error-free.',
    },
    {
      heading: 'Limitation of liability',
      body:
        'To the maximum extent permitted by law, ' + LEGAL_META.company + ' is not ' +
        'liable for any indirect, incidental, or consequential damages, or for any ' +
        'harm arising from missed, late, or incorrect doses, reliance on the app, ' +
        'or scanning errors. Your use of the app is at your own risk.',
    },
    {
      heading: 'Your responsibilities',
      body:
        'Keep your device secure and its software updated, confirm your regimen ' +
        'with your care team, and use the app only as an aid alongside your ' +
        'prescription instructions.',
    },
    {
      heading: 'Changes and termination',
      body:
        'We may update these Terms or the app, and may discontinue features. ' +
        'Material changes will be surfaced in the app. You may stop using the app ' +
        'and delete your data at any time.',
    },
    {
      heading: 'Governing law',
      body:
        'These Terms are governed by the laws of ' + LEGAL_META.governingLaw + ', ' +
        'without regard to conflict-of-laws rules.',
    },
    {
      heading: 'Contact',
      body: `${LEGAL_META.company}. Questions: ${LEGAL_META.contactEmail}.`,
    },
  ],
};

export const LEGAL_DOCS = {
  privacy: PRIVACY_POLICY,
  terms: TERMS,
} as const;

export type LegalDocKey = keyof typeof LEGAL_DOCS;
