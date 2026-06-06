import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase, TABLES } from "./supabase";

let Notifications: any = null;
try {
  Notifications = require("expo-notifications");
} catch {
  Notifications = null;
}

const MEDICATION_NOTIFICATION_IDS_KEY = "flarecare.notificationIds";
const APPOINTMENT_NOTIFICATION_IDS_KEY = "flarecare.appointmentNotificationIds";

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

  await cancelStoredNotificationIds(MEDICATION_NOTIFICATION_IDS_KEY);

  const { data: meds } = await supabase
    .from(TABLES.MEDICATIONS)
    .select("name,time_of_day")
    .eq("user_id", userId)
    .eq("reminders_enabled", true);

  const ids: string[] = [];
  for (const med of meds ?? []) {
    const [hour, minute] = String(med.time_of_day || "08:00")
      .split(":")
      .map((v) => Number(v));
    const id = await Notifications.scheduleNotificationAsync({
      content: { title: "Medication Reminder", body: `Time to take ${med.name}` },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: hour || 8,
        minute: minute || 0,
      },
    });
    ids.push(id);
  }

  await AsyncStorage.setItem(MEDICATION_NOTIFICATION_IDS_KEY, JSON.stringify(ids));
  return { scheduledCount: ids.length };
}

export async function rescheduleAppointmentNotificationsForUser(userId: string) {
  if (!Notifications) return { scheduledCount: 0 };

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
      content: {
        title: "Appointment Reminder",
        body: `${apt.type || "Appointment"} at ${apt.time || "09:00"}`,
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: triggerDate },
    });
    ids.push(id);
  }

  await AsyncStorage.setItem(APPOINTMENT_NOTIFICATION_IDS_KEY, JSON.stringify(ids));
  return { scheduledCount: ids.length };
}
