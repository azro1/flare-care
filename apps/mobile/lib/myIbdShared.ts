/**
 * My Card — user-authored self-advocacy notes (in-app name: My Card).
 * Not a medical record, not medical advice, not an official / government-issued ID.
 * Stored in Supabase (`my_ibd_profiles`).
 */
import { supabase, TABLES } from "./supabase";

export const MY_IBD_FIELD_KEYS = [
  "condition",
  "diagnosed_year",
  "treatment",
  "team",
  "history",
  "hcp_notes",
] as const;

export type MyIbdFieldKey = (typeof MY_IBD_FIELD_KEYS)[number];

export type MyIbdProfile = Record<MyIbdFieldKey, string>;

export const MY_IBD_FIELDS: {
  key: MyIbdFieldKey;
  label: string;
  placeholder: string;
  multiline?: boolean;
}[] = [
  { key: "condition", label: "Condition", placeholder: "e.g. Crohn’s disease" },
  { key: "diagnosed_year", label: "Diagnosed year", placeholder: "e.g. 2019" },
  {
    key: "treatment",
    label: "Current medications",
    placeholder: "None in My Meds yet",
    multiline: true,
  },
  {
    key: "team",
    label: "My IBD team",
    placeholder: "Clinic, consultant, or IBD nurse",
    multiline: true,
  },
  {
    key: "history",
    label: "Important history",
    placeholder: "Key events you want to remember",
    multiline: true,
  },
  {
    key: "hcp_notes",
    label: "Personal notes for healthcare professionals",
    placeholder: "Anything else you want them to know",
    multiline: true,
  },
];

/** Short fields stay short; longer notes get more room. */
export const MY_IBD_FIELD_MAX: Record<MyIbdFieldKey, number> = {
  condition: 80,
  diagnosed_year: 12,
  treatment: 400,
  team: 200,
  history: 400,
  hcp_notes: 400,
};

export function emptyMyIbdProfile(): MyIbdProfile {
  return {
    condition: "",
    diagnosed_year: "",
    treatment: "",
    team: "",
    history: "",
    hcp_notes: "",
  };
}

export function clampMyIbdField(key: MyIbdFieldKey, raw: string): string {
  const max = MY_IBD_FIELD_MAX[key];
  const trimmed =
    key === "diagnosed_year" || key === "condition"
      ? raw.replace(/\s+/g, " ").trim()
      : raw.replace(/\r\n/g, "\n").trim();
  return trimmed.slice(0, max);
}

function profileFromRow(row: Record<string, unknown> | null): MyIbdProfile {
  const empty = emptyMyIbdProfile();
  if (!row) return empty;
  for (const key of MY_IBD_FIELD_KEYS) {
    const v = row[key];
    empty[key] = typeof v === "string" ? clampMyIbdField(key, v) : "";
  }
  return empty;
}

export async function loadMyIbdProfile(userId: string): Promise<MyIbdProfile> {
  const { data, error } = await supabase
    .from(TABLES.MY_IBD_PROFILES)
    .select("condition, diagnosed_year, treatment, team, history, hcp_notes")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return profileFromRow(data as Record<string, unknown> | null);
}

/** Upsert one field (and keep others). Empty string clears that field. */
export async function saveMyIbdField(
  userId: string,
  key: MyIbdFieldKey,
  value: string,
  current: MyIbdProfile,
): Promise<MyIbdProfile> {
  const next: MyIbdProfile = {
    ...current,
    [key]: clampMyIbdField(key, value),
  };
  const { error } = await supabase.from(TABLES.MY_IBD_PROFILES).upsert(
    {
      user_id: userId,
      condition: next.condition || null,
      diagnosed_year: next.diagnosed_year || null,
      treatment: next.treatment || null,
      team: next.team || null,
      history: next.history || null,
      hcp_notes: next.hcp_notes || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) throw error;
  return next;
}

export function myIbdFieldIsSaved(value: string): boolean {
  return value.trim().length > 0;
}

/** How many med names to show on the card before “+ N more”. */
export const MY_IBD_MEDS_PREVIEW_COUNT = 3;

export type MyIbdMedsPreview = {
  names: string[];
  moreCount: number;
  total: number;
};

/** First few My Meds names (no dosage); remainder as moreCount. */
export function summarizeMyIbdMedications(
  rows: { name: string }[],
  previewCount = MY_IBD_MEDS_PREVIEW_COUNT,
): MyIbdMedsPreview {
  const names = rows.map((row) => (row.name || "").trim()).filter(Boolean);
  const total = names.length;
  if (total <= previewCount) {
    return { names, moreCount: 0, total };
  }
  return {
    names: names.slice(0, previewCount),
    moreCount: total - previewCount,
    total,
  };
}
