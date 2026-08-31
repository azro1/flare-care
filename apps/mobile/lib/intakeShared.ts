import { LOG_HISTORY_LOAD_MORE_BATCH } from "./logHistoryConstants";
import { FLARE_FEATURE_LUCIDE } from "./flareLucideIcons";
import {
  buildOccurredAtIso,
  occurredAtToFormParts,
} from "./bowelMovementShared";
import { sanitizeFoodTriggersMobile, sanitizeNotesMobile } from "./symptomWizardShared";
import { normalizeOutputMlInput } from "./outputShared";
import { supabase, TABLES } from "./supabase";

export const INTAKE_FEATURE_ICON = FLARE_FEATURE_LUCIDE.intake;

/** Stored in `track_intake.kind`. */
export const INTAKE_KINDS = ["food", "drink"] as const;
export type IntakeKind = (typeof INTAKE_KINDS)[number];

export const INTAKE_KIND_OPTIONS: { value: IntakeKind; label: string }[] = [
  { value: "food", label: "Food" },
  { value: "drink", label: "Drink" },
];

export function intakeKindLabel(kind: string | null | undefined): string {
  const match = INTAKE_KIND_OPTIONS.find((o) => o.value === kind);
  return match?.label ?? "";
}

export function normalizeIntakeKind(raw: string | null | undefined): IntakeKind {
  if (raw === "drink") return "drink";
  return "food";
}

export type IntakeRow = {
  id: number;
  user_id: string;
  kind: string;
  body: string;
  amount_ml: number | null;
  notes: string | null;
  occurred_at: string;
  created_at: string;
};

export type IntakeFormState = {
  kind: IntakeKind | "";
  date: string;
  time: string;
  body: string;
  amountMl: string;
  notes: string;
};

/** New log sheet — empty date/time until the user picks (Weight / Bowel pattern).
 *  Optional `kind` prefills Type when opened from a Food / Drink tab. */
export function quickIntakeFormState(kind: IntakeKind | "" = ""): IntakeFormState {
  return {
    kind,
    date: "",
    time: "",
    body: "",
    amountMl: "",
    notes: "",
  };
}

export function intakeFormFromRow(row: IntakeRow): IntakeFormState {
  const { date, time } = occurredAtToFormParts(row.occurred_at);
  return {
    kind: normalizeIntakeKind(row.kind),
    date,
    time,
    body: row.body || "",
    amountMl: row.amount_ml != null && Number.isFinite(Number(row.amount_ml)) ? String(row.amount_ml) : "",
    notes: row.notes || "",
  };
}

export function formatIntakeMl(value: number | string | null | undefined): string {
  if (value == null || value === "") return "";
  const n = Number(value);
  if (!Number.isFinite(n)) return "";
  return `${n} ml`;
}

export function normalizeIntakeMlInput(raw: string): string {
  return normalizeOutputMlInput(raw);
}

export function validateIntakeForm(form: IntakeFormState): string | null {
  if (!form.kind) return "Please select Food or Drink.";
  if (!form.date) return "Please select a date.";
  if (!form.time) return "Please select a time.";
  if (!sanitizeFoodTriggersMobile(form.body)) return "Please enter an item.";
  if (form.kind === "drink") {
    const amount = parseFloat(form.amountMl);
    if (!Number.isFinite(amount) || amount <= 0) return "Please enter a valid amount in ml.";
  }
  const occurred = buildOccurredAtIso(form.date, form.time);
  if (!occurred) return "Please enter a valid date and time.";
  if (occurred.getTime() > Date.now()) return "Can't be in the future";
  return null;
}

export function intakePayloadFromForm(form: IntakeFormState) {
  const occurred = buildOccurredAtIso(form.date, form.time)!;
  const body = sanitizeFoodTriggersMobile(form.body);
  let amount_ml: number | null = null;
  if (form.kind === "drink") {
    amount_ml = parseFloat(form.amountMl);
  }
  return {
    kind: form.kind as IntakeKind,
    body,
    amount_ml,
    notes: sanitizeNotesMobile(form.notes) || null,
    occurred_at: occurred.toISOString(),
  };
}

type IntakeListCacheSnapshot = {
  rows: IntakeRow[];
  totalCount: number;
  visibleCount: number;
};

const intakeListCacheByUserId: Record<string, IntakeListCacheSnapshot> = {};

export function getIntakeListCache(userId: string): IntakeListCacheSnapshot | undefined {
  return intakeListCacheByUserId[userId];
}

export function setIntakeListCache(userId: string, snapshot: IntakeListCacheSnapshot) {
  intakeListCacheByUserId[userId] = snapshot;
}

export function invalidateIntakeListCache(userId: string) {
  delete intakeListCacheByUserId[userId];
}

export async function deleteIntakesForUser(userId: string, intakeIds: string[]): Promise<void> {
  if (intakeIds.length === 0) return;
  const numericIds = intakeIds.map((id) => parseInt(id, 10)).filter((id) => Number.isFinite(id));
  if (numericIds.length === 0) return;
  const { error } = await supabase
    .from(TABLES.TRACK_INTAKE)
    .delete()
    .eq("user_id", userId)
    .in("id", numericIds);
  if (error) throw error;
}

export const INTAKE_SECTION_ROUTE_NAMES = ["Intake", "IntakeLogDetail"] as const;

export function isIntakeSectionRoute(routeName: string | undefined): boolean {
  return (INTAKE_SECTION_ROUTE_NAMES as readonly string[]).includes(routeName ?? "");
}

export function resetIntakeListExpansion(userId: string, initialVisible = LOG_HISTORY_LOAD_MORE_BATCH) {
  const cached = intakeListCacheByUserId[userId];
  if (cached) {
    intakeListCacheByUserId[userId] = { ...cached, visibleCount: initialVisible };
  }
}
