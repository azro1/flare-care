import AsyncStorage from "@react-native-async-storage/async-storage";
import { FLARE_FEATURE_LUCIDE } from "./flareLucideIcons";

/** Daily cup target — matches web `HYDRATION_TARGET`. */
export const HYDRATION_TARGET = 6;

export const HYDRATION_ICON = FLARE_FEATURE_LUCIDE.hydration;
export const HYDRATION_EMPTY_ICON = FLARE_FEATURE_LUCIDE.hydration;

export const HYDRATION_GOAL_ACTIVITY_TITLE = 'Completed Today\'s goal "Stay Hydrated"';
export const HYDRATION_RESET_ACTIVITY_TITLE = "Reset hydration progress";

export function hydrationResetStorageKey(userId: string, dateIso: string) {
  return `flarecare-hydration-reset-${userId}-${dateIso}`;
}

/** Persist reset activity for dashboard (same key pattern as web localStorage). */
export async function saveHydrationReset(userId: string, dateIso: string) {
  const key = hydrationResetStorageKey(userId, dateIso);
  await AsyncStorage.setItem(key, JSON.stringify({ timestamp: new Date().toISOString() }));
  await cleanupOldHydrationResetKeys(userId, dateIso);
}

export async function loadHydrationResetTimestamp(userId: string, dateIso: string): Promise<number | null> {
  const raw = await AsyncStorage.getItem(hydrationResetStorageKey(userId, dateIso));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { timestamp?: string };
    if (!parsed.timestamp) return null;
    const ts = new Date(parsed.timestamp).getTime();
    return Number.isNaN(ts) ? null : ts;
  } catch {
    return null;
  }
}

async function cleanupOldHydrationResetKeys(userId: string, keepDateIso: string) {
  const keepKey = hydrationResetStorageKey(userId, keepDateIso);
  const allKeys = await AsyncStorage.getAllKeys();
  const prefix = `flarecare-hydration-reset-${userId}-`;
  const stale = allKeys.filter((key) => key.startsWith(prefix) && key !== keepKey);
  if (stale.length) await AsyncStorage.multiRemove(stale);
}
