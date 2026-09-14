/**
 * Eye got you — Clinical engine verification
 * Run: npx tsx src/logic/clinicalEngine.test.ts   (or via jest/vitest)
 */

import assert from 'node:assert';
import {
  DoseLog,
  DoseStatus,
  Laterality,
  WASHOUT_MS,
} from '../models/medication';
import {
  computeExpiry,
  evaluateDoseAttempt,
  formatCountdown,
  isDoseMuted,
  isWithinQuietHours,
  minutesToClock,
  optimalIntervalHours,
  spreadDoseTimes,
} from './clinicalEngine';

const WINDOW = { startMinutes: 7 * 60, endMinutes: 22 * 60 };
let passed = 0;
const check = (name: string, fn: () => void) => {
  fn();
  passed++;
  console.log('  ✓', name);
};

const log = (medId: string, at: number): DoseLog => ({
  id: `${medId}-${at}`,
  medicationId: medId,
  laterality: Laterality.OU,
  status: DoseStatus.Taken,
  takenAt: at,
});

console.log('Washout rule:');
check('different drop inside window is blocked', () => {
  const now = 1_000_000;
  const logs = [log('A', now - 60_000)]; // 1 min ago
  const d = evaluateDoseAttempt('B', logs, now);
  assert.equal(d.allowed, false);
  assert.equal(d.wouldWashOut, true);
  assert.ok(d.remainingMs > 3 * 60_000);
});

check('same drop inside window is allowed', () => {
  const now = 1_000_000;
  const logs = [log('A', now - 60_000)];
  const d = evaluateDoseAttempt('A', logs, now);
  assert.equal(d.allowed, true);
  assert.equal(d.wouldWashOut, false);
});

check('different drop after window clears is allowed', () => {
  const now = 1_000_000;
  const logs = [log('A', now - WASHOUT_MS - 1)];
  const d = evaluateDoseAttempt('B', logs, now);
  assert.equal(d.allowed, true);
});

console.log('Countdown format:');
check('4:59 formatting', () => {
  assert.equal(formatCountdown(300_000), '5:00');
  assert.equal(formatCountdown(299_000), '4:59');
  assert.equal(formatCountdown(65_000), '1:05');
  assert.equal(formatCountdown(-100), '0:00');
});

console.log('30-day expiry:');
check('unopened bottle has no countdown', () => {
  const e = computeExpiry({ openedAt: null, discardAfterDays: 30 });
  assert.equal(e.daysRemaining, null);
  assert.equal(e.isExpired, false);
});

check('fresh bottle shows ~30 days, not expired', () => {
  const now = Date.now();
  const e = computeExpiry({ openedAt: now, discardAfterDays: 30 }, now);
  assert.equal(e.daysRemaining, 30);
  assert.equal(e.isExpired, false);
});

check('old bottle is expired and critical flags behave', () => {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const expired = computeExpiry({ openedAt: now - 31 * day, discardAfterDays: 30 }, now);
  assert.equal(expired.isExpired, true);
  const crit = computeExpiry({ openedAt: now - 28 * day, discardAfterDays: 30 }, now);
  assert.equal(crit.isCritical, true);
});

console.log('Interval math:');
check('1x/day -> single morning dose', () => {
  assert.deepEqual(spreadDoseTimes(1, WINDOW), [7 * 60]);
});
check('2x/day -> wake + sleep', () => {
  assert.deepEqual(spreadDoseTimes(2, WINDOW), [7 * 60, 22 * 60]);
});
check('3x/day -> even thirds', () => {
  const r = spreadDoseTimes(3, WINDOW);
  assert.deepEqual(r.map(minutesToClock), ['07:00', '14:30', '22:00']);
});
check('4x/day -> even quarters, rounded to 5', () => {
  const r = spreadDoseTimes(4, WINDOW);
  assert.deepEqual(r.map(minutesToClock), ['07:00', '12:00', '17:00', '22:00']);
});
check('optimal interval hours for 3x', () => {
  assert.equal(optimalIntervalHours(3, WINDOW), 7.5);
});

console.log('Quiet hours:');
check('overnight window (22:00–07:00) covers late night + early morning', () => {
  const start = 22 * 60;
  const end = 7 * 60;
  assert.equal(isWithinQuietHours(23 * 60, start, end), true); // 23:00
  assert.equal(isWithinQuietHours(6 * 60, start, end), true); //  06:00
  assert.equal(isWithinQuietHours(0, start, end), true); //         00:00
  assert.equal(isWithinQuietHours(12 * 60, start, end), false); //  12:00
});
check('half-open window: start is quiet, end is audible', () => {
  const start = 22 * 60;
  const end = 7 * 60;
  assert.equal(isWithinQuietHours(22 * 60, start, end), true); // exactly 22:00
  assert.equal(isWithinQuietHours(7 * 60, start, end), false); // exactly 07:00
});
check('same-day window (13:00–14:00)', () => {
  assert.equal(isWithinQuietHours(13 * 60 + 30, 13 * 60, 14 * 60), true);
  assert.equal(isWithinQuietHours(15 * 60, 13 * 60, 14 * 60), false);
});
check('empty window (start === end) is never quiet', () => {
  assert.equal(isWithinQuietHours(3 * 60, 8 * 60, 8 * 60), false);
});

console.log('Per-bottle quiet override:');
const GLOBAL_ON = { quietHoursEnabled: true, quietStartMinutes: 22 * 60, quietEndMinutes: 7 * 60 };
const GLOBAL_OFF = { quietHoursEnabled: false, quietStartMinutes: 22 * 60, quietEndMinutes: 7 * 60 };

check("'default'/none follows global quiet hours", () => {
  assert.equal(isDoseMuted(23 * 60, undefined, GLOBAL_ON), true);
  assert.equal(isDoseMuted(12 * 60, undefined, GLOBAL_ON), false);
  assert.equal(isDoseMuted(23 * 60, undefined, GLOBAL_OFF), false); // global off
  assert.equal(isDoseMuted(23 * 60, { mode: 'default' }, GLOBAL_ON), true);
});
check("'always' never mutes, even inside global quiet hours", () => {
  assert.equal(isDoseMuted(3 * 60, { mode: 'always' }, GLOBAL_ON), false);
});
check("'custom' uses its own window regardless of the global toggle", () => {
  const ov = { mode: 'custom' as const, startMinutes: 13 * 60, endMinutes: 14 * 60 };
  assert.equal(isDoseMuted(13 * 60 + 30, ov, GLOBAL_OFF), true); // muted despite global off
  assert.equal(isDoseMuted(9 * 60, ov, GLOBAL_ON), false); // outside custom, ignores global
});
check("'custom' with missing bounds is never muted", () => {
  assert.equal(isDoseMuted(3 * 60, { mode: 'custom' }, GLOBAL_ON), false);
});

console.log(`\nAll ${passed} checks passed.`);
