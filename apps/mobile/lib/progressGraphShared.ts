/**
 * Daily stay-on-track scores for the progress graph.
 * Used by `components/ProgressOverTimeGraph.tsx` (held for a future Trends screen).
 */
import { HYDRATION_TARGET } from "./hydrationShared";
import { fetchMedicationsForUser } from "./medicationShared";
import { supabase, TABLES } from "./supabase";

export type ProgressGraphPeriod = "2w" | "3w" | "4w" | "3m" | "6m" | "1y";

export const PROGRESS_GRAPH_PERIODS: { id: ProgressGraphPeriod; label: string; days: number }[] = [
  { id: "2w", label: "2 weeks", days: 14 },
  { id: "3w", label: "3 weeks", days: 21 },
  { id: "4w", label: "4 weeks", days: 28 },
  { id: "3m", label: "3 months", days: 90 },
  { id: "6m", label: "6 months", days: 180 },
  { id: "1y", label: "Year", days: 365 },
];

export const DEFAULT_PROGRESS_GRAPH_PERIOD: ProgressGraphPeriod = "2w";
export const PROGRESS_GRAPH_PERIOD_LABELS = PROGRESS_GRAPH_PERIODS.map((p) => p.label);

export type ProgressDayPoint = {
  /** YYYY-MM-DD */
  date: string;
  /** 0–100 day score (same rules as My progress %). */
  pct: number;
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function toYmd(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function addDays(d: Date, days: number): Date {
  const next = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  next.setDate(next.getDate() + days);
  return next;
}

export function progressGraphDayCount(period: ProgressGraphPeriod): number {
  return PROGRESS_GRAPH_PERIODS.find((p) => p.id === period)?.days ?? 14;
}

export function progressGraphPeriodLabel(period: ProgressGraphPeriod): string {
  return PROGRESS_GRAPH_PERIODS.find((p) => p.id === period)?.label ?? "2 weeks";
}

export function progressGraphPeriodFromLabel(label: string): ProgressGraphPeriod | null {
  return PROGRESS_GRAPH_PERIODS.find((p) => p.label === label)?.id ?? null;
}

/** Same day % as the My progress modal: meds+water average, or water only when no meds. */
export function dayProgressPct(medsTaken: number, medsTotal: number, hydrationGlasses: number): number {
  const hasMeds = medsTotal > 0;
  const medsRatio = hasMeds ? Math.min(1, medsTaken / medsTotal) : 0;
  const hydrationRatio = Math.min(1, hydrationGlasses / HYDRATION_TARGET);
  return Math.round((hasMeds ? (medsRatio + hydrationRatio) / 2 : hydrationRatio) * 100);
}

/**
 * Daily stay-on-track scores for the chosen period (oldest → newest).
 * Uses current prescribed med count for history (good enough for v1).
 */
export async function fetchProgressDayPoints(
  userId: string,
  period: ProgressGraphPeriod,
): Promise<ProgressDayPoint[]> {
  const dayCount = progressGraphDayCount(period);
  const end = new Date();
  end.setHours(0, 0, 0, 0);
  const start = addDays(end, -(dayCount - 1));
  const startYmd = toYmd(start);
  const endYmd = toYmd(end);

  const [medications, takenRes, hydrationRes] = await Promise.all([
    fetchMedicationsForUser(userId),
    supabase
      .from(TABLES.MEDICATION_TAKEN)
      .select("medication_id,taken_date")
      .eq("user_id", userId)
      .gte("taken_date", startYmd)
      .lte("taken_date", endYmd),
    supabase
      .from(TABLES.DAILY_HYDRATION)
      .select("date,glasses")
      .eq("user_id", userId)
      .gte("date", startYmd)
      .lte("date", endYmd),
  ]);

  if (takenRes.error) throw takenRes.error;
  if (hydrationRes.error) throw hydrationRes.error;

  const medsTotal = medications.filter((med) => med.name !== "Medication Tracking").length;
  const takenByDate = new Map<string, number>();
  for (const row of takenRes.data ?? []) {
    const key = String(row.taken_date);
    takenByDate.set(key, (takenByDate.get(key) ?? 0) + 1);
  }
  const hydrationByDate = new Map<string, number>();
  for (const row of hydrationRes.data ?? []) {
    hydrationByDate.set(String(row.date), Number(row.glasses) || 0);
  }

  const points: ProgressDayPoint[] = [];
  for (let i = 0; i < dayCount; i += 1) {
    const date = toYmd(addDays(start, i));
    points.push({
      date,
      pct: dayProgressPct(takenByDate.get(date) ?? 0, medsTotal, hydrationByDate.get(date) ?? 0),
    });
  }
  return points;
}

export function averageProgressPct(points: ProgressDayPoint[]): number {
  if (points.length === 0) return 0;
  const sum = points.reduce((acc, p) => acc + p.pct, 0);
  return Math.round(sum / points.length);
}
