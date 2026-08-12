import { LOG_HISTORY_LOAD_MORE_BATCH } from "./logHistoryConstants";
import { TIME_PICKER_MINUTE_INTERVAL } from "./layoutConstants";
import { supabase, TABLES } from "./supabase";
import { sanitizeNotesMobile } from "./symptomWizardShared";

export const APPOINTMENTS_FEATURE_ION_ICON = "calendar-outline" as const;

export const APPOINTMENT_ADDED_ACTIVITY_TITLE = "Added new appointment";
export const APPOINTMENT_UPDATED_ACTIVITY_TITLE = "Updated appointment";

export type AppointmentRow = {
  id: number;
  user_id: string;
  date: string;
  time: string | null;
  type: string | null;
  clinician_name: string | null;
  location: string | null;
  notes: string | null;
  reminder_minutes_before: number | null;
  reminder_sent_at: string | null;
  created_at: string;
  updated_at: string | null;
};

export type AppointmentsTab = "upcoming" | "past";

export type AppointmentFormState = {
  date: string;
  time: string;
  type: string;
  clinicianName: string;
  location: string;
  notes: string;
  reminderMinutesBefore: number | null;
};

export const APPOINTMENT_REMINDER_OPTIONS: { value: number | null; label: string }[] = [
  { value: null, label: "No reminder" },
  { value: 5, label: "5 minutes before" },
  { value: 10, label: "10 minutes before" },
  { value: 15, label: "15 minutes before" },
  { value: 30, label: "30 minutes before" },
  { value: 45, label: "45 minutes before" },
  { value: 60, label: "1 hour before" },
  { value: 120, label: "2 hours before" },
  { value: 1440, label: "24 hours before" },
];

export const APPOINTMENT_REMINDER_PICKER_LABELS = APPOINTMENT_REMINDER_OPTIONS.map((o) => o.label);

export function reminderLabelFromMinutes(minutes: number | null | undefined): string {
  if (minutes == null) return "No reminder";
  const opt = APPOINTMENT_REMINDER_OPTIONS.find((o) => o.value === minutes);
  return opt?.label ?? `${minutes} mins before`;
}

/** Compact reminder label for list subtitles (bell row) — e.g. `5 mb`, `1 hb`. */
export function reminderListLabelFromMinutes(minutes: number | null | undefined): string {
  if (minutes == null) return "No reminder";
  if (minutes < 60) return `${minutes} mb`;
  if (minutes % 60 === 0) {
    const hours = minutes / 60;
    return hours === 1 ? "1 hb" : `${hours} hb`;
  }
  return `${minutes} mb`;
}

export function appointmentHasReminder(row: Pick<AppointmentRow, "reminder_minutes_before">): boolean {
  return row.reminder_minutes_before != null;
}

export function reminderMinutesFromPickerLabel(label: string): number | null {
  const opt = APPOINTMENT_REMINDER_OPTIONS.find((o) => o.label === label);
  return opt?.value ?? null;
}

export function buildAppointmentTimeOptions(): string[] {
  const options: string[] = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += TIME_PICKER_MINUTE_INTERVAL) {
      options.push(`${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`);
    }
  }
  return options;
}

export const APPOINTMENT_TIME_OPTIONS = buildAppointmentTimeOptions();

/** Missing/invalid time → end of day (matches web brief). */
export function getAppointmentDateTime(apt: Pick<AppointmentRow, "date" | "time">): Date | null {
  if (!apt.date) return null;
  const datePart = String(apt.date).match(/^(\d{4}-\d{2}-\d{2})/)?.[1];
  if (!datePart) return null;

  const base = new Date(`${datePart}T00:00:00`);
  if (Number.isNaN(base.getTime())) return null;

  let hours = 23;
  let minutes = 59;
  // Postgres `time` often comes back as HH:mm:ss — accept optional seconds.
  const hm = typeof apt.time === "string" ? apt.time.trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/) : null;
  if (hm) {
    const h = Number(hm[1]);
    const m = Number(hm[2]);
    if (Number.isFinite(h) && h >= 0 && h <= 23 && Number.isFinite(m) && m >= 0 && m <= 59) {
      hours = h;
      minutes = m;
    }
  }

  const dt = new Date(base);
  dt.setHours(hours, minutes, 0, 0);
  return dt;
}

export function splitAppointmentsByTab(
  rows: AppointmentRow[],
  nowMs = Date.now(),
): { upcoming: AppointmentRow[]; past: AppointmentRow[] } {
  const withDt = rows
    .map((apt) => ({ apt, dt: getAppointmentDateTime(apt) }))
    .filter((x): x is { apt: AppointmentRow; dt: Date } => x.dt != null);

  const upcoming = withDt
    .filter((x) => x.dt.getTime() >= nowMs)
    .map((x) => x.apt)
    .sort((a, b) => (getAppointmentDateTime(a)?.getTime() ?? 0) - (getAppointmentDateTime(b)?.getTime() ?? 0));

  const past = withDt
    .filter((x) => x.dt.getTime() < nowMs)
    .map((x) => x.apt)
    .sort((a, b) => (getAppointmentDateTime(b)?.getTime() ?? 0) - (getAppointmentDateTime(a)?.getTime() ?? 0));

  return { upcoming, past };
}

