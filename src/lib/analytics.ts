/**
 * Eye got you — PHI-safe analytics
 * ------------------------------------------------------------------
 * A deliberately tiny, safe-by-construction analytics layer. It can
 * only emit a fixed set of NON-health events with NO free-form data:
 *   • event names are a closed allow-list (no medication names, ever)
 *   • properties are restricted to counts / booleans / whitelisted enums
 *   • a hard scrubber drops anything that isn't on the allow-list
 *   • respects the user's opt-out
 *
 * By default there is NO network sink — events go to the dev console
 * only. To wire a real backend later, implement `sink` with a
 * privacy-preserving, no-PHI provider and keep the scrubber in place.
 * Never pass a medication name, dosage, schedule, note, or identifier.
 */

import { useMedStore } from '../state/useMedStore';

/** The only events we will ever emit. Names describe actions, not data. */
export type AnalyticsEvent =
  | 'app_opened'
  | 'scan_started'
  | 'scan_completed'
  | 'dose_logged'
  | 'dose_snoozed'
  | 'reminder_test_sent'
  | 'quiet_hours_toggled'
  | 'medication_archived';

/** Properties are numbers/booleans only — never strings/PHI. */
export type SafeProps = Record<string, number | boolean>;

/** Keys explicitly permitted alongside an event. Everything else is dropped. */
const ALLOWED_PROP_KEYS = new Set([
  'count',
  'timesPerDay',
  'remindersEnabled',
  'quietEnabled',
  'usedBarcode',
]);

/** Optional network sink. Left null → console-only, no data leaves device. */
let sink: ((event: AnalyticsEvent, props: SafeProps) => void) | null = null;

/** Wire a real (PHI-free) provider here in a build that wants remote metrics. */
export function setAnalyticsSink(fn: typeof sink): void {
  sink = fn;
}

/** Strip anything that isn't a whitelisted key holding a number/boolean. */
function scrub(props?: SafeProps): SafeProps {
  const clean: SafeProps = {};
  if (!props) return clean;
  for (const [k, v] of Object.entries(props)) {
    if (!ALLOWED_PROP_KEYS.has(k)) continue;
    if (typeof v === 'number' || typeof v === 'boolean') clean[k] = v;
  }
  return clean;
}

/**
 * Record an event. No-op when the user has opted out. Cannot carry PHI:
 * the event name is from a closed union and props are scrubbed to
 * whitelisted primitives.
 */
export function track(event: AnalyticsEvent, props?: SafeProps): void {
  try {
    if (useMedStore.getState().analyticsOptedOut) return;
    const clean = scrub(props);
    if (sink) sink(event, clean);
    else if (__DEV__) console.log('[analytics]', event, clean);
  } catch {
    /* analytics must never break the app */
  }
}
