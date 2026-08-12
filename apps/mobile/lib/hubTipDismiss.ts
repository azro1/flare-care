import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "flare.hubTip.dismissed.v1";

/** Sync memory so remounts don’t flash a dismissed tip while AsyncStorage loads. */
const dismissedMemory: Record<string, true> = {};
let hydrated = false;

async function readMap(): Promise<Record<string, true>> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as Record<string, true>;
  } catch {
    return {};
  }
}

/** Known dismiss state for first paint — `undefined` until storage has been read once for this tip. */
export function getCachedHubTipDismissed(tipId: string): boolean | undefined {
  if (tipId in dismissedMemory) return true;
  if (hydrated) return false;
  return undefined;
}

export async function isHubTipDismissed(tipId: string): Promise<boolean> {
  const map = await readMap();
  hydrated = true;
  for (const id of Object.keys(map)) dismissedMemory[id] = true;
  return map[tipId] === true;
}

export async function dismissHubTip(tipId: string): Promise<void> {
  dismissedMemory[tipId] = true;
  try {
    const map = await readMap();
    map[tipId] = true;
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}

/** Clear a tip dismiss flag (e.g. after layout/copy changes during development). */
export async function clearHubTipDismissed(tipId: string): Promise<void> {
  delete dismissedMemory[tipId];
  try {
    const map = await readMap();
    if (!(tipId in map)) return;
    delete map[tipId];
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}
