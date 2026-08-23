import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { appointmentHasReminder, getAppointmentDateTime } from "./appointmentShared";
import { fetchKitListEntries, parseYmdLocal } from "./medicalSuppliesShared";
import { reminderNotificationData } from "./reminderNotificationNavigation";
import { supabase, TABLES } from "./supabase";

let Notifications: any = null;
try {
  Notifications = require("expo-notifications");
} catch {
  Notifications = null;
}

/** Must match `defaultChannel` in app.json expo-notifications plugin config. */
export const REMINDER_NOTIFICATION_CHANNEL_ID = "reminders";

const MEDICATION_NOTIFICATION_IDS_KEY = "flarecare.notificationIds";
const APPOINTMENT_NOTIFICATION_IDS_KEY = "flarecare.appointmentNotificationIds";
const SUPPLY_NOTIFICATION_IDS_KEY = "flarecare.supplyNotificationIds";

/** Local clock time for supply due-day alerts (due is date-only). */
const SUPPLY_DUE_REMINDER_HOUR = 9;
const SUPPLY_DUE_REMINDER_MINUTE = 0;

const ALL_REMINDER_NOTIFICATION_ID_KEYS = [
  MEDICATION_NOTIFICATION_IDS_KEY,
  APPOINTMENT_NOTIFICATION_IDS_KEY,
  SUPPLY_NOTIFICATION_IDS_KEY,
] as const;

let setupPromise: Promise<void> | null = null;

async function hasRemindersPermission(): Promise<boolean> {
  if (!Notifications) return false;
  const { status } = await Notifications.getPermissionsAsync();
  return status === "granted";
}

async function ensureRemindersPermissionGranted(): Promise<boolean> {
  if (!Notifications) return false;
  const { status } = await Notifications.getPermissionsAsync();
  if (status === "granted") return true;
  if (status !== "undetermined") return false;
  const { status: nextStatus } = await Notifications.requestPermissionsAsync();
  return nextStatus === "granted";
}

function parseReminderTimeHm(raw: string | null | undefined): { hour: number; minute: number } {
  const parts = String(raw || "08:00").trim().split(":");
  const hour = Number(parts[0]);
  const minute = Number(parts[1] ?? 0);
  if (!Number.isFinite(hour) || hour < 0 || hour > 23 || !Number.isFinite(minute) || minute < 0 || minute > 59) {
    return { hour: 8, minute: 0 };
  }
  return { hour, minute };
}

/** Android requires a channel before scheduled notifications are delivered (incl. app closed). */
export async function ensureLocalReminderNotificationsReady(): Promise<void> {
  if (!Notifications) return;
  if (!setupPromise) {
    setupPromise = (async () => {
      if (Platform.OS !== "android") return;
      await Notifications.setNotificationChannelAsync(REMINDER_NOTIFICATION_CHANNEL_ID, {
        name: "Reminders",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#5F9EA0",
        sound: "default",
        enableVibrate: true,
        showBadge: true,
      });
    })();
  }
  await setupPromise;
}

function androidReminderTriggerExtras() {
  return Platform.OS === "android" ? { channelId: REMINDER_NOTIFICATION_CHANNEL_ID } : {};
}

function reminderNotificationContent(title: string, body: string, data: Record<string, string>) {
  return {
    title,
    body,
    sound: "default" as const,
    data,
    ...(Platform.OS === "android"
      ? {
          channelId: REMINDER_NOTIFICATION_CHANNEL_ID,
          priority: Notifications.AndroidNotificationPriority.MAX,
        }
      : {}),
  };
}

async function cancelStoredNotificationIds(storageKey: string) {
  if (!Notifications) return;
  const existingRaw = await AsyncStorage.getItem(storageKey);
  const existingIds: string[] = existingRaw ? JSON.parse(existingRaw) : [];
  for (const id of existingIds) {
    try {
      await Notifications.cancelScheduledNotificationAsync(id);
    } catch {
      // ignore stale ids
    }
  }
}

async function cancelAllScheduledLocalReminders() {
  if (!Notifications) return;
  if (typeof Notifications.cancelAllScheduledNotificationsAsync === "function") {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } else {
    for (const key of ALL_REMINDER_NOTIFICATION_ID_KEYS) {
      await cancelStoredNotificationIds(key);
    }
  }
  await AsyncStorage.multiRemove([...ALL_REMINDER_NOTIFICATION_ID_KEYS]);
}

/** Clears all local reminder alarms (e.g. on sign-out). */
export async function clearMedicationNotificationsForUser() {
  if (!Notifications) return;
  if (typeof Notifications.cancelAllScheduledNotificationsAsync === "function") {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } else {
    for (const key of ALL_REMINDER_NOTIFICATION_ID_KEYS) {
      await cancelStoredNotificationIds(key);
    }
  }
  await AsyncStorage.multiRemove([...ALL_REMINDER_NOTIFICATION_ID_KEYS, "flarecare.pushToken"]);
}

export async function getLocalReminderScheduledCount(): Promise<number> {
  if (Notifications?.getAllScheduledNotificationsAsync) {
    try {
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      return scheduled.length;
    } catch {
      // fall back to stored ids
    }
  }
  const rows = await AsyncStorage.multiGet([...ALL_REMINDER_NOTIFICATION_ID_KEYS]);
  return rows.reduce((sum, [, raw]) => {
    const ids: string[] = raw ? JSON.parse(raw) : [];
    return sum + ids.length;
  }, 0);
}

