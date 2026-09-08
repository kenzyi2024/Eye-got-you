/**
 * Eye got you — OCR bridge
 * ------------------------------------------------------------------
 * The ScannerScreen depends only on `recognizeMedicationText(uri)`.
 * This module wraps whichever on-device text recognizer is available
 * and normalizes a raw label into a medication guess.
 *
 * Production wiring (recommended):
 *   npx expo install react-native-vision-camera
 *   npm i @react-native-ml-kit/text-recognition
 * then implement `runNativeOcr` below with MLKit. In Expo Go (no native
 * OCR), the stub returns null so the barcode path still works.
 */

import { DropForm } from '../models/medication';

export interface RecognizedMedication {
  name: string;
  strength?: string;
  form?: DropForm;
  /** 0–1 confidence from the recognizer, if available. */
  confidence?: number;
}

/** Common ophthalmic drops — used to disambiguate noisy OCR output. */
const KNOWN_DROPS = [
  'latanoprost',
  'timolol',
  'brimonidine',
  'dorzolamide',
  'travoprost',
  'bimatoprost',
  'ketorolac',
  'prednisolone',
  'cyclosporine',
  'olopatadine',
  'moxifloxacin',
  'nepafenac',
  'brinzolamide',
  'netarsudil',
];

const STRENGTH_RE = /(\d+(?:\.\d+)?)\s?%/;

/**
 * Attempt to recognize a medication from a captured frame.
 * Returns null when nothing confident is found (keep scanning).
 */
export async function recognizeMedicationText(
  uri: string,
): Promise<RecognizedMedication | null> {
  const raw = await runNativeOcr(uri);
  if (!raw) return null;
  return parseLabel(raw);
}

/**
 * Turn a raw OCR blob into a structured guess.
 * Exported for unit testing without a camera.
 */
export function parseLabel(raw: string): RecognizedMedication | null {
  const text = raw.toLowerCase();

  const known = KNOWN_DROPS.find((d) => text.includes(d));
  const strengthMatch = raw.match(STRENGTH_RE);
  const strength = strengthMatch ? `${strengthMatch[1]}%` : undefined;

  if (known) {
    return {
      name: capitalize(known),
      strength,
      form: inferForm(text),
      confidence: 0.9,
    };
  }

  // Fallback: first plausible drug-like token (>= 5 letters, alpha).
  const token = raw
    .split(/\s+/)
    .map((w) => w.replace(/[^A-Za-z]/g, ''))
    .find((w) => w.length >= 5);

  if (token) {
    return { name: capitalize(token), strength, form: inferForm(text), confidence: 0.5 };
  }

  return null;
}

function inferForm(text: string): DropForm {
  if (text.includes('ointment')) return DropForm.Ointment;
  if (text.includes('gel')) return DropForm.Gel;
  if (text.includes('suspension')) return DropForm.Suspension;
  return DropForm.Solution;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/* -------------------------------------------------------------------------- */
/*  Native OCR — swap this body for MLKit in a dev build.                       */
/* -------------------------------------------------------------------------- */

async function runNativeOcr(uri: string): Promise<string | null> {
  try {
    // Lazy require so Expo Go (which lacks the native module) doesn't crash.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const TextRecognition = require('@react-native-ml-kit/text-recognition').default;
    const result = await TextRecognition.recognize(uri);
    return result?.text ?? null;
  } catch {
    // No native OCR available (e.g. Expo Go) — barcode path still works.
    return null;
  }
}
