/** In-memory dashboard seed per user — cleared after symptom submit so home refetch shows fresh data. */

export type DashboardActivityRow = {
  key: string;
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

export type DashboardSnapshot = {
  todaySummary: { symptoms: number; medsTaken: number; medsTotal: number; hydration: number };
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

export function invalidateDashboardSnapshot(userId: string) {
  delete dashboardSnapshotByUserId[userId];
}
