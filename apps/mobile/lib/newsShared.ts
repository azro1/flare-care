import { SCREEN_EDGE_PADDING } from "./layoutConstants";
import { dedupeNewsItems, type DashboardNewsItem } from "./dashboardSnapshotCache";

/** Horizontal news shelf on dashboard — cards loaded in the swipe row. */
export const DASHBOARD_NEWS_HOME_SHELF_MAX = 5;

/** Home shelf — preview cards before See all. */
export const DASHBOARD_NEWS_SHELF_PEEK = 3;

/** Shelf card width as a fraction of the scroll content area (peek the next card). */
export const DASHBOARD_NEWS_SHELF_CARD_WIDTH_RATIO = 0.78;

export function dashboardNewsShelfCardWidth(windowWidth: number): number {
  const contentWidth = windowWidth - SCREEN_EDGE_PADDING * 2;
  return Math.floor(contentWidth * DASHBOARD_NEWS_SHELF_CARD_WIDTH_RATIO);
}

export function newsApiBase(): string {
  return (
    process.env.EXPO_PUBLIC_API_BASE_URL ||
    (process.env.EXPO_PUBLIC_SUPABASE_URL ? `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1` : "") ||
    process.env.EXPO_PUBLIC_WEB_API_BASE_URL ||
    ""
  );
}

export function mapNewsItems(raw: unknown): DashboardNewsItem[] {
  const list = Array.isArray((raw as { items?: unknown })?.items)
    ? (raw as { items: unknown[] }).items
    : Array.isArray(raw)
      ? raw
      : [];
  return dedupeNewsItems(
    list.map((item: any) => ({
      title: String(item?.headline || item?.title || "Untitled"),
      source: String(item?.source || item?.sourceName || "Source"),
      publishedAt: item?.pubDate || item?.publishedAt || item?.date || undefined,
      link: item?.link || item?.url || undefined,
      imageUrl: item?.imageUrl || item?.image || item?.thumbnail || null,
    })),
  );
}

/** Match web /api/image-proxy for production https; on LAN load https images directly. */
export function resolveNewsImageUri(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const webBase = (process.env.EXPO_PUBLIC_WEB_API_BASE_URL || "").replace(/\/$/, "");
  const webIsHttps = webBase.startsWith("https://");
  const imageIsHttps = /^https:\/\//i.test(trimmed);
  if (webBase && webIsHttps) {
    return `${webBase}/api/image-proxy?url=${encodeURIComponent(trimmed)}`;
  }
  if (webBase && !webIsHttps && !imageIsHttps) {
    return `${webBase}/api/image-proxy?url=${encodeURIComponent(trimmed)}`;
  }
  return trimmed;
}
