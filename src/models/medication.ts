/**
 * Eye got you — Core data models
 * ------------------------------------------------------------------
 * Domain schema for medications, dosing schedules and dose logs.
 * All timestamps are epoch milliseconds (number) for cheap comparison
 * and reliable JSON serialization across the persistence layer.
 */

/** Which eye(s) a drop is administered to. */
export enum Laterality {
  /** Oculus Sinister — Left eye. */
  OS = 'OS',
  /** Oculus Dexter — Right eye. */
  OD = 'OD',
  /** Oculus Uterque — Both eyes. */
  OU = 'OU',
}

/** Human-readable labels, kept out of the enum so UI copy stays central. */
export const LATERALITY_LABEL: Record<Laterality, string> = {
  [Laterality.OS]: 'Left eye',
  [Laterality.OD]: 'Right eye',
  [Laterality.OU]: 'Both eyes',
};

export const LATERALITY_SHORT: Record<Laterality, string> = {
  [Laterality.OS]: 'L',
  [Laterality.OD]: 'R',
  [Laterality.OU]: 'L+R',
};

/** Drop category — drives the washout severity messaging. */
export enum DropForm {
  Solution = 'solution',
  Suspension = 'suspension',
  Gel = 'gel',
  Ointment = 'ointment',
}

/**
 * How the bottle was identified. Barcode is the most trustworthy;
 * OCR requires the confirmation screen; manual is a typed fallback.
 */
export enum ScanSource {
  Barcode = 'barcode',
  OCR = 'ocr',
  Manual = 'manual',
}

/**
 * A physical bottle of medication owned by the patient.
 * The 30-day discard clock is derived from `openedAt`.
 */
export interface Medication {
  id: string;
  /** Brand or generic name shown to the patient, e.g. "Latanoprost". */
  name: string;
  /** Optional strength string, e.g. "0.005%". */
  strength?: string;
  form: DropForm;
  /** Tint used for the pill/row accent — derived from an iris palette. */
  colorHex: string;

  /** Which eye this medication is prescribed for. */
  laterality: Laterality;

  /**
   * Per-bottle quiet-hours behaviour. Undefined = follow the global
   * setting (equivalent to { mode: 'default' }).
   */
  quietOverride?: MedQuietOverride;

  /** Barcode/NDC payload captured at scan time, if any. */
  barcode?: string;
  scanSource: ScanSource;

  /**
   * Epoch ms the bottle was first opened / scanned. Starts the
   * 30-day discard countdown. Null until the patient confirms the
   * bottle is now in use.
   */
  openedAt: number | null;

  /** Days of viable use once opened. Default 28–30 for most drops. */
  discardAfterDays: number;

  /** Soft archive flag — kept for history, hidden from active lists. */
  archived: boolean;

  createdAt: number;
  updatedAt: number;
}

/**
 * How one bottle relates to quiet hours.
 *   default — obey the global quiet-hours setting
 *   always  — critical drop: always ring, even during quiet hours
 *   custom  — this bottle has its own quiet window (applies regardless
 *             of the global toggle)
 */
export type MedQuietMode = 'default' | 'always' | 'custom';

export interface MedQuietOverride {
  mode: MedQuietMode;
  /** Custom window start, minutes-from-midnight (mode === 'custom'). */
  startMinutes?: number;
  /** Custom window end, minutes-from-midnight (mode === 'custom'). */
  endMinutes?: number;
}

/** Cadence type for a dosing schedule. */
export enum ScheduleKind {
  /** "X times per day", auto-spread across waking hours. */
  TimesPerDay = 'timesPerDay',
  /** Fixed clock times the patient set explicitly. */
  FixedTimes = 'fixedTimes',
  /** Take only when needed — no reminders fired. */
  AsNeeded = 'asNeeded',
}

/**
 * Waking window used to spread doses. Stored as minutes-from-midnight
 * so it survives timezone/serialization without Date drift.
 */
export interface WakingWindow {
  /** e.g. 7 * 60 = 420 for 07:00. */
  startMinutes: number;
  /** e.g. 22 * 60 = 1320 for 22:00. */
  endMinutes: number;
}

export const DEFAULT_WAKING_WINDOW: WakingWindow = {
  startMinutes: 7 * 60,
  endMinutes: 22 * 60,
};

/**
 * The schedule attached to a medication. One medication → one active
 * schedule (older schedules are archived on the medication history).
 */
export interface DosingSchedule {
  id: string;
  medicationId: string;
  kind: ScheduleKind;

  /** Used when kind === TimesPerDay. */
  timesPerDay?: number;

  /**
   * Concrete reminder times as minutes-from-midnight. For TimesPerDay
   * these are computed by the clinical engine; for FixedTimes they are
   * authored by the patient.
   */
  doseTimesMinutes: number[];

  window: WakingWindow;

  /** Whether local notifications fire for this schedule. */
  remindersEnabled: boolean;

  createdAt: number;
  updatedAt: number;
}

/** Outcome of a logged dose. */
export enum DoseStatus {
  Taken = 'taken',
  Skipped = 'skipped',
  /** Logged but flagged because it landed inside another drop's washout. */
  WashoutConflict = 'washoutConflict',
}

/**
 * An immutable record that a drop was administered (or skipped).
 * The washout engine reads the most recent Taken/WashoutConflict log.
 */
export interface DoseLog {
  id: string;
  medicationId: string;
  scheduleId?: string;
  laterality: Laterality;
  status: DoseStatus;
  /** When the patient actually logged it. */
  takenAt: number;
  /** The scheduled slot this satisfies, if matched. Minutes-from-midnight. */
  scheduledForMinutes?: number;
}

/** Length of the mandatory gap between two different drops. */
export const WASHOUT_MS = 5 * 60 * 1000;

/** Default discard window once a bottle is opened. */
export const DEFAULT_DISCARD_DAYS = 30;

/** How long a "snooze" pushes a reminder out, in minutes. */
export const SNOOZE_MINUTES = 10;

/**
 * App-wide reminder preferences. Times are minutes-from-midnight, so a
 * quiet window can wrap past midnight (start > end).
 */
export interface ReminderSettings {
  /** When on, dose slots inside the quiet window are not announced. */
  quietHoursEnabled: boolean;
  /** e.g. 22 * 60 = 1320 for 22:00. */
  quietStartMinutes: number;
  /** e.g. 7 * 60 = 420 for 07:00. */
  quietEndMinutes: number;
}

export const DEFAULT_REMINDER_SETTINGS: ReminderSettings = {
  quietHoursEnabled: false,
  quietStartMinutes: 22 * 60,
  quietEndMinutes: 7 * 60,
};
