import { useCallback, useMemo, useRef, useState } from "react";
import { supabase } from "./supabase";
import {
  LOG_HISTORY_LOAD_MORE_BATCH,
  LOG_HISTORY_RECENT_PREVIEW_COUNT,
} from "../components/LogHistoryList";

const DEFAULT_FETCH_PAGE_SIZE = 20;

export type PaginatedLogListCacheSnapshot<T> = {
  rows: T[];
  totalCount: number;
  visibleCount: number;
};

export type PaginatedLogListCache<T> = {
  get: (userId: string) => PaginatedLogListCacheSnapshot<T> | undefined;
  set: (userId: string, snapshot: PaginatedLogListCacheSnapshot<T>) => void;
};

export type UsePaginatedLogListOptions<T> = {
  userId: string;
  table: string;
  select?: string;
  orderColumn?: string;
  ascending?: boolean;
  initialVisible?: number;
  loadMoreBatch?: number;
  fetchPageSize?: number;
  cache?: PaginatedLogListCache<T>;
};

/** How many rows to show — derived on every render so "load more" never flashes after add/save. */
export function resolvePaginatedVisibleCount(
  total: number,
  expanded: number,
  initialVisible: number,
): number {
  if (total === 0) return initialVisible;
  if (total <= initialVisible) return total;
  return Math.min(expanded, total);
}

export function usePaginatedLogList<T>({
  userId,
  table,
  select = "id,created_at",
  orderColumn = "created_at",
  ascending = false,
  initialVisible = LOG_HISTORY_RECENT_PREVIEW_COUNT,
  loadMoreBatch = LOG_HISTORY_LOAD_MORE_BATCH,
  fetchPageSize = DEFAULT_FETCH_PAGE_SIZE,
  cache,
}: UsePaginatedLogListOptions<T>) {
  const cachedSnapshot = cache?.get(userId);
  const [rows, setRows] = useState<T[]>(() => cachedSnapshot?.rows ?? []);
  const [totalCount, setTotalCount] = useState(() => cachedSnapshot?.totalCount ?? 0);
  const [expandedCount, setExpandedCount] = useState(() => cachedSnapshot?.visibleCount ?? initialVisible);
  const [loading, setLoading] = useState(() => (cache ? cachedSnapshot === undefined : true));
  const [loadingMore, setLoadingMore] = useState(false);
  const expandedCountRef = useRef(expandedCount);
  expandedCountRef.current = expandedCount;
  const refreshInFlightRef = useRef(false);

  const visibleCount = useMemo(
    () => resolvePaginatedVisibleCount(totalCount, expandedCount, initialVisible),
    [totalCount, expandedCount, initialVisible],
  );

  const hasMore = totalCount > visibleCount;

  const persistCache = useCallback(
    (snapshot: PaginatedLogListCacheSnapshot<T>) => {
      cache?.set(userId, snapshot);
    },
    [cache, userId],
  );

  const loadInitial = useCallback(async () => {
    setLoading(true);
    try {
      const [{ count }, { data }] = await Promise.all([
        supabase.from(table).select("id", { count: "exact", head: true }).eq("user_id", userId),
        supabase
          .from(table)
          .select(select)
          .eq("user_id", userId)
          .order(orderColumn, { ascending })
          .range(0, fetchPageSize - 1),
      ]);
      const total = count ?? 0;
      const nextRows = (data ?? []) as T[];
      setTotalCount(total);
      setRows(nextRows);
      setExpandedCount(initialVisible);
      persistCache({ rows: nextRows, totalCount: total, visibleCount: initialVisible });
    } finally {
      setLoading(false);
    }
  }, [
    ascending,
    fetchPageSize,
    initialVisible,
    orderColumn,
    persistCache,
    select,
    table,
    userId,
  ]);

  /** Refetch list on focus — silent; keeps how many rows the user already expanded (e.g. after detail → back). */
  const refresh = useCallback(async () => {
    if (refreshInFlightRef.current) return;
    refreshInFlightRef.current = true;
    try {
      const cached = cache?.get(userId);
      if (cached?.visibleCount != null) {
        expandedCountRef.current = cached.visibleCount;
        setExpandedCount(cached.visibleCount);
      }

      const { count } = await supabase
        .from(table)
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId);
      const total = count ?? 0;
      setTotalCount(total);

      const nextExpanded =
        total <= initialVisible
          ? initialVisible
          : Math.min(Math.max(expandedCountRef.current, initialVisible), total);
      const nextVisible = resolvePaginatedVisibleCount(total, nextExpanded, initialVisible);
      const fetchCount = Math.max(fetchPageSize, nextVisible);
      const { data } = await supabase
        .from(table)
        .select(select)
        .eq("user_id", userId)
        .order(orderColumn, { ascending })
        .range(0, fetchCount - 1);

      const nextRows = (data ?? []) as T[];
      setRows(nextRows);
      setExpandedCount(nextExpanded);
      persistCache({ rows: nextRows, totalCount: total, visibleCount: nextExpanded });
    } finally {
      refreshInFlightRef.current = false;
      setLoading(false);
    }
  }, [ascending, fetchPageSize, initialVisible, orderColumn, persistCache, select, table, userId]);

  const loadMore = useCallback(async () => {
    const nextExpanded = Math.min(expandedCount + loadMoreBatch, totalCount);
    if (nextExpanded <= expandedCount) return;

    if (nextExpanded > rows.length && rows.length < totalCount) {
      setLoadingMore(true);
      try {
        const from = rows.length;
        const to = from + fetchPageSize - 1;
        const { data } = await supabase
          .from(table)
          .select(select)
          .eq("user_id", userId)
          .order(orderColumn, { ascending })
          .range(from, to);
        setRows((prev) => {
          const nextRows = [...prev, ...((data ?? []) as T[])];
          persistCache({ rows: nextRows, totalCount, visibleCount: nextExpanded });
          return nextRows;
        });
      } finally {
        setLoadingMore(false);
      }
    } else {
      persistCache({ rows, totalCount, visibleCount: nextExpanded });
    }
    setExpandedCount(nextExpanded);
  }, [
    ascending,
    expandedCount,
    fetchPageSize,
    loadMoreBatch,
    orderColumn,
    persistCache,
    rows,
    select,
    table,
    totalCount,
    userId,
  ]);

  const resetAndLoad = useCallback(() => {
    void loadInitial();
  }, [loadInitial]);

  const syncExpandedFromCache = useCallback(() => {
    const cached = cache?.get(userId);
    if (cached?.visibleCount == null) return;
    if (cached.visibleCount === expandedCountRef.current) return;
    expandedCountRef.current = cached.visibleCount;
    setExpandedCount(cached.visibleCount);
  }, [cache, userId]);

  return {
    rows,
    totalCount,
    visibleCount,
    loading,
    loadingMore,
    loadMore,
    resetAndLoad,
    refresh,
    syncExpandedFromCache,
    hasMore,
  };
}