export function quickAppointmentFormState(): AppointmentFormState {
  return {
    date: "",
    time: "",
    type: "",
    clinicianName: "",
    location: "",
    notes: "",
    reminderMinutesBefore: null,
  };
}

export function appointmentFormFromRow(row: AppointmentRow): AppointmentFormState {
  return {
    date: row.date,
    time: row.time || "",
    type: row.type || "",
    clinicianName: row.clinician_name || "",
    location: row.location || "",
    notes: row.notes || "",
    reminderMinutesBefore: row.reminder_minutes_before ?? null,
  };
}

export function validateAppointmentForm(form: AppointmentFormState): string | null {
  if (!form.date) return "Please select a date.";
  if (!form.time) return "Please select a time.";
  if (!form.type.trim()) return "Please enter type of appointment.";
  if (!form.location.trim()) return "Please enter a location.";
  return null;
}

export function appointmentPayloadFromForm(form: AppointmentFormState, isEdit: boolean) {
  const reminderVal = form.reminderMinutesBefore;
  return {
    date: form.date,
    time: form.time || null,
    type: form.type.trim() || null,
    clinician_name: form.clinicianName.trim() || null,
    location: form.location.trim() || null,
    notes: sanitizeNotesMobile(form.notes) || null,
    reminder_minutes_before: reminderVal,
    ...(isEdit ? { reminder_sent_at: null } : {}),
  };
}

export function appointmentListSubtitle(row: AppointmentRow): string {
  const parts: string[] = [];
  if (row.date) parts.push(row.date);
  if (row.time?.trim()) parts.push(row.time.trim());
  return parts.join(" · ");
}

const appointmentsListCacheByUserId: Record<string, AppointmentRow[]> = {};

export function getAppointmentsListCache(userId: string): AppointmentRow[] | undefined {
  return appointmentsListCacheByUserId[userId];
}

export function setAppointmentsListCache(userId: string, rows: AppointmentRow[]) {
  appointmentsListCacheByUserId[userId] = rows;
}

export function invalidateAppointmentsListCache(userId: string) {
  delete appointmentsListCacheByUserId[userId];
}

export async function fetchAppointmentsForUser(userId: string): Promise<AppointmentRow[]> {
  const { data, error } = await supabase
    .from(TABLES.APPOINTMENTS)
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  const rows = (data ?? []) as AppointmentRow[];
  setAppointmentsListCache(userId, rows);
  return rows;
}

export async function deleteAppointmentsForUser(userId: string, appointmentIds: string[]): Promise<void> {
  if (appointmentIds.length === 0) return;
  const numericIds = appointmentIds.map((id) => parseInt(id, 10)).filter((id) => Number.isFinite(id));
  if (numericIds.length === 0) return;
  const { error } = await supabase
    .from(TABLES.APPOINTMENTS)
    .delete()
    .eq("user_id", userId)
    .in("id", numericIds);
  if (error) throw error;
}

export const APPOINTMENTS_SECTION_ROUTE_NAMES = [
  "Appointments",
  "AppointmentsPast",
  "AppointmentDetail",
  "AppointmentBrief",
  "AppointmentBriefCustomRange",
  "AppointmentBriefResult",
  "AppointmentBriefHealth",
  "AppointmentBriefNext",
  "AppointmentBriefChanges",
] as const;

export function isAppointmentsSectionRoute(routeName: string | undefined): boolean {
  return (APPOINTMENTS_SECTION_ROUTE_NAMES as readonly string[]).includes(routeName ?? "");
}

const apptsExpandedByUserTab: Record<string, number> = {};

function expansionCacheKey(userId: string, tab: AppointmentsTab) {
  return `${userId}:${tab}`;
}

export function getApptsListExpandedCount(
  userId: string,
  tab: AppointmentsTab,
  initialVisible = LOG_HISTORY_LOAD_MORE_BATCH,
): number {
  return apptsExpandedByUserTab[expansionCacheKey(userId, tab)] ?? initialVisible;
}

export function setApptsListExpandedCount(userId: string, tab: AppointmentsTab, count: number) {
  apptsExpandedByUserTab[expansionCacheKey(userId, tab)] = count;
}

export function resetApptsListExpansion(userId: string) {
  delete apptsExpandedByUserTab[expansionCacheKey(userId, "upcoming")];
  delete apptsExpandedByUserTab[expansionCacheKey(userId, "past")];
}
