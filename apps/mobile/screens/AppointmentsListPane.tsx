import { FLARE_CHROME_LUCIDE, FlareLucideIcon } from "../lib/flareLucideIcons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { showFlareAlert } from "../components/FlareAlertHost";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ConfirmModal } from "../components/ConfirmModal";
import { InstructionScreenShell } from "../components/InstructionScreenShell";
import {
  LogHistoryCard,
  LogHistoryListLoading,
  LogHistoryEmptyState,
  LogHistoryPreviewList,
  LOG_HISTORY_LOAD_MORE_BATCH,
  logHistoryCardStyles,
  logHistoryListStyles,
  LogHistoryListQuietPlaceholder,
  type LogHistoryListItem,
} from "../components/LogHistoryList";
import { TrackerThumbFab, useTrackerThumbFabLayout } from "../components/TrackerThumbFab";
import { WriggleReminderBell } from "../components/WriggleReminderBell";
import { invalidateDashboardSnapshot } from "../lib/dashboardSnapshotCache";
import { recordRecentActivityEvent } from "../lib/recentActivityEvents";
import { useLogListSelection } from "../lib/useLogListSelection";
import { type AppointmentsListState } from "../lib/useAppointmentsList";
import { formatUkDateShort } from "../lib/formatUkDate";
import { rescheduleAppointmentNotificationsForUser } from "../lib/medicationNotifications";
import { invalidateAllAppointmentCaches } from "../lib/appointmentCaches";
import { useDeferredListLoading } from "../lib/useDeferredListLoading";
import {
  APPOINTMENTS_FEATURE_ICON,
  appointmentHasReminder,
  deleteAppointmentsForUser,
  getApptsListExpandedCount,
  reminderLabelFromMinutes,
  reminderListLabelFromMinutes,
  setApptsListExpandedCount,
  splitAppointmentsByTab,
  type AppointmentsTab,
} from "../lib/appointmentShared";
import {
  FLARE_FONT_FAMILY,
  FLARE_FONT_SIZE,
  NAV_ROW_CHEVRON_SIZE,
  bottomTabBarHeight,
} from "../lib/layoutConstants";
import { useFlareColors } from "../theme";

type SessionUser = { id: string };

async function maybeRescheduleAppointmentReminders(userId: string) {
  try {
    await rescheduleAppointmentNotificationsForUser(userId);
  } catch {
    // non-fatal
  }
}

