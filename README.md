# Eye got you

Dark-mode-first medical compliance app for complex eye-drop regimens. React Native + Expo + TypeScript.

## What's built so far

```
src/
├─ models/medication.ts          Data schema: Medication, DosingSchedule, DoseLog, Laterality (OS/OD/OU)
├─ logic/clinicalEngine.ts       Pure rules: 5-min washout, 30-day expiry, interval/dose-spread math
│  └─ clinicalEngine.test.ts     12 passing checks for the rules above
├─ state/useMedStore.ts          Zustand store (AsyncStorage-persisted) + all mutations
├─ lib/
│  ├─ feedback.ts                Haptics + chime (successRecognized, warnBuzz, …)
│  └─ ocr.ts                     Pluggable OCR bridge (MLKit in dev build, safe stub in Expo Go)
├─ theme/theme.ts                Iris palette, high-contrast tokens, large type scale
├─ components/
│  ├─ EyeToggle.tsx              Eye-shaped switch that blinks open (cyan iris) ON / closes OFF
│  ├─ PupilSpinner.tsx           Loading pupil that dilates & constricts on a loop
│  ├─ DropReminder.tsx           Falling water-drop → ripple dose-reminder overlay
│  └─ WashoutWarning.tsx         Full-screen "wash out the first!" danger takeover + live countdown
└─ screens/
   ├─ ScannerScreen.tsx          Auto-capture camera, glowing guide-box, haptic+chime on lock
   ├─ ConfirmationScreen.tsx     Yellow-on-black "Is this X?" with giant YES / NO targets
   └─ ScanFlow.tsx               Wires scanner → confirmation → store
```

## Install

```bash
npx create-expo-app@latest eye-got-you --template blank-typescript
cd eye-got-you

npx expo install zustand @react-native-async-storage/async-storage \
  expo-camera expo-haptics expo-av \
  react-native-reanimated react-native-svg expo-linear-gradient

# Optional (production OCR, requires a dev build — not Expo Go):
npm i @react-native-ml-kit/text-recognition
```

`babel.config.js` — add the Reanimated plugin (must be last):

```js
module.exports = function (api) {
  api.cache(true);
  return { presets: ['babel-preset-expo'], plugins: ['react-native-reanimated/plugin'] };
};
```

Add a short success tone at `assets/audio/chime.mp3`.

## Using it

```tsx
import ScanFlow from './src/screens/ScanFlow';
import { EyeToggle } from './src/components/EyeToggle';
import { useMedStore } from './src/state/useMedStore';

// Scan a bottle (auto-capture → confirm → persisted, 30-day clock starts)
<ScanFlow onComplete={(med) => navigation.navigate('Home')} />

// Log a dose with washout enforcement
const { logDose } = useMedStore();
const decision = logDose(medId);
if (!decision.allowed) showWashoutWarning(decision.remainingMs);
```

## Run the rule checks

```bash
node --experimental-transform-types src/logic/clinicalEngine.test.ts
```

## Notes / next up

- `ocr.ts` returns `null` in Expo Go (no native text recognition), so the **barcode** auto-capture path works everywhere; wire MLKit in a dev build for label OCR.
- Barcode → NDC name lookup is stubbed (`'Scanned medication'`) — plug in an NDC/RxNorm lookup where noted in `ScannerScreen.onBarcodeScanned`.
- Local notifications for dose reminders (`expo-notifications`) and the Home dashboard are the next screens to build on top of the store + `nextDoseAcross()`.
