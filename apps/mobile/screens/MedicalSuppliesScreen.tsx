import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import React, { useCallback, useLayoutEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { showFlareAlert } from "../components/FlareAlertHost";
import { InstructionScreenShell } from "../components/InstructionScreenShell";
import { ConfirmModal } from "../components/ConfirmModal";
import { HeaderOverflowMenu } from "../components/HeaderOverflowMenu";
import { InfoHintButton } from "../components/InfoHintButton";
import { TrackerThumbFab, useTrackerThumbFabLayout } from "../components/TrackerThumbFab";
import {
  FLARE_FONT_FAMILY,
  FLARE_FONT_SIZE,
  FLARE_INLINE_ACTION_LINK,
  FLARE_LINE_HEIGHT,
  NAV_ROW_CHEVRON_SIZE,
  SCREEN_EDGE_PADDING,
  STACKED_LINE_GAP,
  bottomTabBarHeight,
} from "../lib/layoutConstants";
import { useLogListSelection } from "../lib/useLogListSelection";
import {
  deleteMedicalSupplyKit,
  fetchKitListEntries,
  getMedicalSupplyKitListCache,
  needsMedicalSuppliesSetup,
  supplyDueListLabel,
  type KitListEntry,
} from "../lib/medicalSuppliesShared";
import { rescheduleSupplyNotificationsForUser } from "../lib/medicationNotifications";
import { SUPPLIES_SETUP_STEP_INTRO } from "./MedicalSuppliesSetupScreen";
import { useFlareColors } from "../theme";

type SessionUser = { id: string };

function seedFromKitCache(userId: string): {
  entries: KitListEntry[];
  hubReady: boolean;
} {
  const cached = getMedicalSupplyKitListCache(userId);
  if (cached == null || needsMedicalSuppliesSetup(cached.length)) {
    return { entries: [], hubReady: true };
  }
  return { entries: cached, hubReady: true };
}

export function MedicalSuppliesScreen({ user }: { user: SessionUser }) {
  const c = useFlareColors();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const tabBarClearance = bottomTabBarHeight(insets.bottom);
  const { scrollBottomPad } = useTrackerThumbFabLayout(tabBarClearance);

  const seed = useMemo(() => seedFromKitCache(user.id), [user.id]);
  const [hubReady, setHubReady] = useState(seed.hubReady);
  const [entries, setEntries] = useState<KitListEntry[]>(seed.entries);
  const [noStockOpen, setNoStockOpen] = useState(false);
  const [noStockMessage, setNoStockMessage] = useState(
    "Add items to an order first, then you can send a request.",
  );

  const orderIds = useMemo(() => entries.map((e) => String(e.kit.id)), [entries]);
  const renderIdleHeaderRight = useCallback(
    () => (
      <HeaderOverflowMenu
        navigation={navigation}
        routeName="MedicalSupplies"
        edgePadding={SCREEN_EDGE_PADDING}
      />
    ),
    [navigation],
  );
  const renderSuppliesHeaderTitle = useCallback(
    () => (
      <View style={styles.headerTitleWithHint}>
        <Text
          style={{
            fontFamily: FLARE_FONT_FAMILY.bold,
            fontSize: FLARE_FONT_SIZE.navTitle,
            color: c.text,
          }}
        >
          My Supplies
        </Text>
        <InfoHintButton
          title="My Supplies"
          message={
            "Your supplies hub keeps your supply orders together in one place. Create an order for each set of supplies you regularly need. Tap to manage, or long-press to delete."
          }
          accessibilityLabel="About My Supplies"
        />
      </View>
    ),
    [c.text],
  );
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
    routeName: "MedicalSupplies",
    itemIds: orderIds,
    navigation,
    headerTitle: renderSuppliesHeaderTitle,
    renderIdleHeaderRight,
  });

  const openNewOrderSetup = useCallback(() => {
    navigation.navigate("MedicalSuppliesSetup", { startStep: SUPPLIES_SETUP_STEP_INTRO });
  }, [navigation]);

  const loadList = useCallback(async () => {
    try {
      const rows = await fetchKitListEntries(user.id);
      if (needsMedicalSuppliesSetup(rows.length)) {
        // Replace before painting an empty list (avoids list → setup flash).
        navigation.replace("MedicalSuppliesSetup", { startStep: SUPPLIES_SETUP_STEP_INTRO });
        return;
      }
      setEntries(rows);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Could not load supplies.";
      showFlareAlert("Could not load", message);
    } finally {
      setHubReady(true);
    }
  }, [navigation, user.id]);

  useFocusEffect(
    useCallback(() => {
      const cached = getMedicalSupplyKitListCache(user.id);
      if (cached != null && !needsMedicalSuppliesSetup(cached.length)) {
        setEntries(cached);
        setHubReady(true);
      }
      void loadList();
    }, [loadList, user.id]),
  );

  useLayoutEffect(() => {
    if (selectionMode) return;
    navigation.setOptions({
      headerTitle: renderSuppliesHeaderTitle,
      headerLeft: undefined,
      headerRight: () => (
        <HeaderOverflowMenu
          navigation={navigation}
          routeName="MedicalSupplies"
          edgePadding={SCREEN_EDGE_PADDING}
        />
      ),
    });
  }, [navigation, renderSuppliesHeaderTitle, selectionMode]);

  const handleBulkDeleteConfirm = useCallback(() => {
    void runBulkDelete(async (ids) => {
      const idSet = new Set(ids);
      const prev = entries;
      const remaining = prev.filter((e) => !idSet.has(String(e.kit.id)));
      const goingToSetup = needsMedicalSuppliesSetup(remaining.length);
      if (!goingToSetup) {
        setEntries(remaining);
      }
      try {
        for (const id of ids) {
          await deleteMedicalSupplyKit(user.id, Number(id));
        }
        try {
          await rescheduleSupplyNotificationsForUser(user.id);
        } catch {
          // non-fatal
        }
        if (goingToSetup) {
          setEntries([]);
          navigation.replace("MedicalSuppliesSetup", { startStep: SUPPLIES_SETUP_STEP_INTRO });
        }
      } catch (err: unknown) {
        setEntries(prev);
        const message = err instanceof Error ? err.message : "Could not delete these orders.";
        showFlareAlert("Could not delete", message);
        throw err;
      }
    });
  }, [entries, navigation, runBulkDelete, user.id]);

  const openRequestSupplies = useCallback(() => {
    const withStock = entries.find((e) => e.itemCount > 0);
    if (!withStock) {
      setNoStockMessage("Add items to an order first, then you can send a request.");
      setNoStockOpen(true);
      return;
    }
    navigation.navigate("MedicalSupplyRequest", { kitId: withStock.kit.id });
  }, [entries, navigation]);

  if (!hubReady || entries.length === 0) {
    return <View style={[styles.centered, { backgroundColor: c.screen }]} />;
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
          <ConfirmModal
            visible={noStockOpen}
            notice
            title="Add items first"
            message={noStockMessage}
            confirmLabel="OK"
            onConfirm={() => setNoStockOpen(false)}
            onCancel={() => setNoStockOpen(false)}
          />
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
              navigation.navigate("MedicalSupplyOrder", { kitId: row.id, orderName: row.name });
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
              <Ionicons name="chevron-forward" size={NAV_ROW_CHEVRON_SIZE} color={c.text} accessibilityIgnoresInvertColors />
            )}
          </Pressable>
        );
      })}
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: selectionMode }}
        disabled={selectionMode}
        onPress={() => openRequestSupplies()}
        style={[styles.changeLink, selectionMode ? styles.changeLinkDisabled : null]}
        pointerEvents={selectionMode ? "none" : "auto"}
      >
        <Text style={[FLARE_INLINE_ACTION_LINK, { color: c.primary, textAlign: "center" }]}>
          Send request
        </Text>
      </Pressable>
    </InstructionScreenShell>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  headerTitleWithHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
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
    fontFamily: FLARE_FONT_FAMILY.medium,
  },
  orderDue: {
    fontSize: FLARE_FONT_SIZE.caption,
    lineHeight: FLARE_LINE_HEIGHT.caption,
    fontFamily: FLARE_FONT_FAMILY.regular,
  },
  changeLink: { paddingVertical: STACKED_LINE_GAP },
  changeLinkDisabled: { opacity: 0.4 },
});
