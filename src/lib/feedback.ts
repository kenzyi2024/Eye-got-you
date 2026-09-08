/**
 * Eye got you — Multi-sensory feedback
 * ------------------------------------------------------------------
 * Centralizes haptics + audio so every success/warning feels identical
 * across the app. Elderly and low-vision patients rely on the buzz +
 * chime as the primary confirmation channel, not just the screen.
 *
 * Audio uses expo-audio (expo-av was removed in modern SDKs).
 * Install deps:
 *   npx expo install expo-haptics expo-audio
 *
 * Drop a short success tone at:  assets/audio/chime.mp3
 */

import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import {
  createAudioPlayer,
  setAudioModeAsync,
  type AudioPlayer,
} from 'expo-audio';

let chime: AudioPlayer | null = null;
let loading: Promise<void> | null = null;

/** Preload the chime once at app start (call from a top-level effect). */
export async function preloadFeedback(): Promise<void> {
  if (chime || loading) return loading ?? Promise.resolve();
  loading = (async () => {
    try {
      await setAudioModeAsync({
        // patients often keep the phone on silent — chime should still play
        playsInSilentMode: true,
        shouldPlayInBackground: false,
      });
      // createAudioPlayer is synchronous; the source is bundled at build time.
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      chime = createAudioPlayer(require('../../assets/audio/chime.mp3'));
      chime.volume = 1.0;
    } catch (err) {
      // Audio is a bonus channel — never let a missing asset crash a scan.
      if (__DEV__) console.warn('[feedback] chime preload failed', err);
    }
  })();
  return loading;
}

async function playChime(): Promise<void> {
  try {
    if (!chime) await preloadFeedback();
    if (!chime) return;
    chime.seekTo(0);
    chime.play();
  } catch (err) {
    if (__DEV__) console.warn('[feedback] chime play failed', err);
  }
}

/** Release native audio resources (call on app teardown if needed). */
export function disposeFeedback(): void {
  try {
    chime?.remove();
  } catch {
    /* ignore */
  }
  chime = null;
  loading = null;
}

/** Distinct "recognized!" moment: strong buzz + pleasant chime. */
export async function successRecognized(): Promise<void> {
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch {
    /* haptics unsupported — ignore */
  }
  await playChime();
}

/** A softer tick used when a guide-box locks onto a candidate bottle. */
export async function lockTick(): Promise<void> {
  try {
    if (Platform.OS === 'ios') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid);
    } else {
      await Haptics.selectionAsync();
    }
  } catch {
    /* ignore */
  }
}

/** Heavy warning buzz for the washout takeover. */
export async function warnBuzz(): Promise<void> {
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  } catch {
    /* ignore */
  }
}

/** Positive confirmation tap (YES pressed). */
export async function confirmTap(): Promise<void> {
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  } catch {
    /* ignore */
  }
}
