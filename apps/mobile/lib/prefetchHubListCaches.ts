import { getBowelListCache, setBowelListCache } from "./bowelMovementShared";
import { LOG_HISTORY_LOAD_MORE_BATCH, LOG_HISTORY_RECENT_PREVIEW_COUNT } from "./logHistoryConstants";
import {
  fetchMedicationsForUser,
  getMedicationsListCache,
} from "./medicationShared";
import {
  fetchTodayOutputTotals,
  getOutputListCache,
  setOutputListCache,
} from "./outputShared";
import { supabase, TABLES } from "./supabase";
import { getWeightListCache, setWeightListCache } from "./weightShared";
import { getWellbeingListCache, setWellbeingListCache } from "./wellbeingShared";
import {
  getWizardLogHistoryCache,
  setWizardLogHistoryCache,
  type WizardLogHistoryRow,
} from "./wizardLogHistory";

const DEFAULT_FETCH_PAGE_SIZE = 20;

type CacheSetter<T> = (userId: string, snapshot: { rows: T[]; totalCount: number; visibleCount: number }) => void;
type CacheGetter<T> = (userId: string) => { rows: T[]; totalCount: number; visibleCount: number } | undefined;

async function prefetchPaginatedListCache<T>({
  userId,
  table,
  select,
  orderColumn,
  ascending = false,
  getCache,
  setCache,
  initialVisible = LOG_HISTORY_LOAD_MORE_BATCH,
  fetchPageSize = DEFAULT_FETCH_PAGE_SIZE,
}: {
  userId: string;
  table: string;
  select: string;
  orderColumn: string;
  ascending?: boolean;
  getCache: CacheGetter<T>;
  setCache: CacheSetter<T>;
  initialVisible?: number;
  fetchPageSize?: number;
}): Promise<void> {
  if (getCache(userId)) return;

  const [{ count }, { data, error }] = await Promise.all([
    supabase.from(table).select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase
      .from(table)
      .select(select)
      .eq("user_id", userId)
      .order(orderColumn, { ascending })
      .range(0, fetchPageSize - 1),
  ]);
  if (error) throw error;

  setCache(userId, {
    rows: (data ?? []) as T[],
    totalCount: count ?? 0,
    visibleCount: initialVisible,
  });
}

async function prefetchWizardHistoryCache(userId: string, table: string): Promise<void> {
  if (getWizardLogHistoryCache(userId, table)) return;

  const [{ count }, { data, error }] = await Promise.all([
    supabase.from(table).select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase
      .from(table)
      .select("id,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .range(0, DEFAULT_FETCH_PAGE_SIZE - 1),
  ]);
  if (error) throw error;

  setWizardLogHistoryCache(userId, table, {
    rows: (data ?? []) as WizardLogHistoryRow[],
    totalCount: count ?? 0,
    visibleCount: LOG_HISTORY_RECENT_PREVIEW_COUNT,
  });
}

/**
 * Warm in-memory hub list caches while the user is on Dashboard so the first
 * tile open does not flash a loading tray (App Store–style instant land).
 * Appointments + supplies are already warmed by Dashboard priority fetches.
 */
export async function prefetchHubListCaches(userId: string): Promise<void> {
  await Promise.allSettled([
    prefetchPaginatedListCache({
      userId,
      table: TABLES.TRACK_WEIGHT,
      select: "*",
      orderColumn: "date",
      ascending: false,
      getCache: getWeightListCache,
      setCache: setWeightListCache,
    }),
    prefetchPaginatedListCache({
      userId,
      table: TABLES.BOWEL_MOVEMENTS,
      select: "*",
      orderColumn: "created_at",
      ascending: false,
      getCache: getBowelListCache,
      setCache: setBowelListCache,
    }),
    (async () => {
      await prefetchPaginatedListCache({
        userId,
        table: TABLES.TRACK_OUTPUT,
        select: "*",
        orderColumn: "occurred_at",
        ascending: false,
        getCache: getOutputListCache,
        setCache: setOutputListCache,
      });
      try {
        await fetchTodayOutputTotals(userId);
      } catch {
        // today total is best-effort
      }
    })(),
    prefetchPaginatedListCache({
      userId,
      table: TABLES.DAILY_WELLBEING,
      select: "*",
      orderColumn: "date",
      ascending: false,
      getCache: getWellbeingListCache,
      setCache: setWellbeingListCache,
    }),
    (async () => {
      if (getMedicationsListCache(userId) !== undefined) return;
      await fetchMedicationsForUser(userId);
    })(),
    prefetchWizardHistoryCache(userId, TABLES.LOG_SYMPTOMS),
    prefetchWizardHistoryCache(userId, TABLES.LOG_MEDICATIONS),
  ]);
}
