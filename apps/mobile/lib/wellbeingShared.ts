import { supabase, TABLES } from "./supabase";
import { FLARE_FEATURE_LUCIDE } from "./flareLucideIcons";

export const WELLBEING_ICON = FLARE_FEATURE_LUCIDE.wellbeing;

/** History row + detail header title (matches Symptom/Medication Log naming). */
export const WELLBEING_LOG_TITLE = "Wellbeing Log";

/** 1–5 scale option for mood, energy, sleep, anxiety, IBD impact, pain, brain fog. */
export type WellbeingScale = 1 | 2 | 3 | 4 | 5;

export const SCALE_OPTIONS: { value: WellbeingScale; label: string }[] = [
  { value: 1, label: "1 – Very poor" },
  { value: 2, label: "2 – Poor" },
  { value: 3, label: "3 – Moderate" },
  { value: 4, label: "4 – Good" },
  { value: 5, label: "5 – Very good" },
];

export const SCALE_OPTIONS_REVERSED: { value: WellbeingScale; label: string }[] = [
  { value: 1, label: "1 – Very low" },
  { value: 2, label: "2 – Low" },
  { value: 3, label: "3 – Moderate" },
  { value: 4, label: "4 – High" },
  { value: 5, label: "5 – Very high" },
];

/** Options where lower numbers = worse (mood, energy, sleep). */
export const SCALE_OPTIONS_MOOD: { value: WellbeingScale; label: string }[] = [
  { value: 1, label: "1 – Very low" },
  { value: 2, label: "2 – Low" },
  { value: 3, label: "3 – Okay" },
  { value: 4, label: "4 – Good" },
  { value: 5, label: "5 – Great" },
];

/** Options for anxiety/pain/IBD impact where higher = worse. */
export const SCALE_OPTIONS_SEVERITY: { value: WellbeingScale; label: string }[] = [
  { value: 1, label: "1 – None" },
  { value: 2, label: "2 – Mild" },
  { value: 3, label: "3 – Moderate" },
  { value: 4, label: "4 – High" },
  { value: 5, label: "5 – Severe" },
];

export type WellbeingFormState = {
  date: string;
  mood: WellbeingScale | null;
  energy: WellbeingScale | null;
  sleep_quality: WellbeingScale | null;
  anxiety: WellbeingScale | null;
  ibd_impact: WellbeingScale | null;
  pain: WellbeingScale | null;
  brain_fog: WellbeingScale | null;
  exercised: boolean | null;
  exercise_minutes: string;
  social_connection: boolean | null;
  time_outdoors: boolean | null;
  notes: string;
};

export type WellbeingRow = {
  id: number;
  user_id: string;
  date: string;
  mood: number | null;
  energy: number | null;
  sleep_quality: number | null;
  anxiety: number | null;
  ibd_impact: number | null;
  pain: number | null;
  brain_fog: number | null;
  exercised: boolean | null;
  exercise_minutes: number | null;
  social_connection: boolean | null;
  time_outdoors: boolean | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export function quickWellbeingFormState(): WellbeingFormState {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, "0");
  const d = String(today.getDate()).padStart(2, "0");
  return {
    date: `${y}-${m}-${d}`,
    mood: null,
    energy: null,
    sleep_quality: null,
    anxiety: null,
    ibd_impact: null,
    pain: null,
    brain_fog: null,
    exercised: null,
    exercise_minutes: "",
    social_connection: null,
    time_outdoors: null,
    notes: "",
  };
}

export function wellbeingPayloadFromForm(form: WellbeingFormState) {
  const mins = parseInt(form.exercise_minutes, 10);
  return {
    date: form.date,
    mood: form.mood ?? null,
    energy: form.energy ?? null,
    sleep_quality: form.sleep_quality ?? null,
    anxiety: form.anxiety ?? null,
    ibd_impact: form.ibd_impact ?? null,
    pain: form.pain ?? null,
    brain_fog: form.brain_fog ?? null,
    exercised: form.exercised ?? null,
    exercise_minutes: form.exercised && Number.isFinite(mins) && mins > 0 ? mins : null,
    social_connection: form.social_connection ?? null,
    time_outdoors: form.time_outdoors ?? null,
    notes: form.notes.trim() || null,
  };
}

/** Check whether today already has a wellbeing entry. */
export async function getTodayWellbeingEntry(
  userId: string,
  dateIso: string,
): Promise<WellbeingRow | null> {
  const { data } = await supabase
    .from(TABLES.DAILY_WELLBEING)
    .select("*")
    .eq("user_id", userId)
    .eq("date", dateIso)
    .maybeSingle();
  return (data as WellbeingRow | null) ?? null;
}

let wellbeingListCache: Record<string, { rows: WellbeingRow[]; totalCount: number; visibleCount: number }> = {};

export function getWellbeingListCache(userId: string) {
  return wellbeingListCache[userId];
}

export function setWellbeingListCache(
  userId: string,
  snapshot: { rows: WellbeingRow[]; totalCount: number; visibleCount: number },
): void {
  wellbeingListCache[userId] = snapshot;
}

export function invalidateWellbeingListCache(userId: string): void {
  delete wellbeingListCache[userId];
}

export async function deleteWellbeingEntriesForUser(
  userId: string,
  ids: string[],
): Promise<void> {
  const numericIds = ids.map(Number).filter(Number.isFinite);
  if (!numericIds.length) return;
  const { error } = await supabase
    .from(TABLES.DAILY_WELLBEING)
    .delete()
    .in("id", numericIds)
    .eq("user_id", userId);
  if (error) throw error;
}

export function formatWellbeingDate(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
