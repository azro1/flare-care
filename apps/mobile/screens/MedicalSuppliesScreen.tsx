import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { BackHandler, Pressable, StyleSheet, Text, View } from "react-native";
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
import { HeaderOverflowMenu } from "../components/HeaderOverflowMenu";
import { HubTipCard } from "../components/HubTipCard";
import { TrackerThumbFab, useTrackerThumbFabLayout } from "../components/TrackerThumbFab";
import {
  FLARE_FONT_FAMILY,
  FLARE_FONT_SIZE,
  FLARE_INLINE_ACTION_LINK,
  FLARE_LINE_HEIGHT,
  INSTRUCTION_CARD_HEADER_GAP,
  SCREEN_EDGE_PADDING,
  STACKED_LINE_GAP,
  bottomTabBarHeight,
} from "../lib/layoutConstants";
import { useLogListSelection } from "../lib/useLogListSelection";
import {
  MEDICAL_SUPPLIES_FEATURE_ION_ICON,
  cadenceLabel,
  deleteMedicalSuppliesForUser,
  deleteMedicalSupplyKit,
  emptyMedicalSupplyFormState,
  fetchKitListEntries,
  fetchMedicalSuppliesForKit,
  fetchMedicalSupplyKit,
  getMedicalSupplyKitListCache,
  insertMedicalSupply,
  medicalSupplyFormFromRow,
  needsMedicalSuppliesSetup,
  normalizeCadenceDays,
  supplyDueHeadline,
  supplyDueListLabel,
  updateMedicalSupply,
  type KitListEntry,
  type MedicalSupplyFormState,
  type MedicalSupplyKitRow,
  type MedicalSupplyRow,
} from "../lib/medicalSuppliesShared";
import {
  MedicalSuppliesSetupScreen,
  SUPPLIES_SETUP_STEP_INTRO,
  SUPPLIES_SETUP_STEP_NAME,
} from "./MedicalSuppliesSetupScreen";
import { useFlareColors } from "../theme";

type SessionUser = { id: string };

function seedFromKitCache(userId: string): {
  entries: KitListEntry[];
  inSetup: boolean;
  hubReady: boolean;
} {
  const cached = getMedicalSupplyKitListCache(userId);
  if (cached == null) {
    // Assume setup so DB → Supplies paints intro with the transition (dashboard warms cache).
    return { entries: [], inSetup: true, hubReady: true };
  }
  if (needsMedicalSuppliesSetup(cached.length)) {
    return { entries: [], inSetup: true, hubReady: true };
  }
  return { entries: cached, inSetup: false, hubReady: true };
}

