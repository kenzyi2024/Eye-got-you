/**
 * Eye got you — Navigation route contract
 * ------------------------------------------------------------------
 * Central param list so screens + `useNavigation` are fully typed.
 */

import type { NativeStackScreenProps } from '@react-navigation/native-stack';

export type RootStackParamList = {
  Home: undefined;
  Scan: undefined;
  /** Detail for a single medication, by id. */
  MedicationDetail: { medicationId: string };
};

export type HomeProps = NativeStackScreenProps<RootStackParamList, 'Home'>;
export type ScanProps = NativeStackScreenProps<RootStackParamList, 'Scan'>;
export type MedicationDetailProps = NativeStackScreenProps<
  RootStackParamList,
  'MedicationDetail'
>;

/** Enables `useNavigation<AppNavigation>()` without re-specifying params. */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    interface RootParamList extends RootStackParamList {}
  }
}
