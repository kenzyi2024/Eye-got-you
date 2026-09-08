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

console.log(`\nAll ${passed} checks passed.`);
