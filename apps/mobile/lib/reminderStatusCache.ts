import AsyncStorage from "@react-native-async-storage/async-storage";

export type ReminderStatusSnapshot = {
  permissionGranted: boolean;
  scheduled: number;
};

const STORAGE_KEY = "flarecare.reminderStatusSnapshot";

let memoryCache: ReminderStatusSnapshot | null = null;
let hydratePromise: Promise<ReminderStatusSnapshot | null> | null = null;

export function getCachedReminderStatus(): ReminderStatusSnapshot | null {
  return memoryCache;
}

export async function hydrateReminderStatusCache(): Promise<ReminderStatusSnapshot | null> {
  if (memoryCache) return memoryCache;
  if (!hydratePromise) {
    hydratePromise = (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          memoryCache = JSON.parse(raw) as ReminderStatusSnapshot;
        }
      } catch {
        // ignore corrupt cache
      }
      return memoryCache;
    })();
  }
  return hydratePromise;
}

export async function setCachedReminderStatus(snapshot: ReminderStatusSnapshot): Promise<void> {
  memoryCache = snapshot;
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // non-fatal
  }
}

export async function clearCachedReminderStatus(): Promise<void> {
  memoryCache = null;
  hydratePromise = null;
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    // non-fatal
  }
}
