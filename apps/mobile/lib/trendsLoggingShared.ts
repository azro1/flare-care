/**
 * Daily logging counts for Trends — how often the user saved entries, not a health score.
 * Pair with `components/TrendsLoggingGraph.tsx` / `screens/TrendsScreen.tsx`.
 */
import { supabase, TABLES } from "./supabase";

export type TrendsPeriod = "2w" | "3w" | "4w" | "3m" | "6m" | "1y";

export const TRENDS_PERIODS: { id: TrendsPeriod; label: string; days: number }[] = [
  { id: "2w", label: "2 weeks", days: 14 },
  { id: "3w", label: "3 weeks", days: 21 },
  { id: "4w", label: "4 weeks", days: 28 },
  { id: "3m", label: "3 months", days: 90 },
  { id: "6m", label: "6 months", days: 180 },
  { id: "1y", label: "Year", days: 365 },
];

export const DEFAULT_TRENDS_PERIOD: TrendsPeriod = "2w";
export const TRENDS_PERIOD_LABELS = TRENDS_PERIODS.map((p) => p.label);

export type TrendsFilterId =
  | "all"
  | "symptoms"
  | "trackMeds"
  | "wellbeing"
  | "hydration"
  | "bowel"
  | "weight"
  | "intake"
  | "output";

export const TRENDS_FILTERS: { id: TrendsFilterId; label: string }[] = [
  { id: "all", label: "All" },
  { id: "symptoms", label: "Symptoms" },
  { id: "trackMeds", label: "Track Medications" },
  { id: "wellbeing", label: "Wellbeing" },
  { id: "hydration", label: "Hydration" },
  { id: "bowel", label: "Bowel" },
  { id: "weight", label: "Weight" },
  { id: "intake", label: "Food & Drink" },
  { id: "output", label: "Fluid Output" },
];

export const DEFAULT_TRENDS_FILTER: TrendsFilterId = "all";
export const TRENDS_FILTER_LABELS = TRENDS_FILTERS.map((f) => f.label);

export type TrendsDayPoint = {
  /** YYYY-MM-DD */
  date: string;
  /** Entries logged that day for the active filter. */
  count: number;
};

/** In-memory seed per user + period + filter — land Trends without a spinner flash. */
const trendsDayPointsCacheByKey: Record<string, TrendsDayPoint[]> = {};

function trendsDayPointsCacheKey(userId: string, period: TrendsPeriod, filter: TrendsFilterId): string {
  return `${userId}::${period}::${filter}`;
}

export function getTrendsDayPointsCache(
  userId: string,
  period: TrendsPeriod,
  filter: TrendsFilterId,
): TrendsDayPoint[] | undefined {
  return trendsDayPointsCacheByKey[trendsDayPointsCacheKey(userId, period, filter)];
}

export function setTrendsDayPointsCache(
  userId: string,
  period: TrendsPeriod,
  filter: TrendsFilterId,
  points: TrendsDayPoint[],
) {
  trendsDayPointsCacheByKey[trendsDayPointsCacheKey(userId, period, filter)] = points;
}

/** Drop all period/filter combos for a user (or everything if omitted). */
export function invalidateTrendsDayPointsCache(userId?: string) {
  if (!userId) {
    for (const key of Object.keys(trendsDayPointsCacheByKey)) delete trendsDayPointsCacheByKey[key];
    return;
  }
  const prefix = `${userId}::`;
  for (const key of Object.keys(trendsDayPointsCacheByKey)) {
    if (key.startsWith(prefix)) delete trendsDayPointsCacheByKey[key];
  }
}

export function trendsPeriodDayCount(period: TrendsPeriod): number {
  return TRENDS_PERIODS.find((p) => p.id === period)?.days ?? 14;
}

export function trendsPeriodLabel(period: TrendsPeriod): string {
  return TRENDS_PERIODS.find((p) => p.id === period)?.label ?? "2 weeks";
}

export function trendsPeriodFromLabel(label: string): TrendsPeriod | null {
  return TRENDS_PERIODS.find((p) => p.label === label)?.id ?? null;
}

export function trendsFilterLabel(id: TrendsFilterId): string {
  return TRENDS_FILTERS.find((f) => f.id === id)?.label ?? "All";
}

export function trendsFilterFromLabel(label: string): TrendsFilterId | null {
  return TRENDS_FILTERS.find((f) => f.label === label)?.id ?? null;
}

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

/** Local calendar day from an ISO timestamp. */
function isoToLocalYmd(iso: string): string | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return toYmd(d);
}

function bump(map: Map<string, number>, key: string, by = 1) {
  if (!key) return;
  map.set(key, (map.get(key) ?? 0) + by);
}

function emptyDaySeries(start: Date, dayCount: number): TrendsDayPoint[] {
  const points: TrendsDayPoint[] = [];
  for (let i = 0; i < dayCount; i += 1) {
    points.push({ date: toYmd(addDays(start, i)), count: 0 });
  }
  return points;
}

function applyCounts(points: TrendsDayPoint[], counts: Map<string, number>): TrendsDayPoint[] {
  return points.map((p) => ({ date: p.date, count: counts.get(p.date) ?? 0 }));
}

