import AsyncStorage from "@react-native-async-storage/async-storage";
import { todayYmd } from "./bowelMovementShared";
import type { DashboardActivityRow } from "./dashboardSnapshotCache";

/** Dashboard Recent Activity copy. */
export const RECENT_ACTIVITY_TITLE = {
  medicationAdded: "Added new medication",
  medicationUpdated: "Updated medication",
  medicationDeleted: "Deleted medication",
  medicationLogged: "Logged medications",
  medicationLogDeleted: "Deleted medication log",
  symptomLogged: "Logged symptom",
  symptomDeleted: "Deleted symptom log",
  appointmentAdded: "Added new appointment",
  appointmentUpdated: "Updated appointment",
  appointmentDeleted: "Deleted appointment",
  bowelLogged: "Logged new bowel movement",
  bowelUpdated: "Updated bowel log",
  bowelDeleted: "Deleted bowel log",
  weightLogged: "Logged new weight",
  weightUpdated: "Updated weight",
  weightDeleted: "Deleted weight log",
  medsGoal: 'Completed Today\'s goal "Take Medications"',
  hydrationGoal: 'Completed Today\'s goal "Stay Hydrated"',
  hydrationReset: "Reset hydration progress",
} as const;

export type RecentActivityEventKind =
  | "medication-deleted"
  | "medication-log-deleted"
  | "symptom-deleted"
  | "appointment-deleted"
  | "bowel-deleted"
  | "weight-deleted"
  | "weight-updated";

const KIND_TITLE: Record<RecentActivityEventKind, string> = {
  "medication-deleted": RECENT_ACTIVITY_TITLE.medicationDeleted,
  "medication-log-deleted": RECENT_ACTIVITY_TITLE.medicationLogDeleted,
  "symptom-deleted": RECENT_ACTIVITY_TITLE.symptomDeleted,
  "appointment-deleted": RECENT_ACTIVITY_TITLE.appointmentDeleted,
  "bowel-deleted": RECENT_ACTIVITY_TITLE.bowelDeleted,
  "weight-deleted": RECENT_ACTIVITY_TITLE.weightDeleted,
  "weight-updated": RECENT_ACTIVITY_TITLE.weightUpdated,
};

const KIND_ICON: Record<RecentActivityEventKind, DashboardActivityRow["icon"]> = {
  "medication-deleted": "medication",
  "medication-log-deleted": "medication",
  "symptom-deleted": "symptom",
  "appointment-deleted": "appointment",
  "bowel-deleted": "bowel",
  "weight-deleted": "weight",
  "weight-updated": "weight",
};

function eventKey(kind: RecentActivityEventKind, userId: string, dateIso: string) {
  return `flarecare-recent-activity-${kind}-${userId}-${dateIso}`;
}

/** True when updated_at is meaningfully after create (edit, not first save). */
export function isMeaningfulUpdate(
  createdAt: string | null | undefined,
  updatedAt: string | null | undefined,
): { ts: number } | null {
  if (!updatedAt) return null;
  const updatedTs = new Date(updatedAt).getTime();
  if (Number.isNaN(updatedTs)) return null;
  const createdTs = createdAt ? new Date(createdAt).getTime() : NaN;
  if (Number.isFinite(createdTs) && updatedTs <= createdTs + 2000) return null;
  return { ts: updatedTs };
}

export async function recordRecentActivityEvent(
  userId: string,
  kind: RecentActivityEventKind,
  dateIso: string = todayYmd(),
): Promise<void> {
  try {
    const key = eventKey(kind, userId, dateIso);
    await AsyncStorage.setItem(key, JSON.stringify({ timestamp: new Date().toISOString() }));
    await cleanupOldRecentActivityKeys(userId, kind, dateIso);
  } catch {
    // ignore
  }
}

export type StoredRecentActivityEvent = {
  key: string;
  title: string;
  ts: number;
  icon: DashboardActivityRow["icon"];
};

export async function loadStoredRecentActivityEvents(
  userId: string,
  fourHoursAgoMs: number,
  dateIso: string = todayYmd(),
): Promise<StoredRecentActivityEvent[]> {
  const kinds = Object.keys(KIND_TITLE) as RecentActivityEventKind[];
  const out: StoredRecentActivityEvent[] = [];
  await Promise.all(
    kinds.map(async (kind) => {
      try {
        const raw = await AsyncStorage.getItem(eventKey(kind, userId, dateIso));
        if (!raw) return;
        const parsed = JSON.parse(raw) as { timestamp?: string };
        if (!parsed.timestamp) return;
        const ts = new Date(parsed.timestamp).getTime();
        if (Number.isNaN(ts) || ts < fourHoursAgoMs) return;
        out.push({
          key: `${kind}-${dateIso}`,
          title: KIND_TITLE[kind],
          ts,
          icon: KIND_ICON[kind],
        });
      } catch {
        // ignore
      }
    }),
  );
  return out;
}

async function cleanupOldRecentActivityKeys(
  userId: string,
  kind: RecentActivityEventKind,
  keepDateIso: string,
) {
  try {
    const keepKey = eventKey(kind, userId, keepDateIso);
    const prefix = `flarecare-recent-activity-${kind}-${userId}-`;
    const allKeys = await AsyncStorage.getAllKeys();
    const stale = allKeys.filter((key) => key.startsWith(prefix) && key !== keepKey);
    if (stale.length) await AsyncStorage.multiRemove(stale);
  } catch {
    // ignore
  }
}
