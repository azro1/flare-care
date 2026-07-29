import { useFocusEffect, useNavigation } from "@react-navigation/native";
import React, { useCallback, useMemo, useRef } from "react";
import { Alert, InteractionManager, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  LogHistoryCard,
  LogHistoryListLoading,
  LogHistoryEmptyState,
  LogHistoryPreviewList,
  LOG_HISTORY_LOAD_MORE_BATCH,
  buildTimestampLogRowItem,
  logHistoryCardStyles,
} from "../components/LogHistoryList";
import { ConfirmModal } from "../components/ConfirmModal";
import { FloatingWelcomeCard } from "../components/FloatingWelcomeCard";
import { InstructionScreenShell } from "../components/InstructionScreenShell";
import { TrackerThumbFab, useTrackerThumbFabLayout } from "../components/TrackerThumbFab";
import { invalidateDashboardSnapshot } from "../lib/dashboardSnapshotCache";
import { recordRecentActivityEvent } from "../lib/recentActivityEvents";
import { useLogListSelection } from "../lib/useLogListSelection";
import { usePaginatedLogList } from "../lib/paginatedLogList";
import { formatUkDate } from "../lib/formatUkDate";
import { bottomTabBarHeight } from "../lib/layoutConstants";
import {
  WELLBEING_MCI_ICON,
  deleteWellbeingEntriesForUser,
  formatWellbeingDate,
  getWellbeingListCache,
  invalidateWellbeingListCache,
  setWellbeingListCache,
  type WellbeingRow,
} from "../lib/wellbeingShared";
import { WELLBEING_INSTRUCTION } from "../lib/instructionCardCopy";
import {
  markWellbeingInstructionDismissed,
  readWellbeingInstructionDismissed,
  readWellbeingInstructionEligible,
} from "../lib/wellbeingInstructionTip";
import { useInstructionTip } from "../lib/useInstructionTip";
import { TABLES } from "../lib/supabase";

type SessionUser = { id: string };

export function WellbeingScreen({ user }: { user: SessionUser }) {
  const navigation = useNavigation<any>();
  const { visible: showInstruction, dismiss: dismissInstruction } = useInstructionTip(
    user.id,
    readWellbeingInstructionEligible,
    readWellbeingInstructionDismissed,
    markWellbeingInstructionDismissed,
  );
  const insets = useSafeAreaInsets();
  const { scrollBottomPad } = useTrackerThumbFabLayout();
  const selectionBarClearance = bottomTabBarHeight(insets.bottom);

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
    headerTitle: "My Wellbeing",
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
        Alert.alert("Could not delete", message);
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
  const historyEmpty = !historyLoading && historyTotalCount === 0;
  const scrollBottomPadTotal = selectionMode ? selectionBarClearance : scrollBottomPad;

  return (
    <InstructionScreenShell
      showInstruction={showInstruction}
      contentPaddingBottom={scrollBottomPadTotal}
      instruction={
        <FloatingWelcomeCard
          instruction={WELLBEING_INSTRUCTION}
          icon={WELLBEING_MCI_ICON}
          onDismiss={dismissInstruction}
          dismissAccessibilityLabel="Dismiss My Wellbeing guide"
        />
      }
      floatingAction={
        !selectionMode ? (
          <TrackerThumbFab
            accessibilityLabel="Log my wellbeing"
            onPress={() => navigation.navigate("WellbeingWizard")}
          />
        ) : null
      }
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
          {listInitialLoad ? (
            <LogHistoryListLoading />
          ) : historyEmpty ? (
            <LogHistoryEmptyState icon={WELLBEING_MCI_ICON} iconFamily="mci" />
          ) : (
            <LogHistoryPreviewList
              items={historyRows.map((row) =>
                buildTimestampLogRowItem({
                  id: String(row.id),
                  title: formatWellbeingDate(row.date),
                  whenIso: row.created_at,
                  accessibilityLabel: `${formatUkDate(row.date)}. View details`,
                }),
              )}
              visibleCount={historyVisibleCount}
              hasMore={historyHasMore}
              loadingMore={historyLoadingMore}
              loadMoreLabel="load more"
              onLoadMore={() => void loadMoreHistory()}
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
