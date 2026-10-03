import { FLARE_CHROME_LUCIDE, FlareLucideIcon, FLARE_FEATURE_LUCIDE } from "../lib/flareLucideIcons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { showFlareAlert } from "../components/FlareAlertHost";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScrollView } from "../lib/scrollViews";
import { ConfirmModal } from "../components/ConfirmModal";
import { Card } from "../components/MidnightLagoonCard";
import { TrayRow } from "../components/MidnightLagoonTray";
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
  reminderListLabelFromMinutes,
  setApptsListExpandedCount,
  splitAppointmentsByTab,
  type AppointmentsTab,
} from "../lib/appointmentShared";
import { SPACING, TYPOGRAPHY } from "../designTokens";
import { useFlareColors } from "../theme";

type SessionUser = { id: string };

const LOAD_MORE_BATCH = 15;

async function maybeRescheduleAppointmentReminders(userId: string) {
  try {
    await rescheduleAppointmentNotificationsForUser(userId);
  } catch {}
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
  embedded = false,
  onSelectionModeChange,
  ownsHeader = true,
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
  ownsHeader?: boolean;
}) {
  const c = useFlareColors();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { fabBottom, fabInsetRight, scrollBottomPad } = useTrackerThumbFabLayout();

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
    if (visibleRows.length === 0) return LOAD_MORE_BATCH;
    if (visibleRows.length <= LOAD_MORE_BATCH) return visibleRows.length;
    return Math.min(expandedCount, visibleRows.length);
  }, [expandedCount, visibleRows.length]);

  const hasMore = visibleRows.length > visibleCount;

  const loadMore = useCallback(() => {
    setExpandedCount((count) => {
      const next = Math.min(count + LOAD_MORE_BATCH, visibleRows.length);
      setApptsListExpandedCount(user.id, tab, next);
      return next;
    });
  }, [tab, user.id, visibleRows.length]);

  const aptListItems = useMemo(() => visibleRows.slice(0, visibleCount), [visibleRows, visibleCount]);
  const aptItemIds = useMemo(() => visibleRows.map((row) => String(row.id)), [visibleRows]);

  const { selectionMode, selectedIds, bulkDeleteOpen, setBulkDeleteOpen, bulkDeleting, enterSelectionWith, toggleSelect, runBulkDelete } = useLogListSelection({
    routeName: selectionRouteName,
    itemIds: aptItemIds,
    navigation,
    headerTitle,
    renderIdleHeaderRight,
    ownsHeader,
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
      {showListLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="small" color={c.primary} />
        </View>
      ) : listEmpty ? (
        <Card>
          <View style={styles.emptyWrap}>
            <FlareLucideIcon icon={APPOINTMENTS_FEATURE_ICON} size={40} color={c.textSecondary} />
            <Text style={[styles.emptyText, { color: c.textSecondary, fontFamily: TYPOGRAPHY.fontFamily.regular }]}>No appointments yet.</Text>
          </View>
        </Card>
      ) : (
        <>
          <Card noPadding style={{ paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md }}>
            {aptListItems.map((row) => {
              const dateLine = [formatUkDateShort(row.date), row.time?.trim()].filter(Boolean).join(" · ");
              const hasReminder = appointmentHasReminder(row);
              const reminderLabel = hasReminder ? reminderListLabelFromMinutes(row.reminder_minutes_before) : null;
              const sublabel = reminderLabel ? `${dateLine} · ${reminderLabel}` : dateLine;
              return (
                <TrayRow
                  key={row.id}
                  icon={FLARE_FEATURE_LUCIDE.appointments}
                  label={row.type?.trim() || "Appointment"}
                  sublabel={sublabel}
                  showChevron
                  onPress={() => navigation.navigate("AppointmentDetail", { id: String(row.id) })}
                  onLongPress={selectionMode ? undefined : () => enterSelectionWith(String(row.id))}
                />
              );
            })}
          </Card>

          {hasMore ? (
            <Pressable accessibilityRole="button" onPress={loadMore} style={({ pressed }) => [styles.loadMore, pressed && { opacity: 0.7 }]}>
              <Text style={[styles.loadMoreText, { color: c.primary, fontFamily: TYPOGRAPHY.fontFamily.medium }]}>load more</Text>
            </Pressable>
          ) : null}
        </>
      )}

      {onSummaryPress && !selectionMode ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Appointment Summary" onPress={onSummaryPress} style={({ pressed }) => [styles.summaryLink, pressed && { opacity: 0.85 }]}>
          <Text style={[styles.summaryLinkText, { color: c.text, fontFamily: TYPOGRAPHY.fontFamily.regular }]}>Appointment Summary</Text>
          <FlareLucideIcon icon={FLARE_CHROME_LUCIDE.forward} size={18} color={c.textSecondary} />
        </Pressable>
      ) : null}

      <ConfirmModal
        visible={bulkDeleteOpen}
        title={selectedIds.size === 1 ? "Delete appointment?" : `Delete ${selectedIds.size} appointments?`}
        message="This appointment will be removed. This action cannot be undone."
        confirmLabel={bulkDeleting ? "Deleting…" : "Delete"}
        confirmDanger
        onConfirm={handleBulkDeleteConfirm}
        onCancel={() => setBulkDeleteOpen(false)}
      />
    </>
  );

  if (embedded) {
    return listBody;
  }

  return listBody;
}

const styles = StyleSheet.create({
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
  summaryLink: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    gap: SPACING.xs,
    paddingVertical: SPACING.md,
    marginTop: SPACING.md,
  },
  summaryLinkText: {
    fontSize: TYPOGRAPHY.fontSize.md,
  },
});
