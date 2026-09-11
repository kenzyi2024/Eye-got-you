/**
 * Eye got you — Global state store
 * ------------------------------------------------------------------
 * Zustand store persisted to AsyncStorage. Holds medications,
 * schedules and dose logs, and exposes the actions the UI uses to
 * mutate them. Clinical rules are delegated to ../logic/clinicalEngine
 * so this file stays about state, not policy.
 *
 * Install deps:
 *   npx expo install zustand @react-native-async-storage/async-storage
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import {
  DEFAULT_DISCARD_DAYS,
  DEFAULT_REMINDER_SETTINGS,
  DEFAULT_WAKING_WINDOW,
  DoseLog,
  DoseStatus,
  DosingSchedule,
  DropForm,
  Laterality,
  Medication,
  ReminderSettings,
  ScanSource,
  ScheduleKind,
} from '../models/medication';
import {
  computeWashout,
  evaluateDoseAttempt,
  spreadDoseTimes,
  WashoutDecision,
  WashoutState,
} from '../logic/clinicalEngine';

/** Small id helper — avoids pulling a uuid dependency. */
const uid = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;

/** Iris-inspired accent palette assigned round-robin to new bottles. */
const IRIS_ACCENTS = ['#3BE8B0', '#2EC5CE', '#5B8DEF', '#8A6FF0', '#E86AA6'];

/** Payload the scanner hands to the store when a bottle is confirmed. */
export interface ScannedBottle {
  name: string;
  strength?: string;
  form?: DropForm;
  barcode?: string;
  scanSource: ScanSource;
  laterality?: Laterality;
  timesPerDay?: number;
}

interface MedState {
  medications: Medication[];
  schedules: DosingSchedule[];
  logs: DoseLog[];
  settings: ReminderSettings;

  /* ---- selectors (derived, computed on demand) ---- */
  washout: () => WashoutState;
  canLog: (medicationId: string) => WashoutDecision;
  scheduleFor: (medicationId: string) => DosingSchedule | undefined;

  /* ---- settings ---- */
  setQuietHoursEnabled: (enabled: boolean) => void;
  setQuietHours: (startMinutes: number, endMinutes: number) => void;

  /* ---- mutations ---- */
  addScannedMedication: (bottle: ScannedBottle) => Medication;
  setLaterality: (medicationId: string, laterality: Laterality) => void;
  setTimesPerDay: (medicationId: string, timesPerDay: number) => void;
  toggleReminders: (scheduleId: string, enabled: boolean) => void;
  markOpened: (medicationId: string, when?: number) => void;

  /**
   * Log a dose. Returns the washout decision so the caller can throw
   * up the "wash out" warning when `allowed` is false. When `force`
   * is true (patient dismissed the warning) the log is written anyway
   * but flagged as a WashoutConflict.
   */
  logDose: (
    medicationId: string,
    opts?: { force?: boolean; laterality?: Laterality },
  ) => WashoutDecision;

  skipDose: (medicationId: string) => void;
  archiveMedication: (medicationId: string) => void;
}

