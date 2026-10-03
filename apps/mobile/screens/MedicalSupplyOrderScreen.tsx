import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import React, { useCallback, useLayoutEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { showFlareAlert } from "../components/FlareAlertHost";
import { PrimaryButton } from "../components/FlareButton";
import { MedicalSupplyItemSheet } from "../components/MedicalSupplyItemSheet";
import {
  LogHistoryCard,
  LogHistoryEmptyState,
  LogHistoryPreviewList,
  logHistoryCardStyles,
  type LogHistoryListItem,
} from "../components/LogHistoryList";
import { FlareLucideIcon, FLARE_FEATURE_LUCIDE } from "../lib/flareLucideIcons";
import { ConfirmModal } from "../components/ConfirmModal";
import { InfoHintButton } from "../components/InfoHintButton";
import { TrackerThumbFab, useTrackerThumbFabLayout } from "../components/TrackerThumbFab";
import { Card } from "../components/MidnightLagoonCard";
import { TrayRow } from "../components/MidnightLagoonTray";
import { ScreenHeader } from "../components/MidnightLagoonScreenHeader";
import { ScrollView } from "../lib/scrollViews";
import { SPACING, TYPOGRAPHY } from "../designTokens";
import { bottomTabBarHeight, LOG_HISTORY_LOAD_MORE_BATCH } from "../lib/layoutConstants";
import { useLogListSelection } from "../lib/useLogListSelection";
import {
  MEDICAL_SUPPLIES_FEATURE_ICON,
  cadenceLabel,
  clearMedicalSupplyKitListCache,
  deleteMedicalSuppliesForUser,
  deleteMedicalSupplyKit,
  emptyMedicalSupplyFormState,
  fetchMedicalSuppliesForKit,
  fetchMedicalSupplyKit,
  getMedicalSupplyKitListCache,
  insertMedicalSupply,
  medicalSupplyFormFromRow,
  normalizeCadenceDays,
  setMedicalSupplyKitListCache,
  supplyDueHeadline,
  supplyDueStatus,
  updateMedicalSupply,
  type MedicalSupplyFormState,
  type MedicalSupplyKitRow,
  type MedicalSupplyRow,
} from "../lib/medicalSuppliesShared";
import { rescheduleSupplyNotificationsForUser } from "../lib/medicationNotifications";
import { formatUkDate } from "../lib/formatUkDate";
import { SUPPLIES_SETUP_STEP_INTRO } from "./MedicalSuppliesSetupScreen";
import { useFlareColors } from "../theme";

type SessionUser = { id: string };

export type MedicalSupplyOrderParams = {
  kitId: number;
  /** Shown in the header immediately so we don’t flash “Supplies”. */
  orderName?: string;
};

export function MedicalSupplyOrderScreen({ user }: { user: SessionUser }) {
  const c = useFlareColors();
  const navigation = useNavigation<any>();
  const route = useRoute();
  const params = route.params as MedicalSupplyOrderParams | undefined;
  const kitId = Number(params?.kitId);
  const paramOrderName = String(params?.orderName ?? "").trim();
  const insets = useSafeAreaInsets();
  const tabBarClearance = bottomTabBarHeight(insets.bottom);
  const { scrollBottomPad } = useTrackerThumbFabLayout(tabBarClearance);

  const [kit, setKit] = useState<MedicalSupplyKitRow | null>(null);
  const [items, setItems] = useState<MedicalSupplyRow[]>([]);
  const [detailLoading, setDetailLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<MedicalSupplyFormState>(() => emptyMedicalSupplyFormState());
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [expandedCount, setExpandedCount] = useState(LOG_HISTORY_LOAD_MORE_BATCH);
  const [deleteOrderOpen, setDeleteOrderOpen] = useState(false);
  const [deletingOrder, setDeletingOrder] = useState(false);
  const [noStockOpen, setNoStockOpen] = useState(false);

  const headerName = kit?.name?.trim() || paramOrderName || "Order";
  const stockIds = useMemo(() => items.map((row) => String(row.id)), [items]);
  const renderOrderHint = useCallback(
    () => (
      <View style={styles.headerHintSlot}>
        <InfoHintButton
          title={headerName}
          message="Tap an item to edit, long-press to select and remove."
          accessibilityLabel="About this supply crate"
        />
      </View>
    ),
    [headerName],
  );
  const {
    selectionMode,
    selectedIds,
    bulkDeleteOpen,
    setBulkDeleteOpen,
    bulkDeleting,
    enterSelectionWith,
    toggleSelect,
    exitSelectionMode,
    runBulkDelete,
  } = useLogListSelection({
    routeName: "MedicalSupplyOrder",
    itemIds: stockIds,
    navigation,
    headerTitle: headerName,
    renderIdleHeaderRight: renderOrderHint,
  });

  const loadDetail = useCallback(
    async (opts?: { quiet?: boolean }) => {
      if (!Number.isFinite(kitId)) {
        navigation.goBack();
        return;
      }
      if (!opts?.quiet) setDetailLoading(true);
      try {
        const [kitRow, rows] = await Promise.all([
          fetchMedicalSupplyKit(user.id, kitId),
          fetchMedicalSuppliesForKit(user.id, kitId),
        ]);
        if (!kitRow) {
          setKit(null);
          setItems([]);
          navigation.goBack();
          return;
        }
        setKit(kitRow);
        setItems(rows);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Could not load this order.";
        showFlareAlert("Could not load", message);
      } finally {
        setDetailLoading(false);
      }
    },
    [kitId, navigation, user.id],
  );

  useFocusEffect(
    useCallback(() => {
      void loadDetail({ quiet: true });
    }, [loadDetail]),
  );

  useLayoutEffect(() => {
    if (selectionMode) return;
    navigation.setOptions({
      headerTitleAlign: "center",
      headerTitleContainerStyle: undefined,
      headerTitle: headerName,
      headerRight: () => renderOrderHint(),
    });
  }, [headerName, navigation, renderOrderHint, selectionMode]);

  const handleBulkDeleteConfirm = useCallback(() => {
    void runBulkDelete(async (ids) => {
      const idSet = new Set(ids);
      const prev = items;
      const nextItems = prev.filter((row) => !idSet.has(String(row.id)));
      setItems(nextItems);
      clearMedicalSupplyKitListCache(user.id);
      try {
        await deleteMedicalSuppliesForUser(user.id, ids);
        try {
          await rescheduleSupplyNotificationsForUser(user.id);
        } catch {
          // non-fatal
        }
      } catch (err: unknown) {
        setItems(prev);
        const message = err instanceof Error ? err.message : "Could not delete these items.";
        showFlareAlert("Could not delete", message);
        throw err;
      }
    });
  }, [items, runBulkDelete, user.id]);

  const openRequestSupplies = useCallback(() => {
    if (items.length === 0) {
      setNoStockOpen(true);
      return;
    }
    navigation.navigate("MedicalSupplyRequest", { kitId });
  }, [items.length, kitId, navigation]);

  const closeSheet = useCallback(() => {
    setSheetOpen(false);
    setEditingId(null);
    setSaveError("");
    setForm(emptyMedicalSupplyFormState());
  }, []);

  const openAdd = useCallback(() => {
    setForm(emptyMedicalSupplyFormState());
    setEditingId(null);
    setSaveError("");
    setSheetOpen(true);
  }, []);

  const openEdit = useCallback((row: MedicalSupplyRow) => {
    setForm(medicalSupplyFormFromRow(row));
    setEditingId(row.id);
    setSaveError("");
    setSheetOpen(true);
  }, []);

  const handleSave = async (values: MedicalSupplyFormState) => {
    setSaveError("");
    setSaving(true);
    try {
      if (editingId) {
        const updated = await updateMedicalSupply(user.id, editingId, values);
        setItems((prev) => prev.map((row) => (row.id === updated.id ? updated : row)));
      } else {
        const created = await insertMedicalSupply(user.id, kitId, values);
        setItems((prev) => [...prev, created]);
        try {
          await rescheduleSupplyNotificationsForUser(user.id);
        } catch {
          // non-fatal
        }
      }
      closeSheet();
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Could not save this item.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteOrder = async () => {
    setDeletingOrder(true);
    try {
      const previous = getMedicalSupplyKitListCache(user.id);
      const remaining =
        previous == null ? null : previous.filter((entry) => entry.kit.id !== kitId);
      await deleteMedicalSupplyKit(user.id, kitId);
      try {
        await rescheduleSupplyNotificationsForUser(user.id);
      } catch {
        // non-fatal
      }
      if (remaining != null) {
        setMedicalSupplyKitListCache(user.id, remaining);
      }
      setDeleteOrderOpen(false);
      exitSelectionMode();
      // Last known order — jump straight to setup (no empty-list flash).
      if (remaining != null && remaining.length === 0) {
        navigation.reset({
          index: 1,
          routes: [
            { name: "Dashboard" },
            {
              name: "MedicalSuppliesSetup",
              params: { startStep: SUPPLIES_SETUP_STEP_INTRO },
            },
          ],
        });
        return;
      }
      navigation.goBack();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Could not delete this order.";
      showFlareAlert("Could not delete", message);
    } finally {
      setDeletingOrder(false);
    }
  };

  const listItems: LogHistoryListItem[] = items.map((row) => ({
    id: String(row.id),
    title: row.name,
    subtitle: row.quantity,
    accessibilityLabel: row.notes?.trim()
      ? `${row.name}. ${row.quantity}. ${row.notes}. Edit`
      : `${row.name}. ${row.quantity}. Edit`,
  }));

  const visibleCount = useMemo(() => {
    if (items.length === 0) return LOG_HISTORY_LOAD_MORE_BATCH;
    if (items.length <= LOG_HISTORY_LOAD_MORE_BATCH) return items.length;
    return Math.min(expandedCount, items.length);
  }, [items.length, expandedCount]);

  const hasMore = items.length > visibleCount;
  const loadMore = useCallback(() => {
    setExpandedCount((count) => Math.min(count + LOG_HISTORY_LOAD_MORE_BATCH, items.length));
  }, [items.length]);

  if (detailLoading && !kit) {
    return (
      <View style={[styles.screen, { backgroundColor: c.screen }]}>
        <View style={styles.centered}>
          <ActivityIndicator color={c.primary} />
        </View>
      </View>
    );
  }

  const dueHeadline = supplyDueHeadline(kit, items.length);
  const dueStatus = supplyDueStatus(kit, items.length);
  const cadenceDays = normalizeCadenceDays(kit?.cadence_days ?? 7);

  return (
    <>
      <View style={[styles.screen, { backgroundColor: c.screen }]}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: scrollBottomPad }]}
        >
          <ScreenHeader title={headerName} />
          <Card style={styles.statusCard}>
            <View style={styles.statusCopy}>
              {dueStatus === "overdue" && kit?.next_due_date ? (
                <Text style={[styles.statusHeadline, { color: c.text, fontFamily: TYPOGRAPHY.fontFamily.medium }]}>
                  {"Order overdue: "}
                  <Text style={{ color: c.danger }}>{formatUkDate(kit.next_due_date)}</Text>
                </Text>
              ) : (
                <Text style={[styles.statusHeadline, { color: c.text, fontFamily: TYPOGRAPHY.fontFamily.medium }]}>
                  {dueHeadline}
                </Text>
              )}
              <Text style={[styles.statusMeta, { color: c.textMuted, fontFamily: TYPOGRAPHY.fontFamily.regular }]}>
                {cadenceLabel(cadenceDays)}
              </Text>
            </View>

            <View
              style={[styles.statusActions, selectionMode && styles.statusActionsDisabled]}
              pointerEvents={selectionMode ? "none" : "auto"}
            >
              <PrimaryButton title="Send request" onPress={openRequestSupplies} disabled={selectionMode} />
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: selectionMode }}
                disabled={selectionMode}
                onPress={() =>
                  navigation.navigate({
                    name: "MedicalSuppliesSetup",
                    params: { editKitId: kitId },
                  })
                }
                style={[styles.changeLink, styles.editSetupLink]}
              >
                <Text style={[styles.changeLinkText, { color: c.primary, fontFamily: TYPOGRAPHY.fontFamily.regular }]}>
                  Edit setup
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: selectionMode }}
                disabled={selectionMode}
                onPress={() => setDeleteOrderOpen(true)}
                style={styles.changeLink}
              >
                <Text style={[styles.changeLinkText, { color: c.danger, fontFamily: TYPOGRAPHY.fontFamily.regular }]}>
                  Delete
                </Text>
              </Pressable>
            </View>
          </Card>

          {items.length === 0 ? (
            <Card>
              <View style={styles.emptyWrap}>
                <FlareLucideIcon icon={MEDICAL_SUPPLIES_FEATURE_ICON} size={40} color={c.textSecondary} />
                <Text style={[styles.emptyText, { color: c.textSecondary, fontFamily: TYPOGRAPHY.fontFamily.regular }]}>
                  No items yet.
                </Text>
              </View>
            </Card>
          ) : (
            <>
              <Card noPadding style={{ paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md }}>
                {listItems.slice(0, visibleCount).map((item) => {
                  const isSelected = selectedIds.has(item.id);
                  return (
                    <TrayRow
                      key={item.id}
                      icon={FLARE_FEATURE_LUCIDE.supplies}
                      label={item.title}
                      value={item.subtitle ?? ""}
                      showChevron
                      onPress={() => {
                        if (selectionMode) {
                          toggleSelect(item.id);
                        } else {
                          const row = items.find((r) => String(r.id) === item.id);
                          if (row) openEdit(row);
                        }
                      }}
                      onLongPress={selectionMode ? undefined : () => enterSelectionWith(item.id)}
                    />
                  );
                })}
              </Card>

              {hasMore && (
                <Pressable
                  accessibilityRole="button"
                  onPress={loadMore}
                  style={({ pressed }) => [styles.loadMore, pressed && { opacity: 0.7 }]}
                >
                  <Text style={[styles.loadMoreText, { color: c.primary, fontFamily: TYPOGRAPHY.fontFamily.medium }]}>
                    load more
                  </Text>
                </Pressable>
              )}
            </>
          )}
        </ScrollView>

        {!selectionMode && (
          <TrackerThumbFab
            accessibilityLabel="Add item"
            onPress={openAdd}
            tabBarClearance={tabBarClearance}
          />
        )}
      </View>

      <ConfirmModal
        visible={bulkDeleteOpen}
        title={selectedIds.size === 1 ? "Delete item?" : `Delete ${selectedIds.size} items?`}
        message="This cannot be undone."
        confirmLabel={bulkDeleting ? "Deleting…" : "Delete"}
        confirmDanger
        onConfirm={handleBulkDeleteConfirm}
        onCancel={() => setBulkDeleteOpen(false)}
      />
      <ConfirmModal
        visible={deleteOrderOpen}
        title="Delete this order?"
        message="This removes the order and all data associated with it."
        confirmLabel={deletingOrder ? "Deleting…" : "Delete"}
        confirmDanger
        onConfirm={() => void handleDeleteOrder()}
        onCancel={() => setDeleteOrderOpen(false)}
      />
      <MedicalSupplyItemSheet
        visible={sheetOpen}
        editingId={editingId}
        initialValues={form}
        saving={saving}
        saveError={saveError}
        onClose={closeSheet}
        onSave={handleSave}
      />
      <ConfirmModal
        visible={noStockOpen}
        notice
        title="Add items first"
        message="Add items to this order first, then you can send a request."
        confirmLabel="OK"
        onConfirm={() => setNoStockOpen(false)}
        onCancel={() => setNoStockOpen(false)}
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
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerHintSlot: {
    paddingLeft: SPACING.sm,
  },
  statusCard: { padding: SPACING.lg },
  statusCopy: { gap: SPACING.xxs },
  statusHeadline: {
    fontSize: TYPOGRAPHY.fontSize.cardTitle,
  },
  statusMeta: {
    fontSize: TYPOGRAPHY.fontSize.sm,
  },
  statusActions: { gap: SPACING.md, marginTop: SPACING.lg },
  statusActionsDisabled: { opacity: 0.4 },
  editSetupLink: { marginTop: SPACING.xs },
  changeLink: { paddingVertical: SPACING.xxs, alignItems: "center" },
  changeLinkText: {
    fontSize: TYPOGRAPHY.fontSize.md,
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