export async function rescheduleMedicationNotificationsForUser(userId: string) {
  if (!Notifications) return { scheduledCount: 0 };

  await ensureLocalReminderNotificationsReady();
  if (!(await hasRemindersPermission())) return { scheduledCount: 0 };
  await cancelStoredNotificationIds(MEDICATION_NOTIFICATION_IDS_KEY);

  const { data: meds, error } = await supabase
    .from(TABLES.MEDICATIONS)
    .select("id,name,time_of_day")
    .eq("user_id", userId)
    .eq("reminders_enabled", true);

  if (error) {
    console.error("MED_REMINDER_QUERY_ERROR", error);
    throw error;
  }

  const ids: string[] = [];
  for (const med of meds ?? []) {
    const { hour, minute } = parseReminderTimeHm(med.time_of_day);
    const id = await Notifications.scheduleNotificationAsync({
      content: reminderNotificationContent(
        "Medication Reminder",
        `Time to take ${med.name}`,
        reminderNotificationData({ kind: "medication", medicationId: String(med.id) }),
      ),
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
        repeats: true,
        ...androidReminderTriggerExtras(),
      },
    });
    ids.push(id);
  }

  await AsyncStorage.setItem(MEDICATION_NOTIFICATION_IDS_KEY, JSON.stringify(ids));
  return { scheduledCount: ids.length };
}

export async function rescheduleAppointmentNotificationsForUser(userId: string) {
  if (!Notifications) return { scheduledCount: 0 };

  await ensureLocalReminderNotificationsReady();
  if (!(await hasRemindersPermission())) return { scheduledCount: 0 };
  await cancelStoredNotificationIds(APPOINTMENT_NOTIFICATION_IDS_KEY);

  const { data: appointments } = await supabase
    .from(TABLES.APPOINTMENTS)
    .select("id,date,time,type,reminder_minutes_before")
    .eq("user_id", userId);

  const ids: string[] = [];
  const now = Date.now();
  for (const apt of appointments ?? []) {
    if (!appointmentHasReminder(apt)) continue;
    const dateTime = getAppointmentDateTime(apt);
    if (!dateTime) continue;
    const leadMinutes = Number(apt.reminder_minutes_before);
    if (!Number.isFinite(leadMinutes) || leadMinutes < 0) continue;
    const triggerDate = new Date(dateTime.getTime() - leadMinutes * 60 * 1000);
    if (triggerDate.getTime() <= now) continue;

    const timeLabel =
      typeof apt.time === "string" && apt.time.trim() ? apt.time.trim().slice(0, 5) : "09:00";
    const id = await Notifications.scheduleNotificationAsync({
      content: reminderNotificationContent(
        "Appointment Reminder",
        `${apt.type || "Appointment"} at ${timeLabel}`,
        reminderNotificationData({ kind: "appointment", appointmentId: String(apt.id) }),
      ),
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
        ...androidReminderTriggerExtras(),
      },
    });
    ids.push(id);
  }

  await AsyncStorage.setItem(APPOINTMENT_NOTIFICATION_IDS_KEY, JSON.stringify(ids));
  return { scheduledCount: ids.length };
}

function supplyDueTriggerDate(nextDueYmd: string): Date | null {
  const d = parseYmdLocal(nextDueYmd);
  if (!Number.isFinite(d.getTime())) return null;
  d.setHours(SUPPLY_DUE_REMINDER_HOUR, SUPPLY_DUE_REMINDER_MINUTE, 0, 0);
  return d;
}

/**
 * One-shot alert on the morning of each stocked kit’s next due date.
 * Empty kits and past triggers are skipped (overdue stays a dashboard priority).
 */
export async function rescheduleSupplyNotificationsForUser(userId: string) {
  if (!Notifications) return { scheduledCount: 0 };

  await ensureLocalReminderNotificationsReady();
  if (!(await hasRemindersPermission())) return { scheduledCount: 0 };
  await cancelStoredNotificationIds(SUPPLY_NOTIFICATION_IDS_KEY);

  const entries = await fetchKitListEntries(userId);
  const ids: string[] = [];
  const now = Date.now();

  for (const entry of entries) {
    if (entry.status === "empty") continue;
    const dueYmd = entry.kit.next_due_date?.trim();
    if (!dueYmd) continue;
    const triggerDate = supplyDueTriggerDate(dueYmd);
    if (!triggerDate || triggerDate.getTime() <= now) continue;

    const name = entry.kit.name?.trim() || "Supply order";
    const id = await Notifications.scheduleNotificationAsync({
      content: reminderNotificationContent(
        "Supply order due",
        `${name} is due today`,
        reminderNotificationData({ kind: "medicalSupply", kitId: String(entry.kit.id) }),
      ),
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
        ...androidReminderTriggerExtras(),
      },
    });
    ids.push(id);
  }

  await AsyncStorage.setItem(SUPPLY_NOTIFICATION_IDS_KEY, JSON.stringify(ids));
  return { scheduledCount: ids.length };
}

/** Rebuild all local reminders from Supabase (meds + appointments + supplies). */
export async function rescheduleAllLocalRemindersForUser(userId: string) {
  await ensureLocalReminderNotificationsReady();
  if (!(await ensureRemindersPermissionGranted())) {
    return { scheduledCount: 0, permissionGranted: false };
  }
  await cancelAllScheduledLocalReminders();
  const meds = await rescheduleMedicationNotificationsForUser(userId);
  const appts = await rescheduleAppointmentNotificationsForUser(userId);
  const supplies = await rescheduleSupplyNotificationsForUser(userId);
  return {
    scheduledCount: meds.scheduledCount + appts.scheduledCount + supplies.scheduledCount,
    permissionGranted: true,
  };
}

/** Med/appt/supply save paths — resync all local reminders when permission is already granted. */
export async function rescheduleLocalRemindersIfGranted(userId: string): Promise<void> {
  if (!Notifications) return;
  await ensureLocalReminderNotificationsReady();
  if (!(await hasRemindersPermission())) return;
  await rescheduleAllLocalRemindersForUser(userId);
}