export const useMedStore = create<MedState>()(
  persist(
    (set, get) => ({
      medications: [],
      schedules: [],
      logs: [],
      settings: DEFAULT_REMINDER_SETTINGS,

      /* ------------------------------ selectors ------------------------------ */

      washout: () => computeWashout(get().logs),

      canLog: (medicationId) => evaluateDoseAttempt(medicationId, get().logs),

      scheduleFor: (medicationId) =>
        get().schedules.find((s) => s.medicationId === medicationId),

      /* ------------------------------ settings ------------------------------- */

      setQuietHoursEnabled: (enabled) =>
        set((s) => ({ settings: { ...s.settings, quietHoursEnabled: enabled } })),

      setQuietHours: (startMinutes, endMinutes) =>
        set((s) => ({
          settings: { ...s.settings, quietStartMinutes: startMinutes, quietEndMinutes: endMinutes },
        })),

      /* ------------------------------ mutations ------------------------------ */

      addScannedMedication: (bottle) => {
        const now = Date.now();
        const accent =
          IRIS_ACCENTS[get().medications.length % IRIS_ACCENTS.length];

        const med: Medication = {
          id: uid(),
          name: bottle.name.trim(),
          strength: bottle.strength,
          form: bottle.form ?? DropForm.Solution,
          colorHex: accent,
          laterality: bottle.laterality ?? Laterality.OU,
          barcode: bottle.barcode,
          scanSource: bottle.scanSource,
          openedAt: now, // scanning a new bottle starts the 30-day clock
          discardAfterDays: DEFAULT_DISCARD_DAYS,
          archived: false,
          createdAt: now,
          updatedAt: now,
        };

        const timesPerDay = bottle.timesPerDay ?? 1;
        const schedule: DosingSchedule = {
          id: uid(),
          medicationId: med.id,
          kind: ScheduleKind.TimesPerDay,
          timesPerDay,
          doseTimesMinutes: spreadDoseTimes(timesPerDay, DEFAULT_WAKING_WINDOW),
          window: DEFAULT_WAKING_WINDOW,
          remindersEnabled: true,
          createdAt: now,
          updatedAt: now,
        };

        set((s) => ({
          medications: [...s.medications, med],
          schedules: [...s.schedules, schedule],
        }));

        return med;
      },

      setLaterality: (medicationId, laterality) =>
        set((s) => ({
          medications: s.medications.map((m) =>
            m.id === medicationId
              ? { ...m, laterality, updatedAt: Date.now() }
              : m,
          ),
        })),

      setTimesPerDay: (medicationId, timesPerDay) =>
        set((s) => ({
          schedules: s.schedules.map((sch) =>
            sch.medicationId === medicationId
              ? {
                  ...sch,
                  timesPerDay,
                  doseTimesMinutes: spreadDoseTimes(timesPerDay, sch.window),
                  updatedAt: Date.now(),
                }
              : sch,
          ),
        })),

      toggleReminders: (scheduleId, enabled) =>
        set((s) => ({
          schedules: s.schedules.map((sch) =>
            sch.id === scheduleId
              ? { ...sch, remindersEnabled: enabled, updatedAt: Date.now() }
              : sch,
          ),
        })),

      markOpened: (medicationId, when = Date.now()) =>
        set((s) => ({
          medications: s.medications.map((m) =>
            m.id === medicationId
              ? { ...m, openedAt: when, updatedAt: Date.now() }
              : m,
          ),
        })),

      logDose: (medicationId, opts = {}) => {
        const decision = evaluateDoseAttempt(medicationId, get().logs);

        if (!decision.allowed && !opts.force) {
          // Blocked by washout and not forced — do not write a log.
          return decision;
        }

        const med = get().medications.find((m) => m.id === medicationId);
        const schedule = get().scheduleFor(medicationId);

        const log: DoseLog = {
          id: uid(),
          medicationId,
          scheduleId: schedule?.id,
          laterality: opts.laterality ?? med?.laterality ?? Laterality.OU,
          status:
            decision.wouldWashOut && opts.force
              ? DoseStatus.WashoutConflict
              : DoseStatus.Taken,
          takenAt: Date.now(),
        };

        set((s) => ({ logs: [...s.logs, log] }));
        return decision;
      },

      skipDose: (medicationId) => {
        const med = get().medications.find((m) => m.id === medicationId);
        const schedule = get().scheduleFor(medicationId);
        const log: DoseLog = {
          id: uid(),
          medicationId,
          scheduleId: schedule?.id,
          laterality: med?.laterality ?? Laterality.OU,
          status: DoseStatus.Skipped,
          takenAt: Date.now(),
        };
        set((s) => ({ logs: [...s.logs, log] }));
      },

      archiveMedication: (medicationId) =>
        set((s) => ({
          medications: s.medications.map((m) =>
            m.id === medicationId
              ? { ...m, archived: true, updatedAt: Date.now() }
              : m,
          ),
        })),
    }),
    {
      name: 'eye-got-you/med-store/v1',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist raw data; selectors are functions and skipped.
      partialize: (s) => ({
        medications: s.medications,
        schedules: s.schedules,
        logs: s.logs,
        settings: s.settings,
      }),
    },
  ),
);