async function fetchIsoDayCounts(
  table: string,
  userId: string,
  column: "created_at" | "occurred_at",
  startIso: string,
  endExclusiveIso: string,
): Promise<Map<string, number>> {
  const { data, error } = await supabase
    .from(table)
    .select(column)
    .eq("user_id", userId)
    .gte(column, startIso)
    .lt(column, endExclusiveIso);
  if (error) throw error;
  const map = new Map<string, number>();
  for (const row of data ?? []) {
    const raw = (row as unknown as Record<string, unknown>)[column];
    const ymd = isoToLocalYmd(String(raw ?? ""));
    if (ymd) bump(map, ymd);
  }
  return map;
}

async function fetchDateOnlyCounts(
  table: string,
  userId: string,
  startYmd: string,
  endYmd: string,
  opts?: {
    /** When set, only count rows that pass (e.g. hydration glasses > 0). */
    includeRow?: (row: Record<string, unknown>) => boolean;
    select?: string;
  },
): Promise<Map<string, number>> {
  const select = opts?.select ?? "date";
  const { data, error } = await supabase
    .from(table)
    .select(select)
    .eq("user_id", userId)
    .gte("date", startYmd)
    .lte("date", endYmd);
  if (error) throw error;
  const map = new Map<string, number>();
  for (const row of data ?? []) {
    const rec = row as unknown as Record<string, unknown>;
    if (opts?.includeRow && !opts.includeRow(rec)) continue;
    bump(map, String(rec.date ?? ""));
  }
  return map;
}

function mergeCountMaps(maps: Map<string, number>[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const map of maps) {
    for (const [k, v] of map) bump(out, k, v);
  }
  return out;
}

/**
 * Daily entry counts for the chosen period + filter (oldest → newest).
 * Empty days are 0 — gaps are intentional.
 */
export async function fetchTrendsDayPoints(
  userId: string,
  period: TrendsPeriod,
  filter: TrendsFilterId,
): Promise<TrendsDayPoint[]> {
  const dayCount = trendsPeriodDayCount(period);
  const end = new Date();
  end.setHours(0, 0, 0, 0);
  const start = addDays(end, -(dayCount - 1));
  const startYmd = toYmd(start);
  const endYmd = toYmd(end);
  const startIso = `${startYmd}T00:00:00`;
  const endExclusive = addDays(end, 1);
  const endExclusiveIso = `${toYmd(endExclusive)}T00:00:00`;
  const base = emptyDaySeries(start, dayCount);

  const need = (id: TrendsFilterId) => filter === "all" || filter === id;

  const jobs: Promise<Map<string, number>>[] = [];

  if (need("symptoms")) {
    jobs.push(fetchIsoDayCounts(TABLES.LOG_SYMPTOMS, userId, "created_at", startIso, endExclusiveIso));
  }
  if (need("trackMeds")) {
    jobs.push(fetchIsoDayCounts(TABLES.LOG_MEDICATIONS, userId, "created_at", startIso, endExclusiveIso));
  }
  if (need("wellbeing")) {
    jobs.push(fetchDateOnlyCounts(TABLES.DAILY_WELLBEING, userId, startYmd, endYmd));
  }
  if (need("hydration")) {
    jobs.push(
      fetchDateOnlyCounts(TABLES.DAILY_HYDRATION, userId, startYmd, endYmd, {
        select: "date,glasses",
        includeRow: (row) => Number(row.glasses) > 0,
      }),
    );
  }
  if (need("bowel")) {
    jobs.push(fetchIsoDayCounts(TABLES.BOWEL_MOVEMENTS, userId, "occurred_at", startIso, endExclusiveIso));
  }
  if (need("weight")) {
    jobs.push(fetchDateOnlyCounts(TABLES.TRACK_WEIGHT, userId, startYmd, endYmd));
  }
  if (need("intake")) {
    jobs.push(fetchIsoDayCounts(TABLES.TRACK_INTAKE, userId, "occurred_at", startIso, endExclusiveIso));
  }
  if (need("output")) {
    jobs.push(fetchIsoDayCounts(TABLES.TRACK_OUTPUT, userId, "occurred_at", startIso, endExclusiveIso));
  }

  const maps = await Promise.all(jobs);
  return applyCounts(base, mergeCountMaps(maps));
}

export function totalTrendsEntries(points: TrendsDayPoint[]): number {
  return points.reduce((acc, p) => acc + p.count, 0);
}

export function averageTrendsPerDay(points: TrendsDayPoint[]): number {
  if (points.length === 0) return 0;
  return Math.round((totalTrendsEntries(points) / points.length) * 10) / 10;
}

/** Nice Y-axis max so charts aren’t stuck on a huge empty scale. */
export function trendsChartYMax(points: TrendsDayPoint[]): number {
  const peak = points.reduce((m, p) => Math.max(m, p.count), 0);
  if (peak <= 0) return 4;
  if (peak <= 4) return 4;
  if (peak <= 6) return 6;
  if (peak <= 8) return 8;
  if (peak <= 10) return 10;
  return Math.ceil(peak / 5) * 5;
}
