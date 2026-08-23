import * as LocalAuthentication from "expo-local-authentication";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Device-level app lock: gate the already-signed-in app behind Face ID / fingerprint.
 * The enabled flag is stored per-device (one account is signed in at a time). This only guards
 * access to the persisted session — it does not store credentials.
 */
const ENABLED_KEY = "biometricLockEnabled";
const SNAPSHOT_KEY = "biometricLockSnapshot.v1";

export type BioLockSnapshot = {
  available: boolean;
  enabled: boolean;
  label: string;
};

/** Last known lock UI state — seeds Security so the card doesn’t blink empty→filled. */
let cachedBioLock: BioLockSnapshot | null = null;

export function peekBioLockSnapshot(): BioLockSnapshot | null {
  return cachedBioLock;
}

function isBioLockSnapshot(value: unknown): value is BioLockSnapshot {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.available === "boolean" &&
    typeof v.enabled === "boolean" &&
    typeof v.label === "string"
  );
}

/** Pull last snapshot from disk into memory (faster than re-probing hardware). */
export async function hydrateBioLockCacheFromStorage(): Promise<BioLockSnapshot | null> {
  if (cachedBioLock) return cachedBioLock;
  try {
    const raw = await AsyncStorage.getItem(SNAPSHOT_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isBioLockSnapshot(parsed)) return null;
    cachedBioLock = parsed;
    return parsed;
  } catch {
    return null;
  }
}

export async function isBiometricAvailable(): Promise<boolean> {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    if (!hasHardware) return false;
    return await LocalAuthentication.isEnrolledAsync();
  } catch {
    return false;
  }
}

/** Human label for the primary enrolled method (for button/toggle copy). */
export async function biometricTypeLabel(): Promise<string> {
  try {
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) return "Face ID";
    if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) return "fingerprint";
    if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) return "iris";
  } catch {
    // fall through
  }
  return "biometrics";
}

export async function readLockEnabled(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(ENABLED_KEY)) === "1";
  } catch {
    return false;
  }
}

async function persistBioLockSnapshot(snap: BioLockSnapshot): Promise<void> {
  cachedBioLock = snap;
  try {
    await AsyncStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snap));
  } catch {
    // non-fatal
  }
}

/** Load + cache availability / enabled / label for Security (and callers that need all three). */
export async function loadBioLockSnapshot(): Promise<BioLockSnapshot> {
  const [available, enabledRaw, label] = await Promise.all([
    isBiometricAvailable(),
    readLockEnabled(),
    biometricTypeLabel(),
  ]);
  const snap: BioLockSnapshot = {
    available,
    enabled: available && enabledRaw,
    label,
  };
  await persistBioLockSnapshot(snap);
  return snap;
}

export async function setLockEnabled(enabled: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(ENABLED_KEY, enabled ? "1" : "0");
  } catch {
    // non-fatal
  }
  if (cachedBioLock) {
    await persistBioLockSnapshot({
      ...cachedBioLock,
      enabled: cachedBioLock.available && enabled,
    });
  }
}

export async function authenticate(promptMessage: string): Promise<boolean> {
  try {
    const res = await LocalAuthentication.authenticateAsync({
      promptMessage,
      cancelLabel: "Cancel",
      disableDeviceFallback: false,
    });
    if (!res.success && __DEV__) {
      // Helps diagnose “sheet never shows” vs user cancel vs system error.
      console.warn("[biometric] authenticate failed", "error" in res ? res.error : "unknown");
    }
    return res.success;
  } catch (e) {
    if (__DEV__) console.warn("[biometric] authenticate threw", e);
    return false;
  }
}

/**
 * Share sheets / system UI often flip AppState to background — that must not re-lock the app.
 * Wrap those awaits with `withAppLockExternalUi`.
 */
let appLockExternalUiDepth = 0;
let appLockExternalUiTrailingUntil = 0;

export function isAppLockExternalUiActive(): boolean {
  return appLockExternalUiDepth > 0 || Date.now() < appLockExternalUiTrailingUntil;
}

export async function withAppLockExternalUi<T>(fn: () => Promise<T>): Promise<T> {
  appLockExternalUiDepth += 1;
  try {
    return await fn();
  } finally {
    appLockExternalUiDepth = Math.max(0, appLockExternalUiDepth - 1);
    // Trailing inactive/background events often fire after the sheet closes.
    appLockExternalUiTrailingUntil = Date.now() + 1500;
  }
}
