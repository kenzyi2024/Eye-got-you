/**
 * Eye got you — ScannerScreen
 * ------------------------------------------------------------------
 * Accessibility-first bottle scanner for elderly / low-vision users.
 *
 *   • Auto-capture — no shutter button. A barcode in frame captures
 *     instantly; if no barcode, a debounced OCR pass reads the label.
 *   • A large, thick, glowing guide-box tells the patient where to aim.
 *   • On recognition: a distinct success haptic + pleasant chime fire,
 *     then we push the high-contrast ConfirmationScreen.
 *   • A cooldown prevents the same bottle re-triggering in a loop.
 *
 * Install deps:
 *   npx expo install expo-camera expo-haptics expo-av
 *
 * OCR: expo-camera has no built-in text recognition, so we inject a
 * `recognizeText` function (default: MLKit via a native module, or a
 * stub in Expo Go). Swap in react-native-vision-camera + MLKit for
 * production text recognition without changing this screen.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  BarcodeScanningResult,
  CameraView,
  useCameraPermissions,
} from 'expo-camera';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { palette, radius, space, touch, type as t } from '../theme/theme';
import { lockTick, successRecognized, preloadFeedback } from '../lib/feedback';
import { DropForm, ScanSource } from '../models/medication';
import type { ScannedBottle } from '../state/useMedStore';
import {
  recognizeMedicationText,
  RecognizedMedication,
} from '../lib/ocr';

/** Cooldown so one bottle doesn't fire repeatedly (ms). */
const CAPTURE_COOLDOWN = 4000;
/** Debounce between OCR attempts (ms). */
const OCR_INTERVAL = 1200;

export interface ScannerScreenProps {
  /** Called with the recognized bottle so the parent can route to Confirm. */
  onRecognized: (bottle: ScannedBottle) => void;
  onClose?: () => void;
  /** Injectable OCR for testing; defaults to the MLKit-backed recognizer. */
  recognize?: (uri: string) => Promise<RecognizedMedication | null>;
}

type ScanPhase = 'aiming' | 'locked' | 'processing';

