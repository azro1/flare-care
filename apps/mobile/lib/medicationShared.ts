import { TIME_PICKER_MINUTE_INTERVAL } from "./layoutConstants";
import { sanitizeNotesMobile } from "./symptomWizardShared";
import { supabase, TABLES } from "./supabase";

export const MEDICATIONS_GOAL_ACTIVITY_TITLE = 'Completed Today\'s goal "Take Medications"';
export const MEDICATION_ADDED_ACTIVITY_TITLE = "Added new medication";

export type MedicationRow = {
  id: number;
  user_id: string;
  name: string;
  dosage: string | null;
  time_of_day: string | null;
  frequency: string | null;
  reminders_enabled: boolean | null;
  notes: string | null;
  created_at: string;
  updated_at?: string | null;
};

export type MedicationFormState = {
  name: string;
  dosage: string;
  timeOfDay: string;
  frequency: string;
  frequencyMode: "preset" | "custom";
  notes: string;
};

/** Native mobile: reminder time alone controls scheduling (no per-med toggle in the form). */
export function medicationRemindersEnabledFromForm(form: MedicationFormState): boolean {
  const time = form.timeOfDay.trim();
  return Boolean(time) && time !== "as-needed";
}

export const MEDICATION_FREQUENCY_PRESETS = [
  "Once a day",
  "Twice a day",
  "Three times a day",
  "Four times a day",
  "Five times a day",
] as const;

export function sanitizeMedicationNameMobile(name: string): string {
  if (typeof name !== "string") return "";
  return name.replace(/<[^>]*>/g, "").trim().slice(0, 100);
}

export function normalizeFrequencyPreset(value: string | null | undefined): string {
  if (!value || typeof value !== "string") return "";
  const key = value.trim().toLowerCase();
  if (key === "two times a day") return "Twice a day";
  const legacy: Record<string, string> = {
    "once a day": "Once a day",
    "twice a day": "Twice a day",
    "three times a day": "Three times a day",
    "four times a day": "Four times a day",
    "five times a day": "Five times a day",
  };
  return legacy[key] ?? value;
}

export function emptyMedicationFormState(): MedicationFormState {
  return {
    name: "",
    dosage: "",
    timeOfDay: "",
    frequency: "",
    frequencyMode: "preset",
    notes: "",
  };
}

export function medicationFormFromRow(row: MedicationRow): MedicationFormState {
  const dosageNumber = (row.dosage || "").replace(/mg$/i, "").replace(/\D/g, "");
  const frequency = normalizeFrequencyPreset(row.frequency || "");
  const frequencyMode = MEDICATION_FREQUENCY_PRESETS.includes(frequency as (typeof MEDICATION_FREQUENCY_PRESETS)[number])
    ? "preset"
    : "custom";
  return {
    name: row.name || "",
    dosage: dosageNumber,
    timeOfDay: row.time_of_day || "",
    frequency,
    frequencyMode,
    notes: row.notes || "",
  };
}

export function medicationPayloadFromForm(form: MedicationFormState, userId: string) {
  return {
    user_id: userId,
    name: sanitizeMedicationNameMobile(form.name),
    dosage: form.dosage ? `${form.dosage.replace(/\D/g, "").slice(0, 5)}mg` : "",
    time_of_day: form.timeOfDay.trim(),
    frequency: form.frequency.trim(),
    reminders_enabled: medicationRemindersEnabledFromForm(form),
    notes: sanitizeNotesMobile(form.notes),
  };
}

export function medicationUpdatePayloadFromForm(form: MedicationFormState) {
  return {
    name: sanitizeMedicationNameMobile(form.name),
    dosage: form.dosage ? `${form.dosage.replace(/\D/g, "").slice(0, 5)}mg` : "",
    time_of_day: form.timeOfDay.trim(),
    frequency: form.frequency.trim(),
    reminders_enabled: medicationRemindersEnabledFromForm(form),
    notes: sanitizeNotesMobile(form.notes),
  };
}

export function formatMedicationReminderTime(timeOfDay: string | null | undefined): string {
  if (!timeOfDay) return "Not set";
  if (timeOfDay === "as-needed") return "As needed";
  if (/^\d{2}:\d{2}$/.test(timeOfDay)) {
    const [hours, minutes] = timeOfDay.split(":");
    const d = new Date(`2000-01-01T${hours}:${minutes}:00`);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit", hour12: true });
    }
  }
  return timeOfDay;
}

export function medicationHasReminder(row: MedicationRow): boolean {
  const time = row.time_of_day?.trim();
  return Boolean(row.reminders_enabled && time && time !== "as-needed");
}

export function medicationListSubtitle(row: MedicationRow): string {
  const parts: string[] = [];
  const dosage = row.dosage?.trim();
  if (dosage) parts.push(dosage);
  if (medicationHasReminder(row)) {
    parts.push(formatMedicationReminderTime(row.time_of_day));
  }
  return parts.join(" · ");
}

export function buildMedicationTimeOptions(): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += TIME_PICKER_MINUTE_INTERVAL) {
      const value = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
      options.push({ value, label: value });
    }
  }
  return options;
}

const medicationsListCacheByUserId: Record<string, MedicationRow[]> = {};

export function getMedicationsListCache(userId: string): MedicationRow[] | undefined {
  return medicationsListCacheByUserId[userId];
}

export function setMedicationsListCache(userId: string, rows: MedicationRow[]) {
  medicationsListCacheByUserId[userId] = rows;
}

export function invalidateMedicationsListCache(userId: string) {
  delete medicationsListCacheByUserId[userId];
}

export function medicationsListCacheKey(rows: MedicationRow[]): string {
  return rows.map((row) => `${row.id}:${row.updated_at ?? row.created_at}:${row.name}`).join("|");
}

export async function fetchMedicationsForUser(userId: string): Promise<MedicationRow[]> {
  const { data, error } = await supabase
    .from(TABLES.MEDICATIONS)
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  const rows = (data ?? []) as MedicationRow[];
  setMedicationsListCache(userId, rows);
  return rows;
}

export async function fetchTakenMedicationIdsForToday(userId: string): Promise<string[]> {
  const today = new Date().toISOString().split("T")[0];
  const { data, error } = await supabase
    .from(TABLES.MEDICATION_TAKEN)
    .select("medication_id")
    .eq("user_id", userId)
    .eq("taken_date", today);
  if (error) throw error;
  return (data ?? []).map((row) => String(row.medication_id));
}

export async function toggleMedicationTakenToday(
  userId: string,
  medicationId: number | string,
  currentlyTaken: boolean,
): Promise<void> {
  const today = new Date().toISOString().split("T")[0];
  const medIdStr = String(medicationId);
  if (currentlyTaken) {
    const { error } = await supabase
      .from(TABLES.MEDICATION_TAKEN)
      .delete()
      .eq("user_id", userId)
      .eq("medication_id", medIdStr)
      .eq("taken_date", today);
    if (error) throw error;
    return;
  }
  const { error } = await supabase.from(TABLES.MEDICATION_TAKEN).upsert(
    { user_id: userId, medication_id: medIdStr, taken_date: today },
    { onConflict: "user_id,medication_id,taken_date" },
  );
  if (error) throw error;
}

export async function deleteMedicationForUser(userId: string, medicationId: number | string): Promise<void> {
  const id = typeof medicationId === "number" ? medicationId : parseInt(medicationId, 10);
  const { error } = await supabase.from(TABLES.MEDICATIONS).delete().eq("id", id).eq("user_id", userId);
  if (error) throw error;
  await supabase.from(TABLES.MEDICATION_TAKEN).delete().eq("user_id", userId).eq("medication_id", String(id));
}
