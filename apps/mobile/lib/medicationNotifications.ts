import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { supabase, TABLES } from "./supabase";
import { reminderNotificationData } from "./reminderNotificationNavigation";

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

let setupPromise: Promise<void> | null = null;

async function ensureRemindersPermissionGranted(): Promise<boolean> {
  if (!Notifications) return false;
  const { status } = await Notifications.getPermissionsAsync();
  if (status === "granted") return true;
  if (status !== "undetermined") return false;
  const { status: nextStatus } = await Notifications.requestPermissionsAsync();
  return nextStatus === "granted";
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
        lightColor: "#0D9488",
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

function reminderNotificationContent(
  title: string,
  body: string,
  data: Record<string, string>,
) {
  return {
    title,
    body,
    sound: "default" as const,
    data,
    ...(Platform.OS === "android"
      ? { priority: Notifications.AndroidNotificationPriority.MAX }
      : {}),
  };
}

async function cancelAllScheduledLocalReminders() {
  if (!Notifications) return;
  if (typeof Notifications.cancelAllScheduledNotificationsAsync === "function") {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } else {
    await cancelStoredNotificationIds(MEDICATION_NOTIFICATION_IDS_KEY);
    await cancelStoredNotificationIds(APPOINTMENT_NOTIFICATION_IDS_KEY);
  }
  await AsyncStorage.multiRemove([MEDICATION_NOTIFICATION_IDS_KEY, APPOINTMENT_NOTIFICATION_IDS_KEY]);
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

/** Clears all local reminder alarms (e.g. on sign-out). */
export async function clearMedicationNotificationsForUser() {
  if (!Notifications) return;
  if (typeof Notifications.cancelAllScheduledNotificationsAsync === "function") {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } else {
    await cancelStoredNotificationIds(MEDICATION_NOTIFICATION_IDS_KEY);
    await cancelStoredNotificationIds(APPOINTMENT_NOTIFICATION_IDS_KEY);
  }
  await AsyncStorage.multiRemove([
    MEDICATION_NOTIFICATION_IDS_KEY,
    APPOINTMENT_NOTIFICATION_IDS_KEY,
    "flarecare.pushToken",
  ]);
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
  const [medRaw, apptRaw] = await AsyncStorage.multiGet([
    MEDICATION_NOTIFICATION_IDS_KEY,
    APPOINTMENT_NOTIFICATION_IDS_KEY,
  ]);
  const medIds: string[] = medRaw[1] ? JSON.parse(medRaw[1]) : [];
  const apptIds: string[] = apptRaw[1] ? JSON.parse(apptRaw[1]) : [];
  return medIds.length + apptIds.length;
}

export async function rescheduleMedicationNotificationsForUser(userId: string) {
  if (!Notifications) return { scheduledCount: 0 };

  await ensureLocalReminderNotificationsReady();
  if (!(await ensureRemindersPermissionGranted())) return { scheduledCount: 0 };
  await cancelStoredNotificationIds(MEDICATION_NOTIFICATION_IDS_KEY);

  const { data: meds } = await supabase
    .from(TABLES.MEDICATIONS)
    .select("id,name,time_of_day")
    .eq("user_id", userId)
    .eq("reminders_enabled", true);

  const ids: string[] = [];
  for (const med of meds ?? []) {
    const [hour, minute] = String(med.time_of_day || "08:00")
      .split(":")
      .map((v) => Number(v));
    const id = await Notifications.scheduleNotificationAsync({
      content: reminderNotificationContent(
        "Medication Reminder",
        `Time to take ${med.name}`,
        reminderNotificationData({ kind: "medication", medicationId: String(med.id) }),
      ),
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: hour || 8,
        minute: minute || 0,
        ...androidReminderTriggerExtras(),
        ...(Platform.OS === "android" ? { repeats: true } : {}),
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
  if (!(await ensureRemindersPermissionGranted())) return { scheduledCount: 0 };
  await cancelStoredNotificationIds(APPOINTMENT_NOTIFICATION_IDS_KEY);

  const { data: appointments } = await supabase
    .from(TABLES.APPOINTMENTS)
    .select("id,date,time,type,reminder_minutes_before")
    .eq("user_id", userId);

  const ids: string[] = [];
  const now = Date.now();
  for (const apt of appointments ?? []) {
    const time = String(apt.time || "09:00");
    const dateTime = new Date(`${apt.date}T${time}:00`);
    if (Number.isNaN(dateTime.getTime())) continue;
    const leadMinutes = Number(apt.reminder_minutes_before ?? 60);
    const triggerDate = new Date(dateTime.getTime() - leadMinutes * 60 * 1000);
    if (triggerDate.getTime() <= now) continue;

    const id = await Notifications.scheduleNotificationAsync({
      content: reminderNotificationContent(
        "Appointment Reminder",
        `${apt.type || "Appointment"} at ${apt.time || "09:00"}`,
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

/** Rebuild all local reminders from Supabase (meds + appointments). */
export async function rescheduleAllLocalRemindersForUser(userId: string) {
  await ensureLocalReminderNotificationsReady();
  if (!(await ensureRemindersPermissionGranted())) {
    return { scheduledCount: 0, permissionGranted: false };
  }
  await cancelAllScheduledLocalReminders();
  const meds = await rescheduleMedicationNotificationsForUser(userId);
  const appts = await rescheduleAppointmentNotificationsForUser(userId);
  return {
    scheduledCount: meds.scheduledCount + appts.scheduledCount,
    permissionGranted: true,
  };
}
