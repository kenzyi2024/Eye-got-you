/**
 * Eye got you — Encrypted local storage
 * ------------------------------------------------------------------
 * Health data never leaves the device, and it is encrypted at rest on
 * top of the OS sandbox. We keep a random 256-bit key in the platform
 * keystore (expo-secure-store → iOS Keychain / Android Keystore) and
 * AES-encrypt the persisted store blob with it before it touches
 * AsyncStorage. Even a device backup or a filesystem dump yields only
 * ciphertext.
 *
 * Defense in depth, not a silver bullet: a rooted/jailbroken device
 * with the app unlocked can still be attacked. That is why we also
 * minimize what we store (no name, DOB, SSN, insurance, or contact
 * info — see PRIVACY_POLICY.md).
 *
 * Install deps:
 *   npx expo install expo-secure-store expo-crypto
 *   npm i crypto-js && npm i -D @types/crypto-js
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import AES from 'crypto-js/aes';
import Utf8 from 'crypto-js/enc-utf8';

/** Keystore entry that holds the data-encryption key (hex). */
const KEY_ALIAS = 'egy.dataKey.v1';
/** Prefix so encrypted values are self-identifying / versioned. */
const CIPHER_PREFIX = 'egyaes1:';

let cachedKey: string | null = null;

/** Fetch the device key, generating + storing one on first run. */
async function getKey(): Promise<string> {
  if (cachedKey) return cachedKey;

  const existing = await SecureStore.getItemAsync(KEY_ALIAS);
  if (existing) {
    cachedKey = existing;
    return existing;
  }

  // 32 random bytes → 64-char hex, kept only in the secure enclave/keystore.
  const bytes = await Crypto.getRandomBytesAsync(32);
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  await SecureStore.setItemAsync(KEY_ALIAS, hex, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
  cachedKey = hex;
  return hex;
}

/**
 * Storage adapter shaped for Zustand's persist middleware. Values are
 * AES-encrypted before storage and decrypted on read. A read that can't
 * be decrypted (missing/rotated key, corruption) returns null so the app
 * starts clean rather than crashing.
 */
export const secureStorage = {
  async getItem(name: string): Promise<string | null> {
    try {
      const raw = await AsyncStorage.getItem(name);
      if (raw == null) return null;
      if (!raw.startsWith(CIPHER_PREFIX)) {
        // Legacy plaintext (e.g. an older build) — accept once, it will be
        // re-written encrypted on the next persist.
        return raw;
      }
      const key = await getKey();
      const plaintext = AES.decrypt(raw.slice(CIPHER_PREFIX.length), key).toString(Utf8);
      return plaintext || null;
    } catch (err) {
      if (__DEV__) console.warn('[secureStorage] getItem failed', err);
      return null;
    }
  },

  async setItem(name: string, value: string): Promise<void> {
    try {
      const key = await getKey();
      const cipher = CIPHER_PREFIX + AES.encrypt(value, key).toString();
      await AsyncStorage.setItem(name, cipher);
    } catch (err) {
      if (__DEV__) console.warn('[secureStorage] setItem failed', err);
    }
  },

  async removeItem(name: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(name);
    } catch (err) {
      if (__DEV__) console.warn('[secureStorage] removeItem failed', err);
    }
  },
};

/**
 * Wipe all app data AND the encryption key. Use for a "delete my data"
 * control — irreversibly renders any remaining ciphertext unreadable.
 */
export async function wipeAllData(storeName: string): Promise<void> {
  await AsyncStorage.removeItem(storeName);
  await SecureStore.deleteItemAsync(KEY_ALIAS);
  cachedKey = null;
}
