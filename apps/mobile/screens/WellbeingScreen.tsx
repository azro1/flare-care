import { useFocusEffect, useNavigation } from "@react-navigation/native";
import React, { useCallback, useMemo, useRef } from "react";
import { InteractionManager, View } from "react-native";
import { showFlareAlert } from "../components/FlareAlertHost";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  LogHistoryCard,
  LogHistoryListLoading,
  LogHistoryEmptyState,
  LogHistoryPreviewList,
  LOG_HISTORY_LOAD_MORE_BATCH,
  buildTimestampLogRowItem,
  logHistoryCardStyles,
  LogHistoryListQuietPlaceholder,
} from "../components/LogHistoryList";
import { ConfirmModal } from "../components/ConfirmModal";
import { InstructionScreenShell } from "../components/InstructionScreenShell";
import { invalidateDashboardSnapshot } from "../lib/dashboardSnapshotCache";
import { recordRecentActivityEvent } from "../lib/recentActivityEvents";
import { useLogListSelection } from "../lib/useLogListSelection";
import { usePaginatedLogList } from "../lib/paginatedLogList";
import { useDeferredListLoading } from "../lib/useDeferredListLoading";
import { formatUkDate } from "../lib/formatUkDate";
import { bottomTabBarHeight } from "../lib/layoutConstants";
import {
  WELLBEING_ICON,
  WELLBEING_LOG_TITLE,
  deleteWellbeingEntriesForUser,
  getWellbeingListCache,
  invalidateWellbeingListCache,
  setWellbeingListCache,
  type WellbeingRow,
} from "../lib/wellbeingShared";
import { TABLES } from "../lib/supabase";

type SessionUser = { id: string };

export function WellbeingScreen({ user }: { user: SessionUser }) {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const bottomBarClearance = bottomTabBarHeight(insets.bottom);

  const {
    rows: historyRows,
    totalCount: historyTotalCount,
    visibleCount: historyVisibleCount,
    loading: historyLoading,
    loadingMore: historyLoadingMore,
    hasMore: historyHasMore,
    loadMore: loadMoreHistory,
    refresh: refreshHistoryLoad,
    syncExpandedFromCache,
  } = usePaginatedLogList<WellbeingRow>({
    userId: user.id,
    table: TABLES.DAILY_WELLBEING,
    select: "*",
    orderColumn: "date",
    ascending: false,
    initialVisible: LOG_HISTORY_LOAD_MORE_BATCH,
    cache: {
      get: getWellbeingListCache,
      set: setWellbeingListCache,
    },
  });

  const itemIds = useMemo(() => historyRows.map((r) => String(r.id)), [historyRows]);
  const {
    selectionMode,
    selectedIds,
    bulkDeleteOpen,
    setBulkDeleteOpen,
    bulkDeleting,
    enterSelectionWith,
    toggleSelect,
    runBulkDelete,
  } = useLogListSelection({
    routeName: "Wellbeing",
    itemIds,
    navigation,
    headerTitle: "History",
  });

  const handleBulkDeleteConfirm = useCallback(() => {
    void runBulkDelete(async (ids) => {
      try {
        await deleteWellbeingEntriesForUser(user.id, ids);
        await recordRecentActivityEvent(user.id, "wellbeing-deleted");
        invalidateDashboardSnapshot(user.id);
        invalidateWellbeingListCache(user.id);
        await refreshHistoryLoad();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Could not delete these entries.";
        showFlareAlert("Could not delete", message);
        throw err;
      }
    });
  }, [refreshHistoryLoad, runBulkDelete, user.id]);

  const refreshRef = useRef(refreshHistoryLoad);
  refreshRef.current = refreshHistoryLoad;
  const syncRef = useRef(syncExpandedFromCache);
  syncRef.current = syncExpandedFromCache;

  useFocusEffect(
    useCallback(() => {
      syncRef.current();
      const task = InteractionManager.runAfterInteractions(() => {
        void refreshRef.current();
      });
      return () => task.cancel();
    }, []),
  );

  const listInitialLoad = historyLoading && historyRows.length === 0;
  const showListLoading = useDeferredListLoading(listInitialLoad);
  const historyEmpty = !historyLoading && historyTotalCount === 0;
  const scrollBottomPadTotal = bottomBarClearance;

  return (
    <InstructionScreenShell
      showInstruction={false}
      contentPaddingBottom={scrollBottomPadTotal}
      instruction={null}
      footer={
        <ConfirmModal
          visible={bulkDeleteOpen}
          title={
            selectedIds.size === 1
              ? "Delete wellbeing entry?"
              : `Delete ${selectedIds.size} wellbeing entries?`
          }
          message="This action cannot be undone."
          confirmLabel={bulkDeleting ? "Deleting…" : "Delete"}
          confirmDestructive
          onConfirm={handleBulkDeleteConfirm}
          onCancel={() => setBulkDeleteOpen(false)}
        />
      }
    >
      <LogHistoryCard>
        <View style={logHistoryCardStyles.trackerCardBody}>
          {showListLoading ? (
            <LogHistoryListLoading />
          ) : listInitialLoad ? (
            <LogHistoryListQuietPlaceholder />
          ) : historyEmpty ? (
            <LogHistoryEmptyState icon={WELLBEING_ICON} />
          ) : (
            <LogHistoryPreviewList
              items={historyRows.map((row) =>
                buildTimestampLogRowItem({
                  id: String(row.id),
                  title: WELLBEING_LOG_TITLE,
                  whenIso: row.created_at,
                  accessibilityLabel: `${WELLBEING_LOG_TITLE}, ${formatUkDate(row.date)}. View details`,
                }),
              )}
              visibleCount={historyVisibleCount}
              hasMore={historyHasMore}
              loadingMore={historyLoadingMore}
              loadMoreLabel="load more"
              onLoadMore={() => void loadMoreHistory()}
              rowTextLayout="default"
              onPressItem={(logId) => navigation.navigate("WellbeingLogDetail", { id: logId })}
              selectionMode={selectionMode}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
              onLongPressItem={enterSelectionWith}
            />
          )}
        </View>
      </LogHistoryCard>
    </InstructionScreenShell>
  );
}
