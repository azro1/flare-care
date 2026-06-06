import AsyncStorage from "@react-native-async-storage/async-storage";
import type { NavigationContainerRef } from "@react-navigation/native";

export type ReminderNotificationTarget =
  | { kind: "medication"; medicationId: string }
  | { kind: "appointment"; appointmentId: string };

const CONSUMED_RESPONSES_KEY = "flarecare.consumedNotificationResponses";
const MAX_STORED_FINGERPRINTS = 100;

const recentlyHandledInMemory = new Set<string>();

export function reminderNotificationData(
  target: ReminderNotificationTarget,
): Record<string, string> {
  if (target.kind === "medication") {
    return { kind: "medication", medicationId: target.medicationId };
  }
  return { kind: "appointment", appointmentId: target.appointmentId };
}

function normalizeNotificationData(raw: unknown): Record<string, unknown> | null {
  if (!raw) return null;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  }
  if (typeof raw === "object") return raw as Record<string, unknown>;
  return null;
}

function readStringField(data: Record<string, unknown>, key: string): string | null {
  const value = data[key];
  if (typeof value === "string" && value) return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

export function parseReminderNotificationTarget(response: {
  notification?: { request?: { content?: { data?: unknown } } };
} | null): ReminderNotificationTarget | null {
  const data = normalizeNotificationData(response?.notification?.request?.content?.data);
  if (!data) return null;

  const kind = readStringField(data, "kind") ?? "";
  const medicationId = readStringField(data, "medicationId");
  const appointmentId = readStringField(data, "appointmentId");

  if (kind === "medication" && medicationId) {
    return { kind: "medication", medicationId };
  }
  if (kind === "appointment" && appointmentId) {
    return { kind: "appointment", appointmentId };
  }
  return null;
}

export function reminderNotificationDedupKey(target: ReminderNotificationTarget): string {
  return target.kind === "medication"
    ? `medication:${target.medicationId}`
    : `appointment:${target.appointmentId}`;
}

function notificationDateMs(date: unknown): number | null {
  if (typeof date !== "number" || !Number.isFinite(date)) return null;
  return date < 1_000_000_000_000 ? date * 1000 : date;
}

/** Stable ID for a notification tap — used to avoid replay on Metro reload. */
export function reminderNotificationResponseFingerprint(response: unknown): string | null {
  const target = parseReminderNotificationTarget(response as any);
  if (!target) return null;

  const targetKey = reminderNotificationDedupKey(target);
  const notification = (response as any)?.notification;
  const identifier =
    typeof notification?.request?.identifier === "string" ? notification.request.identifier : "";
  const action =
    typeof (response as any)?.actionIdentifier === "string" ? (response as any).actionIdentifier : "default";
  const date = notificationDateMs(notification?.date);

  if (identifier) return `${targetKey}|${identifier}|${action}`;
  if (date) return `${targetKey}|${date}|${action}`;
  return targetKey;
}

async function readConsumedFingerprints(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(CONSUMED_RESPONSES_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export async function wasReminderNotificationResponseHandled(response: unknown): Promise<boolean> {
  const fingerprint = reminderNotificationResponseFingerprint(response);
  if (!fingerprint) return false;
  if (recentlyHandledInMemory.has(fingerprint)) return true;
  return wasNotificationResponseConsumed(fingerprint);
}

async function wasNotificationResponseConsumed(fingerprint: string): Promise<boolean> {
  const consumed = await readConsumedFingerprints();
  return consumed.includes(fingerprint);
}

export async function markReminderNotificationResponseHandled(response: unknown): Promise<void> {
  const fingerprint = reminderNotificationResponseFingerprint(response);
  if (!fingerprint) return;

  recentlyHandledInMemory.add(fingerprint);
  const consumed = await readConsumedFingerprints();
  if (consumed.includes(fingerprint)) return;
  consumed.push(fingerprint);
  try {
    await AsyncStorage.setItem(
      CONSUMED_RESPONSES_KEY,
      JSON.stringify(consumed.slice(-MAX_STORED_FINGERPRINTS)),
    );
  } catch {
    // in-memory mark still applies this session
  }
}

/** Returns navigation target only for not-yet-handled responses; marks as handled. */
export async function consumeReminderNotificationResponse(
  response: unknown,
): Promise<ReminderNotificationTarget | null> {
  const target = parseReminderNotificationTarget(response as any);
  if (!target) return null;

  const fingerprint = reminderNotificationResponseFingerprint(response);
  if (!fingerprint) return target;

  if (recentlyHandledInMemory.has(fingerprint)) return null;
  if (await wasNotificationResponseConsumed(fingerprint)) return null;

  await markReminderNotificationResponseHandled(response);
  return target;
}

export function navigateFromReminderNotification(
  navigationRef: NavigationContainerRef<Record<string, object | undefined>>,
  target: ReminderNotificationTarget,
) {
  if (!navigationRef.isReady()) return;

  if (target.kind === "medication") {
    navigationRef.navigate("MedicationDetail" as never, { id: target.medicationId } as never);
    return;
  }

  navigationRef.navigate("Appointments" as never);
}
