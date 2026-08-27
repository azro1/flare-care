import { LOG_HISTORY_LOAD_MORE_BATCH } from "./logHistoryConstants";
import { FLARE_FEATURE_LUCIDE } from "./flareLucideIcons";
import {
  buildOccurredAtIso,
  occurredAtToFormParts,
  snapTimeHmFromDate,
  todayYmd,
} from "./bowelMovementShared";
import { sanitizeNotesMobile } from "./symptomWizardShared";
import { supabase, TABLES } from "./supabase";

export const OUTPUT_FEATURE_ICON = FLARE_FEATURE_LUCIDE.output;

/** Stored in `track_output.kind` — keep general, not journey-gated. */
export const OUTPUT_KINDS = ["stoma", "urine", "drain", "other"] as const;
export type OutputKind = (typeof OUTPUT_KINDS)[number];

export const OUTPUT_KIND_OPTIONS: { value: OutputKind; label: string }[] = [
  { value: "stoma", label: "Stoma" },
  { value: "urine", label: "Urine" },
  { value: "drain", label: "Drain" },
  { value: "other", label: "Other" },
];

export function outputKindLabel(kind: string | null | undefined): string {
  const match = OUTPUT_KIND_OPTIONS.find((o) => o.value === kind);
  return match?.label ?? "Other";
}

export function normalizeOutputKind(raw: string | null | undefined): OutputKind {
  if (raw === "stoma" || raw === "urine" || raw === "drain" || raw === "other") return raw;
  return "other";
}

export type OutputRow = {
  id: number;
  user_id: string;
  amount_ml: number;
  kind: string | null;
  occurred_at: string;
  notes: string | null;
  created_at: string;
};

export type OutputFormState = {
  kind: OutputKind;
  date: string;
  time: string;
  amountMl: string;
  notes: string;
};

export type TodayOutputTotals = {
  totalMl: number;
  byKind: Partial<Record<OutputKind, number>>;
};

/** New log sheet — date today, time now. */
export function quickOutputFormState(): OutputFormState {
  const now = new Date();
  return {
    kind: "other",
    date: todayYmd(),
    time: snapTimeHmFromDate(now),
    amountMl: "",
    notes: "",
  };
}

export function outputFormFromRow(row: OutputRow): OutputFormState {
  const { date, time } = occurredAtToFormParts(row.occurred_at);
  return {
    kind: normalizeOutputKind(row.kind),
    date,
    time,
    amountMl: String(row.amount_ml),
    notes: row.notes || "",
  };
}

export function formatOutputMl(value: number | string | null | undefined): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return `${n} ml`;
}

export function formatOutputListTitle(row: OutputRow): string {
  return `${outputKindLabel(row.kind)} — ${formatOutputMl(row.amount_ml)}`;
}

export function normalizeOutputMlInput(raw: string): string {
  let v = raw.replace(/[^\d.]/g, "");
  const parts = v.split(".");
  if (parts.length > 2) v = `${parts[0]}.${parts.slice(1).join("")}`;
  return v.slice(0, 8);
}

export function validateOutputForm(form: OutputFormState): string | null {
  if (!form.kind) return "Please select a type.";
  if (!form.date) return "Please select a date.";
  if (!form.time) return "Please select a time.";
  const amount = parseFloat(form.amountMl);
  if (!Number.isFinite(amount) || amount <= 0) return "Please enter a valid amount in ml.";
  const occurred = buildOccurredAtIso(form.date, form.time);
  if (!occurred) return "Please enter a valid date and time.";
  if (occurred.getTime() > Date.now()) return "Can't be in the future";
  return null;
}

export function outputPayloadFromForm(form: OutputFormState) {
  const amount = parseFloat(form.amountMl);
  const occurred = buildOccurredAtIso(form.date, form.time)!;
  return {
    kind: form.kind,
    amount_ml: amount,
    occurred_at: occurred.toISOString(),
    notes: sanitizeNotesMobile(form.notes) || null,
  };
}

/** Local calendar day bounds as ISO for querying today's logs. */
export function todayLocalOccurredAtRange(): { startIso: string; endIso: string } {
  const start = new Date(`${todayYmd()}T00:00:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}

export function emptyTodayOutputTotals(): TodayOutputTotals {
  return { totalMl: 0, byKind: {} };
}

export async function fetchTodayOutputTotals(userId: string): Promise<TodayOutputTotals> {
  const { startIso, endIso } = todayLocalOccurredAtRange();
  const { data, error } = await supabase
    .from(TABLES.TRACK_OUTPUT)
    .select("amount_ml, kind")
    .eq("user_id", userId)
    .gte("occurred_at", startIso)
    .lt("occurred_at", endIso);
  if (error) throw error;

  const byKind: Partial<Record<OutputKind, number>> = {};
  let totalMl = 0;
  for (const row of data ?? []) {
    const n = Number(row.amount_ml);
    if (!Number.isFinite(n)) continue;
    totalMl += n;
    const kind = normalizeOutputKind(row.kind as string | null);
    byKind[kind] = (byKind[kind] ?? 0) + n;
  }
  const totals = { totalMl, byKind };
  setTodayOutputTotalCache(userId, totalMl);
  return totals;
}

/** Avoid 0→amount flash on hub land — keyed by user + local day. */
const todayOutputTotalCacheByKey: Record<string, number> = {};

function todayOutputTotalCacheKey(userId: string): string {
  return `${userId}:${todayYmd()}`;
}

export function getTodayOutputTotalCache(userId: string): number | undefined {
  return todayOutputTotalCacheByKey[todayOutputTotalCacheKey(userId)];
}

export function setTodayOutputTotalCache(userId: string, totalMl: number) {
  todayOutputTotalCacheByKey[todayOutputTotalCacheKey(userId)] = totalMl;
}

export function invalidateTodayOutputTotalCache(userId: string) {
  delete todayOutputTotalCacheByKey[todayOutputTotalCacheKey(userId)];
}

type OutputListCacheSnapshot = {
  rows: OutputRow[];
  totalCount: number;
  visibleCount: number;
};

const outputListCacheByUserId: Record<string, OutputListCacheSnapshot> = {};

export function getOutputListCache(userId: string): OutputListCacheSnapshot | undefined {
  return outputListCacheByUserId[userId];
}

export function setOutputListCache(userId: string, snapshot: OutputListCacheSnapshot) {
  outputListCacheByUserId[userId] = snapshot;
}

export function invalidateOutputListCache(userId: string) {
  delete outputListCacheByUserId[userId];
  invalidateTodayOutputTotalCache(userId);
}

export async function deleteOutputsForUser(userId: string, outputIds: string[]): Promise<void> {
  if (outputIds.length === 0) return;
  const numericIds = outputIds.map((id) => parseInt(id, 10)).filter((id) => Number.isFinite(id));
  if (numericIds.length === 0) return;
  const { error } = await supabase
    .from(TABLES.TRACK_OUTPUT)
    .delete()
    .eq("user_id", userId)
    .in("id", numericIds);
  if (error) throw error;
}

export const OUTPUT_SECTION_ROUTE_NAMES = ["Output", "OutputLogDetail"] as const;

export function isOutputSectionRoute(routeName: string | undefined): boolean {
  return (OUTPUT_SECTION_ROUTE_NAMES as readonly string[]).includes(routeName ?? "");
}

export function resetOutputListExpansion(userId: string, initialVisible = LOG_HISTORY_LOAD_MORE_BATCH) {
  const cached = outputListCacheByUserId[userId];
  if (cached) {
    outputListCacheByUserId[userId] = { ...cached, visibleCount: initialVisible };
  }
}
