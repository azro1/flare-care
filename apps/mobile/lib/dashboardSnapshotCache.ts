/** In-memory dashboard seed per user — cleared after symptom submit so home refetch shows fresh data. */

export type DashboardActivityRow = { key: string; title: string; ts: number; icon: "symptom" | "medication" | "bowel" | "weight" };

export type DashboardSnapshot = {
  todaySummary: { symptoms: number; medsTaken: number; medsTotal: number; hydration: number };
  recentActivity: DashboardActivityRow[];
  weatherMeta: { city: string; temp: number | null; desc: string; icon?: string | null } | null;
  weather: string;
  newsItems: Array<{ title: string; source: string; publishedAt?: string; link?: string; imageUrl?: string | null }>;
  newsError: string | null;
};

export const dashboardSnapshotByUserId: Record<string, DashboardSnapshot> = {};

export function invalidateDashboardSnapshot(userId: string) {
  delete dashboardSnapshotByUserId[userId];
}
