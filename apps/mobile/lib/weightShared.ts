import { LOG_HISTORY_LOAD_MORE_BATCH } from "./logHistoryConstants";
import { supabase, TABLES } from "./supabase";
import { sanitizeNotesMobile } from "./symptomWizardShared";
import { todayYmd } from "./bowelMovementShared";

export const WEIGHT_FEATURE_MCI_ICON = "scale-bathroom" as const;

export type WeightRow = {
  id: number;
  user_id: string;
  date: string;
  value_kg: number;
  notes: string | null;
  created_at: string;
};

export type WeightFormState = {
  date: string;
  valueKg: string;
  notes: string;
};

export function emptyWeightFormState(): WeightFormState {
  return { date: todayYmd(), valueKg: "", notes: "" };
}

/** New log sheet — user picks date and weight. */
export function quickWeightFormState(): WeightFormState {
  return { date: "", valueKg: "", notes: "" };
}

export function weightFormFromRow(row: WeightRow): WeightFormState {
  return {
    date: row.date,
    valueKg: String(row.value_kg),
    notes: row.notes || "",
  };
}

export function formatWeightKg(value: number | string | null | undefined): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return `${n} kg`;
}

export function normalizeWeightKgInput(raw: string): string {
  let v = raw.replace(/[^\d.]/g, "");
  const parts = v.split(".");
  if (parts.length > 2) v = `${parts[0]}.${parts.slice(1).join("")}`;
  return v.slice(0, 7);
}

export function validateWeightForm(form: WeightFormState): string | null {
  if (!form.date) return "Please select a date.";
  const weight = parseFloat(form.valueKg);
  if (!Number.isFinite(weight) || weight <= 0) return "Please enter a valid weight (e.g. 70.5).";
  if (form.date > todayYmd()) return "Can't be in the future";
  return null;
}

export function weightPayloadFromForm(form: WeightFormState) {
  const weight = parseFloat(form.valueKg);
  return {
    date: form.date,
    value_kg: weight,
    notes: sanitizeNotesMobile(form.notes) || null,
  };
}

type WeightListCacheSnapshot = {
  rows: WeightRow[];
  totalCount: number;
  visibleCount: number;
};

const weightListCacheByUserId: Record<string, WeightListCacheSnapshot> = {};

export function getWeightListCache(userId: string): WeightListCacheSnapshot | undefined {
  return weightListCacheByUserId[userId];
}

export function setWeightListCache(userId: string, snapshot: WeightListCacheSnapshot) {
  weightListCacheByUserId[userId] = snapshot;
}

export function invalidateWeightListCache(userId: string) {
  delete weightListCacheByUserId[userId];
}

export async function deleteWeightsForUser(userId: string, weightIds: string[]): Promise<void> {
  if (weightIds.length === 0) return;
  const numericIds = weightIds.map((id) => parseInt(id, 10)).filter((id) => Number.isFinite(id));
  if (numericIds.length === 0) return;
  const { error } = await supabase
    .from(TABLES.TRACK_WEIGHT)
    .delete()
    .eq("user_id", userId)
    .in("id", numericIds);
  if (error) throw error;
}

export const WEIGHT_SECTION_ROUTE_NAMES = ["Weight", "WeightLogDetail"] as const;

export function isWeightSectionRoute(routeName: string | undefined): boolean {
  return (WEIGHT_SECTION_ROUTE_NAMES as readonly string[]).includes(routeName ?? "");
}

export function resetWeightListExpansion(userId: string, initialVisible = LOG_HISTORY_LOAD_MORE_BATCH) {
  const cached = weightListCacheByUserId[userId];
  if (cached) {
    weightListCacheByUserId[userId] = { ...cached, visibleCount: initialVisible };
  }
}
