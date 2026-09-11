/**
 * Eye got you — Clinical Engine
 * ------------------------------------------------------------------
 * Pure, side-effect-free functions. Everything here is unit-testable
 * and framework-agnostic: no React, no native modules. The store and
 * UI layers consume these results.
 *
 * Rules implemented:
 *   1. 5-minute washout between two DIFFERENT drops.
 *   2. 30-day bottle expiry countdown.
 *   3. Even dose spreading across the waking window (interval math).
 */

import {
  DoseLog,
  DoseStatus,
  DosingSchedule,
  Medication,
  WakingWindow,
  WASHOUT_MS,
} from '../models/medication';

/* -------------------------------------------------------------------------- */
/*  1. Washout rule                                                            */
/* -------------------------------------------------------------------------- */

export interface WashoutState {
  /** True while a different drop must not be logged. */
  active: boolean;
  /** ms remaining until the window clears (0 when inactive). */
  remainingMs: number;
  /** The medication whose drop is "holding" the window open. */
  blockingMedicationId: string | null;
}

/**
 * Given every dose log and the current time, determine whether we are
 * inside a washout window. Returns the last effective drop and how long
 * until a *different* drop is safe.
 */
export function computeWashout(
  logs: DoseLog[],
  now: number = Date.now(),
): WashoutState {
  let last: DoseLog | null = null;
  for (const log of logs) {
    if (log.status === DoseStatus.Skipped) continue;
    if (!last || log.takenAt > last.takenAt) last = log;
  }

  if (!last) {
    return { active: false, remainingMs: 0, blockingMedicationId: null };
  }

  const elapsed = now - last.takenAt;
  const remaining = WASHOUT_MS - elapsed;

  if (remaining <= 0) {
    return { active: false, remainingMs: 0, blockingMedicationId: null };
  }

  return {
    active: true,
    remainingMs: remaining,
    blockingMedicationId: last.medicationId,
  };
}

export interface WashoutDecision {
  allowed: boolean;
  /** True when the attempt would wash out a prior, different drop. */
  wouldWashOut: boolean;
  remainingMs: number;
  message?: string;
}

/**
 * Decide whether logging `medicationId` right now is safe.
 * Re-dosing the SAME medication is always allowed (it does not wash
 * itself out); a DIFFERENT medication inside the window is blocked.
 */
export function evaluateDoseAttempt(
  medicationId: string,
  logs: DoseLog[],
  now: number = Date.now(),
): WashoutDecision {
  const washout = computeWashout(logs, now);

  if (!washout.active) {
    return { allowed: true, wouldWashOut: false, remainingMs: 0 };
  }

  if (washout.blockingMedicationId === medicationId) {
    // Same drop again — permitted, no washout interaction.
    return { allowed: true, wouldWashOut: false, remainingMs: washout.remainingMs };
  }

  return {
    allowed: false,
    wouldWashOut: true,
    remainingMs: washout.remainingMs,
    message:
      'The second drop will wash out the first! Wait until the timer ' +
      'reaches zero before using a different medication.',
  };
}