export function AppointmentsListPane({
  user,
  tab,
  showFab,
  onAddPress,
  selectionRouteName,
  headerTitle,
  renderIdleHeaderRight,
  onSummaryPress,
  list,
  /** When true, only the list (+ delete modal) — parent owns shell / FAB / tabs. */
  embedded = false,
  onSelectionModeChange,
}: {
  user: SessionUser;
  tab: AppointmentsTab;
  showFab: boolean;
  onAddPress?: () => void;
  selectionRouteName: string;
  headerTitle: string | (() => React.ReactNode);
  renderIdleHeaderRight?: () => React.ReactNode;
  onSummaryPress?: () => void;
  list: AppointmentsListState;
  embedded?: boolean;
  onSelectionModeChange?: (selectionMode: boolean) => void;
}) {
  const c = useFlareColors();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const tabBarClearance = bottomTabBarHeight(insets.bottom);
  const { scrollBottomPad } = useTrackerThumbFabLayout(showFab ? tabBarClearance : 0);
  const scrollBottomPadTotal = showFab ? scrollBottomPad : Math.max(insets.bottom, 16) + 24;

  const { appointments, loading, load } = list;
  const [expandedCount, setExpandedCount] = useState(() => getApptsListExpandedCount(user.id, tab));

  const { upcoming, past } = useMemo(() => splitAppointmentsByTab(appointments), [appointments]);
  const visibleRows = tab === "upcoming" ? upcoming : past;

  useFocusEffect(
    useCallback(() => {
      setExpandedCount(getApptsListExpandedCount(user.id, tab));
    }, [tab, user.id]),
  );

  const visibleCount = useMemo(() => {
    if (visibleRows.length === 0) return LOG_HISTORY_LOAD_MORE_BATCH;
    if (visibleRows.length <= LOG_HISTORY_LOAD_MORE_BATCH) return visibleRows.length;
    return Math.min(expandedCount, visibleRows.length);
  }, [expandedCount, visibleRows.length]);

  const hasMore = visibleRows.length > visibleCount;

  const loadMore = useCallback(() => {
    setExpandedCount((count) => {
      const next = Math.min(count + LOG_HISTORY_LOAD_MORE_BATCH, visibleRows.length);
      setApptsListExpandedCount(user.id, tab, next);
      return next;
    });
  }, [tab, user.id, visibleRows.length]);

  const aptListItems: LogHistoryListItem[] = useMemo(
    () =>
      visibleRows.map((row) => {
        const dateLine = [formatUkDateShort(row.date), row.time?.trim()].filter(Boolean).join(" · ");
        const title = row.type?.trim() || "Appointment";
        const reminderLabel = appointmentHasReminder(row)
          ? reminderLabelFromMinutes(row.reminder_minutes_before)
          : null;
        return {
          id: String(row.id),
          title,
          subtitle: dateLine,
          accessibilityLabel: reminderLabel
            ? `${title}. ${dateLine}. Reminder ${reminderLabel}. View details`
            : `${title}. ${dateLine}. View details`,
        };
      }),
    [visibleRows],
  );

  const aptById = useCallback((id: string) => visibleRows.find((row) => String(row.id) === id), [visibleRows]);

  const renderAptSubtitle = useCallback(
    (item: LogHistoryListItem) => {
      const row = aptById(item.id);
      if (!row) return null;
      const dateLine = [formatUkDateShort(row.date), row.time?.trim()].filter(Boolean).join(" · ");
      const hasReminder = appointmentHasReminder(row);
      const reminderLabel = hasReminder ? reminderListLabelFromMinutes(row.reminder_minutes_before) : null;
      if (!dateLine && !reminderLabel) return null;
      const subtitleTextStyle = [logHistoryListStyles.logSecondaryWhen, { color: c.textMuted }];
      return (
        <View style={styles.aptSubtitleRow}>
          {dateLine ? (
            <Text style={subtitleTextStyle} numberOfLines={1}>
              {dateLine}
              {reminderLabel ? " · " : ""}
            </Text>
          ) : null}
          {reminderLabel ? (
            <View style={styles.aptReminderRow}>
              <WriggleReminderBell color={c.textMuted} />
              <Text style={subtitleTextStyle} numberOfLines={1}>
                {reminderLabel}
              </Text>
            </View>
          ) : null}
        </View>
      );
    },
    [aptById, c.textMuted],
  );

  const aptItemIds = useMemo(() => visibleRows.map((row) => String(row.id)), [visibleRows]);
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
    routeName: selectionRouteName,
    itemIds: aptItemIds,
    navigation,
    headerTitle,
    renderIdleHeaderRight,
  });

  useEffect(() => {
    onSelectionModeChange?.(selectionMode);
  }, [onSelectionModeChange, selectionMode]);

  const handleBulkDeleteConfirm = useCallback(() => {
    void runBulkDelete(async (ids) => {
      try {
        await deleteAppointmentsForUser(user.id, ids);
        await recordRecentActivityEvent(user.id, "appointment-deleted");
        invalidateDashboardSnapshot(user.id);
        invalidateAllAppointmentCaches(user.id);
        await load();
        await maybeRescheduleAppointmentReminders(user.id);
      } catch (err: unknown) {
        showFlareAlert("Could not delete", err instanceof Error ? err.message : "Something went wrong.");
        throw err;
      }
    });
  }, [load, runBulkDelete, user.id]);

  const listInitialLoad = loading && appointments.length === 0;
  const showListLoading = useDeferredListLoading(listInitialLoad);
  const listEmpty = !loading && visibleRows.length === 0;

  const listBody = (
    <>
      <LogHistoryCard>
        <View style={logHistoryCardStyles.trackerCardBody}>
          {showListLoading ? (
            <LogHistoryListLoading />
          ) : listInitialLoad ? (
            <LogHistoryListQuietPlaceholder />
          ) : listEmpty ? (
            <LogHistoryEmptyState icon={APPOINTMENTS_FEATURE_ICON} />
          ) : (
            <LogHistoryPreviewList
              items={aptListItems}
              visibleCount={visibleCount}
              hasMore={hasMore}
              loadMoreLabel="load more"
              onLoadMore={loadMore}
              rowTextLayout="default"
              renderSubtitle={renderAptSubtitle}
              onPressItem={(aptId) => navigation.navigate("AppointmentDetail", { id: aptId })}
              selectionMode={selectionMode}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
              onLongPressItem={enterSelectionWith}
            />
          )}
        </View>
      </LogHistoryCard>

      {onSummaryPress && !selectionMode ? (
        <View style={styles.summaryBlock}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Appointment Summary"
            onPress={onSummaryPress}
            style={({ pressed }) => [styles.summaryLink, pressed && { opacity: 0.85 }]}
          >
            <Text style={[styles.summaryLinkLabel, { color: c.text }]}>Appointment Summary</Text>
            <FlareLucideIcon icon={FLARE_CHROME_LUCIDE.forward} size={NAV_ROW_CHEVRON_SIZE} color={c.textMuted} />
          </Pressable>
        </View>
      ) : null}
    </>
  );

  const deleteModal = (
    <ConfirmModal
      visible={bulkDeleteOpen}
      title={selectedIds.size === 1 ? "Delete appointment?" : `Delete ${selectedIds.size} appointments?`}
      message="This appointment will be removed. This action cannot be undone."
      confirmLabel={bulkDeleting ? "Deleting…" : "Delete"}
      confirmDestructive
      onConfirm={handleBulkDeleteConfirm}
      onCancel={() => setBulkDeleteOpen(false)}
    />
  );

  if (embedded) {
    return (
      <>
        {listBody}
        {deleteModal}
      </>
    );
  }

  return (
    <InstructionScreenShell
      showInstruction={false}
      contentPaddingBottom={scrollBottomPadTotal}
      instruction={null}
      floatingAction={
        showFab && !selectionMode && onAddPress ? (
          <TrackerThumbFab accessibilityLabel="Add appointment" onPress={onAddPress} tabBarClearance={tabBarClearance} />
        ) : null
      }
      footer={deleteModal}
    >
      {listBody}
    </InstructionScreenShell>
  );
}

const styles = StyleSheet.create({
  aptSubtitleRow: { flexDirection: "row", alignItems: "center", flexShrink: 1, minWidth: 0 },
  aptReminderRow: { flexDirection: "row", alignItems: "center", gap: 4, flexShrink: 1, minWidth: 0 },
  summaryBlock: {
    alignItems: "center",
    marginTop: 12,
    paddingHorizontal: 24,
  },
  summaryLink: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    gap: 4,
    paddingVertical: 8,
  },
  summaryLinkLabel: {
    fontSize: FLARE_FONT_SIZE.subhead,
    fontFamily: FLARE_FONT_FAMILY.regular,
  },
});
