/**
 * Eye got you — Navigation route contract
 * ------------------------------------------------------------------
 * Central param list so screens + `useNavigation` are fully typed.
 */

import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { LegalDocKey } from '../content/legal';

export type RootStackParamList = {
  Home: undefined;
  Scan: undefined;
  /** Detail for a single medication, by id. */
  MedicationDetail: { medicationId: string };
  /** Reminders & quiet-hours settings. */
  ReminderSettings: undefined;
  /** Privacy Policy / Terms viewer. */
  Legal: { doc: LegalDocKey };
};

export type HomeProps = NativeStackScreenProps<RootStackParamList, 'Home'>;
export type ScanProps = NativeStackScreenProps<RootStackParamList, 'Scan'>;
export type MedicationDetailProps = NativeStackScreenProps<
  RootStackParamList,
  'MedicationDetail'
>;
export type ReminderSettingsProps = NativeStackScreenProps<
  RootStackParamList,
  'ReminderSettings'
>;
export type LegalProps = NativeStackScreenProps<RootStackParamList, 'Legal'>;

/** Enables `useNavigation<AppNavigation>()` without re-specifying params. */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    interface RootParamList extends RootStackParamList {}
  }
}
