import { SCREEN_EDGE_PADDING } from "./layoutConstants";

/** Horizontal news shelf on dashboard — cards loaded in the swipe row. */
export const DASHBOARD_NEWS_HOME_SHELF_MAX = 5;

/** Option C home shelf — cards in the swipe row before See all. */
export const DASHBOARD_NEWS_SHELF_PEEK = 3;

/** Shelf card width as a fraction of the scroll content area (peek the next card). */
export const DASHBOARD_NEWS_SHELF_CARD_WIDTH_RATIO = 0.78;

export function dashboardNewsShelfCardWidth(windowWidth: number): number {
  const contentWidth = windowWidth - SCREEN_EDGE_PADDING * 2;
  return Math.floor(contentWidth * DASHBOARD_NEWS_SHELF_CARD_WIDTH_RATIO);
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
