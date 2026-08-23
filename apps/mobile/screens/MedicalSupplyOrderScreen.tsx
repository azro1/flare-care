import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import React, { useCallback, useLayoutEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { showFlareAlert } from "../components/FlareAlertHost";
import { PrimaryButton } from "../components/FlareButton";
import { InstructionScreenShell } from "../components/InstructionScreenShell";
import { MedicalSupplyItemSheet } from "../components/MedicalSupplyItemSheet";
import {
  LogHistoryCard,
  LogHistoryEmptyState,
  LogHistoryPreviewList,
  LOG_HISTORY_LOAD_MORE_BATCH,
  logHistoryCardStyles,
  type LogHistoryListItem,
} from "../components/LogHistoryList";
import { ConfirmModal } from "../components/ConfirmModal";
import { HubTipCard } from "../components/HubTipCard";
import { TrackerThumbFab, useTrackerThumbFabLayout } from "../components/TrackerThumbFab";
import {
  FLARE_FONT_FAMILY,
  FLARE_FONT_SIZE,
  FLARE_INLINE_ACTION_LINK,
  FLARE_LINE_HEIGHT,
  INSTRUCTION_CARD_HEADER_GAP,
  STACKED_LINE_GAP,
  bottomTabBarHeight,
} from "../lib/layoutConstants";
import { useLogListSelection } from "../lib/useLogListSelection";
import {
  MEDICAL_SUPPLIES_FEATURE_ION_ICON,
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
import { formatUkDate } from "../lib/formatUkDate";
import { SUPPLIES_SETUP_STEP_INTRO } from "./MedicalSuppliesSetupScreen";
import { useFlareColors } from "../theme";

type SessionUser = { id: string };

export type MedicalSupplyOrderParams = {
  kitId: number;
  /** Shown in the header immediately so we don’t flash “My Supplies”. */
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
    renderIdleHeaderRight: () => null,
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
      title: headerName,
    });
  }, [headerName, navigation, selectionMode]);

  const handleBulkDeleteConfirm = useCallback(() => {
    void runBulkDelete(async (ids) => {
      const idSet = new Set(ids);
      const prev = items;
      const nextItems = prev.filter((row) => !idSet.has(String(row.id)));
      setItems(nextItems);
      clearMedicalSupplyKitListCache(user.id);
      try {
        await deleteMedicalSuppliesForUser(user.id, ids);
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
    return <View style={[styles.centered, { backgroundColor: c.screen }]} />;
  }

  const dueHeadline = supplyDueHeadline(kit, items.length);
  const dueStatus = supplyDueStatus(kit, items.length);
  const cadenceDays = normalizeCadenceDays(kit?.cadence_days ?? 7);

  return (
    <InstructionScreenShell
      showInstruction={false}
      contentPaddingBottom={scrollBottomPad}
      instruction={null}
      floatingAction={
        !selectionMode ? (
          <TrackerThumbFab
            accessibilityLabel="Add item"
            onPress={openAdd}
            tabBarClearance={tabBarClearance}
          />
        ) : null
      }
      footer={
        <>
          <ConfirmModal
            visible={bulkDeleteOpen}
            title={selectedIds.size === 1 ? "Delete item?" : `Delete ${selectedIds.size} items?`}
            message="This cannot be undone."
            confirmLabel={bulkDeleting ? "Deleting…" : "Delete"}
            confirmDestructive
            onConfirm={handleBulkDeleteConfirm}
            onCancel={() => setBulkDeleteOpen(false)}
          />
          <ConfirmModal
            visible={deleteOrderOpen}
            title="Delete this order?"
            message="This removes the order and all data associated with it."
            confirmLabel={deletingOrder ? "Deleting…" : "Delete"}
            confirmDestructive
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
      }
    >
      <View style={[logHistoryCardStyles.trackerCard, styles.statusCard, { backgroundColor: c.card }]}>
        <View style={styles.statusCopy}>
          {dueStatus === "overdue" && kit?.next_due_date ? (
            <Text style={[styles.statusHeadline, { color: c.text }]}>
              {"Order overdue: "}
              <Text style={{ color: c.danger }}>{formatUkDate(kit.next_due_date)}</Text>
            </Text>
          ) : (
            <Text style={[styles.statusHeadline, { color: c.text }]}>{dueHeadline}</Text>
          )}
          <Text style={[styles.statusMeta, { color: c.textMuted }]}>{cadenceLabel(cadenceDays)}</Text>
        </View>

        {!selectionMode ? (
          <View style={styles.statusActions}>
            <PrimaryButton title="Send request" onPress={openRequestSupplies} />
            <Pressable
              accessibilityRole="button"
              onPress={() =>
                navigation.navigate({
                  name: "MedicalSuppliesSetup",
                  params: { editKitId: kitId },
                })
              }
              style={[styles.changeLink, styles.editSetupLink]}
            >
              <Text style={[FLARE_INLINE_ACTION_LINK, { color: c.primary, textAlign: "center" }]}>
                Edit setup
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => setDeleteOrderOpen(true)}
              style={styles.changeLink}
            >
              <Text style={[FLARE_INLINE_ACTION_LINK, { color: c.danger, textAlign: "center" }]}>
                Delete
              </Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      <LogHistoryCard>
        <View style={logHistoryCardStyles.trackerCardBody}>
          {items.length === 0 ? (
            <LogHistoryEmptyState icon={MEDICAL_SUPPLIES_FEATURE_ION_ICON} iconFamily="ion" />
          ) : (
            <LogHistoryPreviewList
              items={listItems}
              visibleCount={visibleCount}
              hasMore={hasMore}
              loadMoreLabel="load more"
              onLoadMore={loadMore}
              rowTextLayout="compact"
              onPressItem={(id) => {
                const row = items.find((r) => String(r.id) === id);
                if (row) openEdit(row);
              }}
              selectionMode={selectionMode}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
              onLongPressItem={enterSelectionWith}
            />
          )}
        </View>
      </LogHistoryCard>
      {items.length > 0 && !selectionMode ? (
        <HubTipCard
          tipId="supplies-order-stock-hint-v1"
          message="Tap to edit · long-press to remove"
        />
      ) : null}
    </InstructionScreenShell>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  statusCopy: { gap: STACKED_LINE_GAP },
  statusCard: { padding: 18 },
  statusHeadline: {
    fontSize: FLARE_FONT_SIZE.subhead,
    lineHeight: FLARE_LINE_HEIGHT.subhead,
    fontFamily: FLARE_FONT_FAMILY.medium,
  },
  statusMeta: {
    fontSize: FLARE_FONT_SIZE.muted,
    lineHeight: FLARE_LINE_HEIGHT.muted,
    fontFamily: FLARE_FONT_FAMILY.regular,
  },
  statusActions: { gap: INSTRUCTION_CARD_HEADER_GAP },
  editSetupLink: { marginTop: 4 },
  changeLink: { paddingVertical: STACKED_LINE_GAP },
});
