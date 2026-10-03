import { useFocusEffect, useNavigation } from "@react-navigation/native";
import React, { useCallback, useMemo, useRef } from "react";
import { ActivityIndicator, InteractionManager, Pressable, StyleSheet, Text, View } from "react-native";
import { ScrollView } from "../lib/scrollViews";
import { showFlareAlert } from "../components/FlareAlertHost";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Card } from "../components/MidnightLagoonCard";
import { TrayRow } from "../components/MidnightLagoonTray";
import { ScreenHeader } from "../components/MidnightLagoonScreenHeader";
import { ConfirmModal } from "../components/ConfirmModal";
import { FlareLucideIcon, FLARE_FEATURE_LUCIDE } from "../lib/flareLucideIcons";
import { invalidateDashboardSnapshot } from "../lib/dashboardSnapshotCache";
import { recordRecentActivityEvent } from "../lib/recentActivityEvents";
import { useLogListSelection } from "../lib/useLogListSelection";
import { usePaginatedLogList } from "../lib/paginatedLogList";
import { useDeferredListLoading } from "../lib/useDeferredListLoading";
import { formatUkDate } from "../lib/formatUkDate";
import { SPACING, TYPOGRAPHY } from "../designTokens";
import { LOG_HISTORY_LOAD_MORE_BATCH } from "../components/LogHistoryList";
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
import { useFlareColors } from "../theme";

type SessionUser = { id: string };

export function WellbeingScreen({ user }: { user: SessionUser }) {
  const c = useFlareColors();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

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
    headerTitle: "Wellbeing Logs",
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

  return (
    <>
      <View style={[styles.screen, { backgroundColor: c.screen }]}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 16) + 24 }]}
        >
          <ScreenHeader title="Wellbeing Logs" />

          {showListLoading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="small" color={c.primary} />
            </View>
          ) : historyEmpty ? (
            <Card>
              <View style={styles.emptyWrap}>
                <FlareLucideIcon icon={WELLBEING_ICON} size={40} color={c.textSecondary} />
                <Text style={[styles.emptyText, { color: c.textSecondary, fontFamily: TYPOGRAPHY.fontFamily.regular }]}>
                  No wellbeing entries yet.
                </Text>
              </View>
            </Card>
          ) : (
            <>
              <Card noPadding style={{ paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md }}>
                {historyRows.map((row) => {
                  const timestamp = new Date(row.date).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                  });
                  return (
                    <TrayRow
                      key={row.id}
                      icon={FLARE_FEATURE_LUCIDE.wellbeing}
                      label={WELLBEING_LOG_TITLE}
                      value={timestamp}
                      showChevron
                      onPress={() => navigation.navigate("WellbeingLogDetail", { id: String(row.id) })}
                      onLongPress={selectionMode ? undefined : () => enterSelectionWith(String(row.id))}
                    />
                  );
                })}
              </Card>

              {historyHasMore ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => void loadMoreHistory()}
                  style={({ pressed }) => [styles.loadMore, pressed && { opacity: 0.7 }]}
                >
                  <Text style={[styles.loadMoreText, { color: c.primary, fontFamily: TYPOGRAPHY.fontFamily.medium }]}>
                    {historyLoadingMore ? "loading…" : "load more"}
                  </Text>
                </Pressable>
              ) : null}
            </>
          )}
        </ScrollView>
      </View>

      <ConfirmModal
        visible={bulkDeleteOpen}
        title={selectedIds.size === 1 ? "Delete wellbeing entry?" : `Delete ${selectedIds.size} wellbeing entries?`}
        message="This action cannot be undone."
        confirmLabel={bulkDeleting ? "Deleting…" : "Delete"}
        confirmDanger
        onConfirm={handleBulkDeleteConfirm}
        onCancel={() => setBulkDeleteOpen(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: SPACING.screen,
    paddingTop: SPACING.lg,
  },
  loadingWrap: {
    paddingVertical: 24,
    alignItems: "center",
  },
  emptyWrap: {
    alignItems: "center",
    paddingVertical: SPACING.xl,
    gap: SPACING.md,
  },
  emptyText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    textAlign: "center",
  },
  loadMore: {
    paddingVertical: SPACING.md,
    alignItems: "center",
  },
  loadMoreText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
  },
});
