/** In-memory dashboard seed per user — cleared after symptom submit so home refetch shows fresh data. */

import { EMPTY_ACTIVITY_INSIGHT, type ActivityInsight } from "./activityInsights";

export type DashboardActivityRow = {  key: string;
  title: string;
  ts: number;
  icon: "symptom" | "medication" | "bowel" | "weight" | "hydration" | "appointment";
};

export type DashboardNewsItem = {
  title: string;
  source: string;
  publishedAt?: string;
  link?: string;
  imageUrl?: string | null;
};

export type DashboardTodaySummary = {
  symptoms: number;
  medsTaken: number;
  medsTotal: number;
  hydration: number;
  /** True when a daily_wellbeing row exists for today. */
  wellbeingLogged: boolean;
  /** True when a Track Medications (`log_medications`) row exists for today. */
  medicationTrackingLogged: boolean;
};

export const EMPTY_TODAY_SUMMARY: DashboardTodaySummary = {
  symptoms: 0,
  medsTaken: 0,
  medsTotal: 0,
  hydration: 0,
  wellbeingLogged: false,
  medicationTrackingLogged: false,
};

export type DashboardSnapshot = {
  todaySummary: DashboardTodaySummary;
  activityInsight: ActivityInsight;
  weatherMeta: { city: string; temp: number | null; desc: string; icon?: string | null } | null;
  weather: string;
  newsItems: DashboardNewsItem[];
  newsError: string | null;
};

function normalizeNewsTitle(title: string): string {
  return title
    .replace(/\s*-\s*(?:MedlinePlus|ScienceDaily|Medical Xpress).*$/i, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function normalizeNewsLink(link: string): string {
  try {
    const u = new URL(link.trim());
    u.hash = "";
    for (const param of ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"]) {
      u.searchParams.delete(param);
    }
    return u.toString().replace(/\/$/, "").toLowerCase();
  } catch {
    return link.trim().toLowerCase().replace(/\/$/, "");
  }
}

/** Drop duplicate stories (same URL or same headline from multiple feeds). */
export function dedupeNewsItems(items: DashboardNewsItem[]): DashboardNewsItem[] {
  const seenLinks = new Set<string>();
  const seenTitles = new Set<string>();
  const out: DashboardNewsItem[] = [];
  for (const item of items) {
    const linkKey = item.link ? normalizeNewsLink(item.link) : "";
    const titleKey = normalizeNewsTitle(item.title);
    if (linkKey && seenLinks.has(linkKey)) continue;
    if (seenTitles.has(titleKey)) continue;
    if (linkKey) seenLinks.add(linkKey);
    seenTitles.add(titleKey);
    out.push(item);
  }
  return out;
}

export const dashboardSnapshotByUserId: Record<string, DashboardSnapshot> = {};

/** Logs hub row counts — kept across dashboard invalidate so Logs doesn’t flash “No entries”. */
export type LogsHubPreview = {
  symptomCount: number;
  medicationCount: number;
  wellbeingCount: number;
};

export const logsHubPreviewByUserId: Record<string, LogsHubPreview> = {};

export function setLogsHubPreview(userId: string, preview: LogsHubPreview) {
  logsHubPreviewByUserId[userId] = preview;
}

export function invalidateDashboardSnapshot(userId: string) {
  const prev = dashboardSnapshotByUserId[userId];
  if (!prev) return;
  // Keep weather (and news) — logging a symptom shouldn't blank the greeting while home refetches.
  dashboardSnapshotByUserId[userId] = {
    todaySummary: { ...EMPTY_TODAY_SUMMARY },
    activityInsight: {
      daysLogged: [...EMPTY_ACTIVITY_INSIGHT.daysLogged],
      loggedCount: 0,
    },
    weatherMeta: prev.weatherMeta,
    weather: prev.weather,
    newsItems: prev.newsItems,
    newsError: prev.newsError,
  };
}
