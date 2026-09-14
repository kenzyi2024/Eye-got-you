# Eye got you

Dark-mode-first medical compliance app for complex eye-drop regimens.
React Native · Expo SDK 57 (RN 0.86, React 19.2) · TypeScript.

## What's built

```
App.tsx                          Navigation root: Home → Scan → MedicationDetail (dark nav theme)
index.ts                         Expo entry (registerRootComponent)

src/
├─ navigation/types.ts           Typed route params (RootStackParamList)
├─ models/medication.ts          Schema: Medication, DosingSchedule, DoseLog, Laterality (OS/OD/OU)
├─ logic/clinicalEngine.ts       Pure rules: 5-min washout, 30-day expiry, interval/dose-spread math
│  └─ clinicalEngine.test.ts     12 passing checks for the rules above
├─ state/useMedStore.ts          Zustand store (AsyncStorage-persisted) + all mutations
├─ hooks/useDoseLogger.ts        Log a dose anywhere + drive the WashoutWarning
├─ lib/
│  ├─ feedback.ts                Haptics + chime via expo-audio (successRecognized, warnBuzz, …)
│  └─ ocr.ts                     Pluggable OCR bridge (MLKit in dev build, safe stub in Expo Go)
├─ theme/theme.ts                Iris palette, high-contrast tokens, large type scale
├─ components/
│  ├─ EyeToggle.tsx              Eye-shaped switch that blinks open (cyan iris) ON / closes OFF
│  ├─ PupilSpinner.tsx           Loading pupil that dilates & constricts on a loop
│  ├─ DropReminder.tsx           Falling water-drop → ripple dose-reminder overlay
│  └─ WashoutWarning.tsx         Full-screen "wash out the first!" takeover + live countdown
└─ screens/
   ├─ HomeScreen.tsx             Medication list, next-dose banner, scan button
   ├─ ScanScreen.tsx             Route wrapper → replaces itself with the new bottle's detail
   ├─ ScanFlow.tsx               Wires scanner → confirmation → store
   ├─ ScannerScreen.tsx          Auto-capture camera, glowing guide-box, haptic+chime on lock
   ├─ ConfirmationScreen.tsx     Yellow-on-black "Is this X?" with giant YES / NO targets
   └─ MedicationDetailScreen.tsx Expiry, laterality, frequency stepper, reminders, log/archive
```

## Run it

```bash
cd "path/to/Eye got you"

npm install
npx expo install --fix   # locks every package to the exact version SDK 57 expects

npx expo start
```

Then install **Expo Go** on your phone, join the **same Wi-Fi**, and scan the QR
(iPhone: Camera app · Android: scan inside Expo Go). App opens on Home; tap
**Scan a bottle** to try the camera.

If you're starting from a clean machine and want the native config regenerated:

```bash
npx create-expo-app@latest . --template blank-typescript   # keeps src/, then re-add these files
```

### Dependencies (already in package.json)

```
@react-navigation/native  @react-navigation/native-stack
react-native-screens  react-native-safe-area-context
expo-camera  expo-haptics  expo-audio  expo-linear-gradient
expo-notifications  expo-device
react-native-reanimated (v4)  react-native-worklets  react-native-svg
zustand  @react-native-async-storage/async-storage

# Optional — production label OCR, requires a dev build (not Expo Go):
npm i @react-native-ml-kit/text-recognition
```

`babel.config.js` uses the Reanimated-4 plugin, which now lives in
`react-native-worklets` and **must be listed last**:

```js
module.exports = function (api) {
  api.cache(true);
  return { presets: ['babel-preset-expo'], plugins: ['react-native-worklets/plugin'] };
};
```

A short success tone ships at `assets/audio/chime.mp3` (swap in your own any time).

## Log a dose from any screen

```tsx
import { useDoseLogger } from './src/hooks/useDoseLogger';
import { WashoutWarning } from './src/components/WashoutWarning';

const { attempt, washout, dismiss, override } = useDoseLogger();
// attempt(medId) logs it, or opens the washout takeover if a different
// drop was used < 5 minutes ago.
<WashoutWarning {...washout} onDismiss={dismiss} onOverride={override} />
```

## Run the rule checks

```bash
npm run test:rules
# node --experimental-transform-types src/logic/clinicalEngine.test.ts
```

## Notes / next up

- `ocr.ts` returns `null` in Expo Go (no native text recognition), so the
  **barcode** auto-capture path works everywhere; wire MLKit in a dev build for
  label OCR.
- Barcode → NDC name lookup is stubbed (`'Scanned medication'`) — plug in an
  NDC/RxNorm lookup where noted in `ScannerScreen.onBarcodeScanned`.

## Dose reminders (expo-notifications)

Reminders fire automatically. `useReminderSync()` (mounted in `App.tsx`)
watches the store and, on any change, reschedules a repeating **DAILY** local
notification for every dose slot of every active, reminder-enabled,
non-expired bottle (`src/lib/notifications.ts`). Toggling the eye switch off,
archiving a bottle, or letting it expire cancels its reminders; tapping a
reminder opens that medication's detail screen.

Permission is requested the first time reminders are scheduled. Test it by
setting a dose time a minute or two ahead, or call `listOwnedReminders()` to
see what's queued.

The **Reminders** screen (⚙ on Home → `ReminderSettingsScreen`) adds:
- **Test reminder in 10s** — fires one notification so you can confirm on-device
  that reminders arrive (`sendTestReminder`).
- **Quiet hours** — a window (wraps past midnight) whose dose slots are muted;
  toggling it reschedules everything. Skipped slots are still visible per bottle.
- **Snooze 10 min** — a one-off nudge per bottle. Snoozes are tagged separately
  so a reschedule won't wipe them; they fire once and disappear.
- **Currently scheduled** — the live queue from `listOwnedReminders()`, each row
  cancellable, refreshed on focus.

**Per-bottle quiet-hours override** lives on each medication's detail screen
(`isDoseMuted` resolves it), and shows as a small badge on the Home row:
- **Follow app** — obey the global quiet hours (default).
- **Always ring** — critical drop; never muted, even during quiet hours.
- **Custom** — this bottle's own mute window, independent of the global toggle.

**Notification actions.** Every dose reminder carries the `dose-reminder`
category with two inline buttons (`setNotificationCategoryAsync`):
- **✓ Log dose** — logs the dose straight from the notification. It runs the
  same washout check; if it would wash out another drop, it posts a warning
  instead of writing the dose.
- **Snooze 10 min** — schedules a one-off nudge.

Taps are routed in `useReminderSync` by `response.actionIdentifier`; a plain
body tap still opens the medication.

> Actions use `opensAppToForeground: false`. If the app was killed, the action
> is processed the next time the app runs (the dose is timestamped then). For
> exact-time logging while fully backgrounded, register an
> `expo-task-manager` background handler — a natural follow-up.

> **Expo Go note:** local scheduled notifications work in Expo Go on **iOS**.
> **Android** Expo Go has limited notification support — use a dev build
> (`npx expo run:android`) to verify Android reminders.