/** Format ms as M:SS for the countdown UI. */
export function formatCountdown(ms: number): string {
  const clamped = Math.max(0, ms);
  const totalSeconds = Math.ceil(clamped / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/* -------------------------------------------------------------------------- */
/*  2. 30-day bottle expiry                                                    */
/* -------------------------------------------------------------------------- */

const DAY_MS = 24 * 60 * 60 * 1000;

export interface ExpiryState {
  /** Whole days left (can be negative if overdue). Null if unopened. */
  daysRemaining: number | null;
  /** Epoch ms of the discard date, or null if unopened. */
  discardAt: number | null;
  isExpired: boolean;
  /** Within the final 3 days — surface a refill nudge. */
  isCritical: boolean;
}

export function computeExpiry(
  med: Pick<Medication, 'openedAt' | 'discardAfterDays'>,
  now: number = Date.now(),
): ExpiryState {
  if (med.openedAt == null) {
    return { daysRemaining: null, discardAt: null, isExpired: false, isCritical: false };
  }

  const discardAt = med.openedAt + med.discardAfterDays * DAY_MS;
  const daysRemaining = Math.ceil((discardAt - now) / DAY_MS);

  return {
    discardAt,
    daysRemaining,
    isExpired: now >= discardAt,
    isCritical: daysRemaining <= 3 && daysRemaining > 0,
  };
}

/* -------------------------------------------------------------------------- */
/*  3. Interval math — spread "X times per day" over waking hours              */
/* -------------------------------------------------------------------------- */

/**
 * Evenly distribute `timesPerDay` doses across the waking window,
 * anchoring the first dose at wake and the last at (or before) sleep.
 *
 *   1x  -> [wake]
 *   2x  -> [wake, sleep]
 *   3x  -> [wake, mid, sleep]
 *   nx  -> wake + k * (window / (n - 1))
 *
 * Returns minutes-from-midnight, rounded to the nearest 5 minutes so
 * reminder times read cleanly (e.g. 07:00, 14:30, 22:00).
 */
export function spreadDoseTimes(
  timesPerDay: number,
  window: WakingWindow,
): number[] {
  const n = Math.max(1, Math.floor(timesPerDay));
  const { startMinutes, endMinutes } = window;
  const span = Math.max(0, endMinutes - startMinutes);

  if (n === 1) return [roundTo5(startMinutes)];

  const step = span / (n - 1);
  const times: number[] = [];
  for (let i = 0; i < n; i++) {
    times.push(roundTo5(startMinutes + step * i));
  }
  return dedupeAscending(times);
}

/** Optimal whole-hours-between-doses figure surfaced in the UI. */
export function optimalIntervalHours(
  timesPerDay: number,
  window: WakingWindow,
): number {
  const n = Math.max(1, Math.floor(timesPerDay));
  if (n === 1) return 24;
  const span = window.endMinutes - window.startMinutes;
  return Math.round((span / (n - 1) / 60) * 10) / 10;
}

function roundTo5(minutes: number): number {
  return Math.round(minutes / 5) * 5;
}

function dedupeAscending(minutes: number[]): number[] {
  return [...new Set(minutes)].sort((a, b) => a - b);
}

/** Convert minutes-from-midnight to a "07:05" style string. */
export function minutesToClock(minutes: number): string {
  const m = ((minutes % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${h.toString().padStart(2, '0')}:${mm.toString().padStart(2, '0')}`;
}

/* -------------------------------------------------------------------------- */
/*  Quiet hours                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Whether a minutes-from-midnight time falls inside a quiet-hours window.
 * Correctly handles windows that wrap past midnight (e.g. 22:00 → 07:00).
 * The window is half-open: [start, end) so an exact `end` time is audible.
 */
export function isWithinQuietHours(
  minutes: number,
  startMinutes: number,
  endMinutes: number,
): boolean {
  const t = ((minutes % 1440) + 1440) % 1440;
  const start = ((startMinutes % 1440) + 1440) % 1440;
  const end = ((endMinutes % 1440) + 1440) % 1440;

  if (start === end) return false; // empty (or full-day) window → treat as off
  if (start < end) return t >= start && t < end; // same-day window
  return t >= start || t < end; // wraps past midnight
}

/* -------------------------------------------------------------------------- */
/*  Next-dose helper — used by the home screen & reminders                     */
/* -------------------------------------------------------------------------- */

export interface NextDose {
  scheduleId: string;
  medicationId: string;
  /** Epoch ms of the next occurrence. */
  at: number;
  minutesFromMidnight: number;
}

/**
 * Find the soonest upcoming dose across all schedules from `now`.
 * Rolls to the next day if every slot today has passed.
 */
export function nextDoseAcross(
  schedules: DosingSchedule[],
  now: number = Date.now(),
): NextDose | null {
  const nowDate = new Date(now);
  const midnight = new Date(
    nowDate.getFullYear(),
    nowDate.getMonth(),
    nowDate.getDate(),
  ).getTime();
  const nowMinutes = (now - midnight) / 60000;

  let best: NextDose | null = null;

  for (const s of schedules) {
    if (!s.remindersEnabled) continue;
    for (const slot of s.doseTimesMinutes) {
      const dayOffset = slot >= nowMinutes ? 0 : 1;
      const at = midnight + dayOffset * DAY_MS + slot * 60000;
      if (!best || at < best.at) {
        best = {
          scheduleId: s.id,
          medicationId: s.medicationId,
          at,
          minutesFromMidnight: slot,
        };
      }
    }
  }

  return best;
}