export function MedicalSuppliesScreen({ user }: { user: SessionUser }) {
  const c = useFlareColors();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const tabBarClearance = bottomTabBarHeight(insets.bottom);
  const { scrollBottomPad } = useTrackerThumbFabLayout(tabBarClearance);

  const seed = useMemo(() => seedFromKitCache(user.id), [user.id]);
  const [inSetup, setInSetup] = useState(seed.inSetup);
  const [setupStartStep, setSetupStartStep] = useState(SUPPLIES_SETUP_STEP_INTRO);
  const [setupEditKitId, setSetupEditKitId] = useState<number | null>(null);
  const [hubReady, setHubReady] = useState(seed.hubReady);
  const [entries, setEntries] = useState<KitListEntry[]>(seed.entries);
  const [selectedKitId, setSelectedKitId] = useState<number | null>(null);
  const [kit, setKit] = useState<MedicalSupplyKitRow | null>(null);
  const [items, setItems] = useState<MedicalSupplyRow[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<MedicalSupplyFormState>(() => emptyMedicalSupplyFormState());
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [expandedCount, setExpandedCount] = useState(LOG_HISTORY_LOAD_MORE_BATCH);
  const [deleteOrderOpen, setDeleteOrderOpen] = useState(false);
  const [deletingOrder, setDeletingOrder] = useState(false);
  const [noStockOpen, setNoStockOpen] = useState(false);
  const [noStockMessage, setNoStockMessage] = useState(
    "Add supplies to this order first, then request supplies.",
  );

  const orderIds = useMemo(() => entries.map((e) => String(e.kit.id)), [entries]);
  const stockIds = useMemo(() => items.map((row) => String(row.id)), [items]);
  const selectionItemIds = selectedKitId != null ? stockIds : orderIds;
  const renderIdleHeaderRight = useCallback(() => {
    if (selectedKitId != null || inSetup) return null;
    return (
      <HeaderOverflowMenu
        navigation={navigation}
        routeName="MedicalSupplies"
        edgePadding={SCREEN_EDGE_PADDING}
      />
    );
  }, [inSetup, navigation, selectedKitId]);
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
    routeName: "MedicalSupplies",
    itemIds: selectionItemIds,
    navigation,
    headerTitle: selectedKitId != null ? kit?.name || "Supplies" : "Supplies",
    renderIdleHeaderRight,
  });

  // Hub ↔ detail: drop selection so chrome/ids stay in sync.
  useEffect(() => {
    exitSelectionMode();
  }, [selectedKitId, exitSelectionMode]);
  const openNewOrderSetup = useCallback(() => {
    setSetupEditKitId(null);
    setSetupStartStep(SUPPLIES_SETUP_STEP_INTRO);
    setInSetup(true);
  }, []);

  const openEditOrderSetup = useCallback((kitId: number) => {
    setSetupEditKitId(kitId);
    setSetupStartStep(SUPPLIES_SETUP_STEP_NAME);
    setInSetup(true);
  }, []);

  const loadList = useCallback(async () => {
    try {
      const rows = await fetchKitListEntries(user.id);
      setEntries(rows);
      if (needsMedicalSuppliesSetup(rows.length)) {
        openNewOrderSetup();
        return;
      }
      // Has orders — drop optimistic first-time setup (not mid edit / add-another).
      setInSetup((was) => {
        if (!was) return false;
        if (setupEditKitId != null) return true;
        return false;
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Could not load supplies.";
      showFlareAlert("Could not load", message);
      setInSetup(false);
    } finally {
      setHubReady(true);
    }
  }, [openNewOrderSetup, setupEditKitId, user.id]);

  const loadDetail = useCallback(
    async (kitId: number, opts?: { quiet?: boolean }) => {
      if (!opts?.quiet) setDetailLoading(true);
      try {
        const [kitRow, rows] = await Promise.all([
          fetchMedicalSupplyKit(user.id, kitId),
          fetchMedicalSuppliesForKit(user.id, kitId),
        ]);
        if (!kitRow) {
          setSelectedKitId(null);
          setKit(null);
          setItems([]);
          void loadList();
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
    [loadList, user.id],
  );

  useFocusEffect(
    useCallback(() => {
      if (selectedKitId != null && !inSetup) {
        void loadDetail(selectedKitId, { quiet: true });
        return;
      }
      // Mid setup for an existing order / add-another — don't yank the wizard.
      if (inSetup && (setupEditKitId != null || entries.length > 0)) return;
      void loadList();
    }, [entries.length, inSetup, loadDetail, loadList, selectedKitId, setupEditKitId]),
  );

  const leaveDetail = useCallback(() => {
    setSelectedKitId(null);
    setKit(null);
    setItems([]);
    void loadList();
  }, [loadList]);

  useLayoutEffect(() => {
    if (inSetup || selectionMode) return;
    if (selectedKitId != null && kit) {
      navigation.setOptions({
        title: kit.name,
        headerLeft: () => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            hitSlop={{ top: 10, bottom: 10, left: 8, right: 20 }}
            onPress={leaveDetail}
            style={styles.headerBackHit}
          >
            <Ionicons name="chevron-back" size={24} color={c.textMuted} />
          </Pressable>
        ),
        headerRight: undefined,
      });
      return;
    }
    navigation.setOptions({
      title: "Supplies",
      headerLeft: undefined,
      headerRight: () => (
        <HeaderOverflowMenu
          navigation={navigation}
          routeName="MedicalSupplies"
          edgePadding={SCREEN_EDGE_PADDING}
        />
      ),
    });
  }, [c.textMuted, inSetup, kit, leaveDetail, navigation, selectedKitId, selectionMode]);

  useFocusEffect(
    useCallback(() => {
      if (inSetup || selectedKitId == null) return;
      const onBack = () => {
        leaveDetail();
        return true;
      };
      const sub = BackHandler.addEventListener("hardwareBackPress", onBack);
      return () => sub.remove();
    }, [inSetup, leaveDetail, selectedKitId]),
  );

  const handleSetupFinished = useCallback(
    (kitId: number) => {
      setInSetup(false);
      setSetupEditKitId(null);
      setSelectedKitId(kitId);
      setHubReady(true);
      void loadDetail(kitId);
    },
    [loadDetail],
  );

  const handleSetupDismiss = useCallback(() => {
    if (setupEditKitId != null) {
      setInSetup(false);
      setSetupEditKitId(null);
      return;
    }
    if (entries.length > 0 || selectedKitId != null) {
      setInSetup(false);
      return;
    }
    navigation.navigate("Dashboard");
  }, [entries.length, navigation, selectedKitId, setupEditKitId]);

  const handleBulkDeleteConfirm = useCallback(() => {
    void runBulkDelete(async (ids) => {
      if (selectedKitId != null) {
        const idSet = new Set(ids);
        const prev = items;
        setItems((rows) => rows.filter((row) => !idSet.has(String(row.id))));
        try {
          await deleteMedicalSuppliesForUser(user.id, ids);
        } catch (err: unknown) {
          setItems(prev);
          const message = err instanceof Error ? err.message : "Could not delete these items.";
          showFlareAlert("Could not delete", message);
          throw err;
        }
        return;
      }

      const idSet = new Set(ids);
      const prev = entries;
      const remaining = prev.filter((e) => !idSet.has(String(e.kit.id)));
      const goingToSetup = needsMedicalSuppliesSetup(remaining.length);
      // Keep hub painted until deletes finish when emptying — avoids empty-list flash into setup.
      if (!goingToSetup) {
        setEntries(remaining);
      }
      try {
        for (const id of ids) {
          await deleteMedicalSupplyKit(user.id, Number(id));
        }
        if (goingToSetup) {
          setEntries([]);
          openNewOrderSetup();
        }
      } catch (err: unknown) {
        setEntries(prev);
        const message = err instanceof Error ? err.message : "Could not delete these orders.";
        showFlareAlert("Could not delete", message);
        throw err;
      }
    });
  }, [entries, items, openNewOrderSetup, runBulkDelete, selectedKitId, user.id]);

  const openRequestSupplies = useCallback(
    (kitId?: number | null) => {
      if (kitId != null) {
        if (items.length === 0) {
          setNoStockMessage("Add supplies to this order first, then request supplies.");
          setNoStockOpen(true);
          return;
        }
        navigation.navigate("MedicalSupplyRequest", { kitId });
        return;
      }
      const withStock = entries.find((e) => e.itemCount > 0);
      if (!withStock) {
        setNoStockMessage("Add supplies to an order first, then request supplies.");
        setNoStockOpen(true);
        return;
      }
      navigation.navigate("MedicalSupplyRequest", { kitId: withStock.kit.id });
    },
    [entries, items.length, navigation],
  );

  const noStockNotice = (
    <ConfirmModal
      visible={noStockOpen}
      notice
      title="Add supplies first"
      message={noStockMessage}
      confirmLabel="OK"
      onConfirm={() => setNoStockOpen(false)}
      onCancel={() => setNoStockOpen(false)}
    />
  );

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
    if (selectedKitId == null) return;
    setSaveError("");
    setSaving(true);
    try {
      if (editingId) {
        const updated = await updateMedicalSupply(user.id, editingId, values);
        setItems((prev) => prev.map((row) => (row.id === updated.id ? updated : row)));
      } else {
        const created = await insertMedicalSupply(user.id, selectedKitId, values);
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
    if (selectedKitId == null) return;
    setDeletingOrder(true);
    try {
      await deleteMedicalSupplyKit(user.id, selectedKitId);
      setDeleteOrderOpen(false);
      // Resolve next screen before leaving detail — avoids empty-hub flash then setup.
      const rows = await fetchKitListEntries(user.id);
      setEntries(rows);
      setSelectedKitId(null);
      setKit(null);
      setItems([]);
      if (needsMedicalSuppliesSetup(rows.length)) {
        openNewOrderSetup();
      } else {
        setInSetup(false);
      }
      setHubReady(true);
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

  if (inSetup) {
    return (
      <MedicalSuppliesSetupScreen
        user={user}
        startStep={setupStartStep}
        editKitId={setupEditKitId}
        onFinished={handleSetupFinished}
        onDismiss={handleSetupDismiss}
      />
    );
  }

  // Hold a blank screen (same bg as setup) — never a spinner — until we know hub vs setup.
  if (!hubReady && selectedKitId == null) {
    return <View style={[styles.centered, { backgroundColor: c.screen }]} />;
  }

  if (selectedKitId != null) {
    if (detailLoading && !kit) {
      // Keep shell stable after first create; blank is fine for a beat, not a spinner flash.
      return <View style={[styles.centered, { backgroundColor: c.screen }]} />;
    }

    const dueHeadline = supplyDueHeadline(kit, items.length);
    const cadenceDays = normalizeCadenceDays(kit?.cadence_days ?? 7);

    return (
      <InstructionScreenShell
        showInstruction={false}
        contentPaddingBottom={scrollBottomPad}
        instruction={null}
        floatingAction={
          !selectionMode ? (
            <TrackerThumbFab
              accessibilityLabel="Add supply"
              onPress={openAdd}
              tabBarClearance={tabBarClearance}
            />
          ) : null
        }
        footer={
          <>
            <ConfirmModal
              visible={bulkDeleteOpen}
              title={
                selectedKitId != null
                  ? selectedIds.size === 1
                    ? "Delete supply?"
                    : `Delete ${selectedIds.size} supplies?`
                  : selectedIds.size === 1
                    ? "Delete this order?"
                    : `Delete ${selectedIds.size} orders?`
              }
              message={
                selectedKitId != null
                  ? "This cannot be undone."
                  : "This removes each order and all data associated with it."
              }
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
            {noStockNotice}
          </>
        }
      >
        <View style={[logHistoryCardStyles.trackerCard, styles.statusCard, { backgroundColor: c.card }]}>
          <View style={styles.statusCopy}>
            <Text style={[styles.statusHeadline, { color: c.text }]}>{dueHeadline}</Text>
            <Text style={[styles.statusMeta, { color: c.textMuted }]}>{cadenceLabel(cadenceDays)}</Text>
          </View>

          {!selectionMode ? (
            <View style={styles.statusActions}>
              <PrimaryButton
                title="Request supplies"
                onPress={() => openRequestSupplies(selectedKitId)}
              />
              <Pressable
                accessibilityRole="button"
                onPress={() => openEditOrderSetup(selectedKitId)}
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

  return (
    <InstructionScreenShell
      showInstruction={false}
      contentPaddingBottom={scrollBottomPad}
      instruction={null}
      floatingAction={
        !selectionMode ? (
          <TrackerThumbFab
            accessibilityLabel="Add order"
            onPress={openNewOrderSetup}
            tabBarClearance={tabBarClearance}
          />
        ) : null
      }
      footer={
        <>
          <ConfirmModal
            visible={bulkDeleteOpen}
            title={selectedIds.size === 1 ? "Delete this order?" : `Delete ${selectedIds.size} orders?`}
            message="This removes each order and all data associated with it."
            confirmLabel={bulkDeleting ? "Deleting…" : "Delete"}
            confirmDestructive
            onConfirm={handleBulkDeleteConfirm}
            onCancel={() => setBulkDeleteOpen(false)}
          />
          {noStockNotice}
        </>
      }
    >
      {entries.map(({ kit: row, itemCount, status }) => {
        const id = String(row.id);
        const isSelected = selectedIds.has(id);
        return (
          <Pressable
            key={row.id}
            accessibilityRole="button"
            accessibilityLabel={`${row.name}. ${supplyDueListLabel(row, itemCount)}`}
            accessibilityState={selectionMode ? { selected: isSelected } : undefined}
            onPress={() => {
              if (selectionMode) {
                toggleSelect(id);
                return;
              }
              setSelectedKitId(row.id);
              void loadDetail(row.id);
            }}
            onLongPress={() => enterSelectionWith(id)}
            delayLongPress={280}
            style={[styles.orderCard, { backgroundColor: c.card }]}
          >
            <View style={styles.orderCopy}>
              <Text style={[styles.orderName, { color: c.text }]} numberOfLines={1}>
                {row.name}
              </Text>
              <Text
                style={[styles.orderDue, { color: status === "overdue" ? c.danger : c.textMuted }]}
                numberOfLines={1}
              >
                {supplyDueListLabel(row, itemCount)}
              </Text>
            </View>
            {selectionMode ? (
              <Ionicons
                name={isSelected ? "checkmark-circle" : "ellipse-outline"}
                size={22}
                color={isSelected ? c.primary : c.textMuted}
              />
            ) : (
              <Ionicons name="chevron-forward" size={FLARE_FONT_SIZE.navTitle} color={c.textMuted} />
            )}
          </Pressable>
        );
      })}
      {!selectionMode ? (
        <HubTipCard
          tipId="supplies-hub-card-v2"
          message="Tap an order to manage it. Long-press to select and delete."
        />
      ) : null}
      {!selectionMode ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => openRequestSupplies()}
          style={styles.changeLink}
        >
          <Text style={[FLARE_INLINE_ACTION_LINK, { color: c.primary, textAlign: "center" }]}>
            Request supplies
          </Text>
        </Pressable>
      ) : null}
    </InstructionScreenShell>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  headerBackHit: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  orderCard: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  orderCopy: { flex: 1, gap: STACKED_LINE_GAP },
  orderName: {
    fontSize: FLARE_FONT_SIZE.muted,
    lineHeight: FLARE_LINE_HEIGHT.muted,
    fontFamily: FLARE_FONT_FAMILY.regular,
  },
  orderDue: {
    fontSize: FLARE_FONT_SIZE.muted,
    lineHeight: FLARE_LINE_HEIGHT.muted,
    fontFamily: FLARE_FONT_FAMILY.regular,
  },
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