export function ScannerScreen({
  onRecognized,
  onClose,
  recognize = recognizeMedicationText,
}: ScannerScreenProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [phase, setPhase] = useState<ScanPhase>('aiming');
  const cameraRef = useRef<CameraView>(null);

  // Guards against overlapping captures / cooldown re-fires.
  const busy = useRef(false);
  const lastCaptureAt = useRef(0);
  const lastOcrAt = useRef(0);

  useEffect(() => {
    preloadFeedback();
  }, []);

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  /** Shared success path for both barcode + OCR captures. */
  const handleCapture = useCallback(
    async (bottle: ScannedBottle) => {
      const now = Date.now();
      if (busy.current || now - lastCaptureAt.current < CAPTURE_COOLDOWN) return;
      busy.current = true;
      lastCaptureAt.current = now;

      setPhase('locked');
      await successRecognized(); // buzz + chime — the key confirmation moment
      setPhase('processing');

      // Small beat so the patient feels the lock before the screen changes.
      setTimeout(() => {
        onRecognized(bottle);
        busy.current = false;
        setPhase('aiming');
      }, 350);
    },
    [onRecognized],
  );

  /** Barcode path — highest confidence, fires immediately. */
  const onBarcodeScanned = useCallback(
    (result: BarcodeScanningResult) => {
      if (busy.current) return;
      lockTick();
      handleCapture({
        name: 'Scanned medication', // resolved from NDC lookup downstream
        barcode: result.data,
        scanSource: ScanSource.Barcode,
        form: DropForm.Solution,
      });
    },
    [handleCapture],
  );

  /**
   * OCR path — runs on an interval while aiming. Grabs a low-res frame,
   * asks the recognizer for a medication name, and captures on a hit.
   */
  const runOcrPass = useCallback(async () => {
    const now = Date.now();
    if (busy.current || now - lastOcrAt.current < OCR_INTERVAL) return;
    if (!cameraRef.current) return;
    lastOcrAt.current = now;

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.4,
        skipProcessing: true,
        shutterSound: false,
      });
      if (!photo?.uri) return;
      const hit = await recognize(photo.uri);
      if (hit?.name) {
        lockTick();
        handleCapture({
          name: hit.name,
          strength: hit.strength,
          form: hit.form ?? DropForm.Solution,
          scanSource: ScanSource.OCR,
        });
      }
    } catch {
      /* transient camera/OCR errors are non-fatal — keep aiming */
    }
  }, [recognize, handleCapture]);

  // Poll OCR while the camera is live and we're not mid-capture.
  useEffect(() => {
    if (!permission?.granted) return;
    const id = setInterval(() => {
      if (phase === 'aiming') runOcrPass();
    }, OCR_INTERVAL);
    return () => clearInterval(id);
  }, [permission?.granted, phase, runOcrPass]);

  /* -------------------------- permission states -------------------------- */

  if (!permission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={palette.cyan} size="large" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.permTitle}>Camera access needed</Text>
        <Text style={styles.permBody}>
          Eye got you uses the camera to read your eye-drop bottle so you
          never have to type it in.
        </Text>
        <Pressable
          style={styles.permBtn}
          onPress={requestPermission}
          accessibilityRole="button"
          accessibilityLabel="Allow camera access"
        >
          <Text style={styles.permBtnText}>Allow camera</Text>
        </Pressable>
      </View>
    );
  }

  /* ------------------------------- camera -------------------------------- */

  return (
    <View style={styles.fill}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing="back"
        // Auto-capture: expo-camera streams barcode hits with no shutter.
        barcodeScannerSettings={{
          barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'datamatrix'],
        }}
        onBarcodeScanned={phase === 'aiming' ? onBarcodeScanned : undefined}
        enableTorch={false}
      />

      {/* dimmed surround with a clear cut-out is faked via 4 scrims */}
      <View style={styles.scrimTop} pointerEvents="none" />
      <View style={styles.scrimBottom} pointerEvents="none" />

      <GuideBox phase={phase} />

      {/* Instruction — large, high contrast, announced to screen readers */}
      <View style={styles.instructionWrap} pointerEvents="none">
        <Text
          style={styles.instruction}
          accessibilityLiveRegion="polite"
          accessibilityRole="text"
        >
          {phase === 'aiming'
            ? 'Hold your bottle inside the box'
            : phase === 'locked'
            ? 'Got it!'
            : 'Reading label…'}
        </Text>
      </View>

      {onClose ? (
        <Pressable
          style={styles.closeBtn}
          onPress={onClose}
          hitSlop={16}
          accessibilityRole="button"
          accessibilityLabel="Close scanner"
        >
          <Text style={styles.closeText}>✕</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/*  GuideBox — thick glowing frame + sweeping scan line                        */
/* -------------------------------------------------------------------------- */

function GuideBox({ phase }: { phase: ScanPhase }) {
  const sweep = useSharedValue(0);
  const glow = useSharedValue(0.5);

  useEffect(() => {
    sweep.value = withRepeat(
      withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
    glow.value = withRepeat(
      withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [sweep, glow]);

  const locked = phase !== 'aiming';

  const boxStyle = useAnimatedStyle(() => ({
    borderColor: locked ? palette.mint : palette.cyan,
    shadowOpacity: 0.5 + glow.value * 0.5,
    shadowRadius: 18 + glow.value * 16,
  }));

  const lineStyle = useAnimatedStyle(() => ({
    top: `${sweep.value * 100}%`,
    opacity: locked ? 0 : 0.9,
  }));

  return (
    <View style={styles.guideWrap} pointerEvents="none">
      <Animated.View style={[styles.guideBox, boxStyle]}>
        {/* corner ticks make the target obvious for low vision */}
        <View style={[styles.corner, styles.tl]} />
        <View style={[styles.corner, styles.tr]} />
        <View style={[styles.corner, styles.bl]} />
        <View style={[styles.corner, styles.br]} />
        <Animated.View style={[styles.scanLine, lineStyle]} />
      </Animated.View>
    </View>
  );
}

const BOX = 300;

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: palette.ink900 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.xl,
    backgroundColor: palette.ink900,
    gap: space.md,
  },

  scrimTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '18%',
    backgroundColor: 'rgba(4,6,11,0.55)',
  },
  scrimBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '22%',
    backgroundColor: 'rgba(4,6,11,0.55)',
  },

  guideWrap: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  guideBox: {
    width: BOX,
    height: BOX,
    borderRadius: radius.lg,
    borderWidth: 6,
    shadowColor: palette.cyan,
    shadowOffset: { width: 0, height: 0 },
    overflow: 'hidden',
  },
  corner: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderColor: palette.white,
  },
  tl: { top: -3, left: -3, borderTopWidth: 8, borderLeftWidth: 8, borderTopLeftRadius: radius.lg },
  tr: { top: -3, right: -3, borderTopWidth: 8, borderRightWidth: 8, borderTopRightRadius: radius.lg },
  bl: { bottom: -3, left: -3, borderBottomWidth: 8, borderLeftWidth: 8, borderBottomLeftRadius: radius.lg },
  br: { bottom: -3, right: -3, borderBottomWidth: 8, borderRightWidth: 8, borderBottomRightRadius: radius.lg },
  scanLine: {
    position: 'absolute',
    left: 8,
    right: 8,
    height: 4,
    borderRadius: 2,
    backgroundColor: palette.mint,
    shadowColor: palette.mint,
    shadowOpacity: 1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },

  instructionWrap: {
    position: 'absolute',
    top: '12%',
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: space.lg,
  },
  instruction: {
    color: palette.textHi,
    fontSize: t.heading,
    fontWeight: t.weightBold,
    textAlign: 'center',
    textShadowColor: palette.confirmBlack,
    textShadowRadius: 8,
    textShadowOffset: { width: 0, height: 1 },
  },

  closeBtn: {
    position: 'absolute',
    top: 56,
    right: 20,
    width: touch.minTarget,
    height: touch.minTarget,
    borderRadius: touch.minTarget / 2,
    backgroundColor: 'rgba(4,6,11,0.7)',
    borderWidth: 2,
    borderColor: palette.textLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: { color: palette.textHi, fontSize: 28, fontWeight: t.weightBold },

  permTitle: { color: palette.textHi, fontSize: t.title, fontWeight: t.weightBlack, textAlign: 'center' },
  permBody: { color: palette.textMid, fontSize: t.body, textAlign: 'center', lineHeight: 28 },
  permBtn: {
    marginTop: space.md,
    minHeight: touch.minTarget,
    paddingHorizontal: space.xl,
    borderRadius: radius.pill,
    backgroundColor: palette.cyan,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permBtnText: { color: palette.confirmBlack, fontSize: t.body, fontWeight: t.weightBlack },
});

export default ScannerScreen;
