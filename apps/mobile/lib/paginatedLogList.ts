import { useCallback, useState } from "react";
import { supabase } from "./supabase";
import {
  LOG_HISTORY_LOAD_MORE_BATCH,
  LOG_HISTORY_RECENT_PREVIEW_COUNT,
} from "../components/LogHistoryList";

const DEFAULT_FETCH_PAGE_SIZE = 20;

export type UsePaginatedLogListOptions = {
  userId: string;
  table: string;
  select?: string;
  orderColumn?: string;
  ascending?: boolean;
  initialVisible?: number;
  loadMoreBatch?: number;
  fetchPageSize?: number;
};

export function usePaginatedLogList<T>({
  userId,
  table,
  select = "id,created_at",
  orderColumn = "created_at",
  ascending = false,
  initialVisible = LOG_HISTORY_RECENT_PREVIEW_COUNT,
  loadMoreBatch = LOG_HISTORY_LOAD_MORE_BATCH,
  fetchPageSize = DEFAULT_FETCH_PAGE_SIZE,
}: UsePaginatedLogListOptions) {
  const [rows, setRows] = useState<T[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [visibleCount, setVisibleCount] = useState(initialVisible);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

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
      setTotalCount(count ?? 0);
      setRows((data ?? []) as T[]);
      setVisibleCount(initialVisible);
    } finally {
      setLoading(false);
    }
  }, [ascending, fetchPageSize, initialVisible, orderColumn, select, table, userId]);

  /** Refetch list on focus — keeps how many rows the user already expanded (e.g. after detail → back). */
  const refresh = useCallback(async () => {
    setLoading((prevLoading) => prevLoading || rows.length === 0);
    try {
      const { count } = await supabase
        .from(table)
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId);
      const total = count ?? 0;
      setTotalCount(total);

      const nextVisible = Math.min(Math.max(visibleCount, initialVisible), total);
      const fetchCount = Math.max(fetchPageSize, nextVisible);
      const { data } = await supabase
        .from(table)
        .select(select)
        .eq("user_id", userId)
        .order(orderColumn, { ascending })
        .range(0, fetchCount - 1);

      setRows((data ?? []) as T[]);
      setVisibleCount(nextVisible);
    } finally {
      setLoading(false);
    }
  }, [
    ascending,
    fetchPageSize,
    initialVisible,
    orderColumn,
    rows.length,
    select,
    table,
    userId,
    visibleCount,
  ]);

  const loadMore = useCallback(async () => {
    const nextVisible = Math.min(visibleCount + loadMoreBatch, totalCount);
    if (nextVisible <= visibleCount) return;

    if (nextVisible > rows.length && rows.length < totalCount) {
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
        setRows((prev) => [...prev, ...((data ?? []) as T[])]);
      } finally {
        setLoadingMore(false);
      }
    }
    setVisibleCount(nextVisible);
  }, [ascending, fetchPageSize, loadMoreBatch, orderColumn, rows.length, select, table, totalCount, userId, visibleCount]);

  const resetAndLoad = useCallback(() => {
    void loadInitial();
  }, [loadInitial]);

  return {
    rows,
    totalCount,
    visibleCount,
    loading,
    loadingMore,
    loadMore,
    resetAndLoad,
    refresh,
    hasMore: visibleCount < totalCount,
  };
}
