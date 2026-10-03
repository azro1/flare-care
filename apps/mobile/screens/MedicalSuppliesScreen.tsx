import { FLARE_CHROME_LUCIDE, FlareLucideIcon } from "../lib/flareLucideIcons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import React, { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, InteractionManager, Pressable, StyleSheet, Text, View } from "react-native";
import { ScrollView } from "../lib/scrollViews";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { showFlareAlert } from "../components/FlareAlertHost";
import { Card } from "../components/MidnightLagoonCard";
import { ScreenHeader } from "../components/MidnightLagoonScreenHeader";
import { ConfirmModal } from "../components/ConfirmModal";
import { InfoHintButton } from "../components/InfoHintButton";
import { TrackerThumbFab, useTrackerThumbFabLayout } from "../components/TrackerThumbFab";
import { SPACING, TYPOGRAPHY } from "../designTokens";
import { NAV_ROW_CHEVRON_SIZE, bottomTabBarHeight } from "../lib/layoutConstants";
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
  /** Cache already says no orders — replace to setup before painting hub. */
  openSetup: boolean;
} {
  const cached = getMedicalSupplyKitListCache(userId);
  if (cached == null) {
    // Hold blank until fetch; dashboard usually warms cache before the tile tap.
    return { entries: [], hubReady: false, openSetup: false };
  }
  if (needsMedicalSuppliesSetup(cached.length)) {
    return { entries: [], hubReady: false, openSetup: true };
  }
  return { entries: cached, hubReady: true, openSetup: false };
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
  const focusAliveRef = useRef(false);

  useLayoutEffect(() => {
    if (!seed.openSetup) return;
    navigation.replace("MedicalSuppliesSetup", { startStep: SUPPLIES_SETUP_STEP_INTRO });
  }, [navigation, seed.openSetup]);

  const orderIds = useMemo(() => entries.map((e) => String(e.kit.id)), [entries]);
  const renderSuppliesHint = useCallback(
    () => (
      <InfoHintButton
        title="Supplies"
        message="Keep the supplies you regularly need organised using supply crates. Tap to manage, or long-press to delete."
        accessibilityLabel="About Supplies"
      />
    ),
    [],
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
    headerTitle: "Supplies",
    renderIdleHeaderRight: renderSuppliesHint,
  });

  const openNewOrderSetup = useCallback(() => {
    navigation.navigate("MedicalSuppliesSetup", { startStep: SUPPLIES_SETUP_STEP_INTRO });
  }, [navigation]);

  const loadList = useCallback(async () => {
    try {
      const rows = await fetchKitListEntries(user.id);
      if (!focusAliveRef.current) return;
      if (needsMedicalSuppliesSetup(rows.length)) {
        // Replace before painting an empty list (avoids list → setup flash).
        navigation.replace("MedicalSuppliesSetup", { startStep: SUPPLIES_SETUP_STEP_INTRO });
        return;
      }
      setEntries(rows);
    } catch (err: unknown) {
      if (!focusAliveRef.current) return;
      const message = err instanceof Error ? err.message : "Could not load supplies.";
      showFlareAlert("Could not load", message);
    } finally {
      if (focusAliveRef.current) setHubReady(true);
    }
  }, [navigation, user.id]);

  useFocusEffect(
    useCallback(() => {
      focusAliveRef.current = true;
      const cached = getMedicalSupplyKitListCache(user.id);
      if (cached != null && needsMedicalSuppliesSetup(cached.length)) {
        navigation.replace("MedicalSuppliesSetup", { startStep: SUPPLIES_SETUP_STEP_INTRO });
        return () => {
          focusAliveRef.current = false;
        };
      }
      if (cached != null) {
        setEntries((prev) => (prev === cached ? prev : cached));
        setHubReady(true);
      }
      /** Let the push/pop settle before network setState — same as Dashboard / Weight. */
      const task = InteractionManager.runAfterInteractions(() => {
        void loadList();
      });
      return () => {
        focusAliveRef.current = false;
        task.cancel();
      };
    }, [loadList, navigation, user.id]),
  );

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
    return (
      <View style={[styles.screen, { backgroundColor: c.screen }]}>
        <View style={styles.centered}>
          <ActivityIndicator color={c.primary} />
        </View>
      </View>
    );
  }

  return (
    <>
      <View style={[styles.screen, { backgroundColor: c.screen }]}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: scrollBottomPad }]}
        >
          <ScreenHeader title="Supplies" />

          <Card noPadding style={{ paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md }}>
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
                  style={styles.orderRow}
                >
                  <View style={styles.orderCopy}>
                    <Text
                      style={[
                        styles.orderName,
                        { color: c.text, fontFamily: TYPOGRAPHY.fontFamily.medium },
                      ]}
                      numberOfLines={1}
                    >
                      {row.name}
                    </Text>
                    <Text
                      style={[
                        styles.orderDue,
                        {
                          color: status === "overdue" ? c.danger : c.textMuted,
                          fontFamily: TYPOGRAPHY.fontFamily.regular,
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {supplyDueListLabel(row, itemCount)}
                    </Text>
                  </View>
                  {selectionMode ? (
                    <FlareLucideIcon
                      icon={isSelected ? FLARE_CHROME_LUCIDE.checkCircle : FLARE_CHROME_LUCIDE.circle}
                      size={22}
                      color={isSelected ? c.primary : c.textMuted}
                    />
                  ) : (
                    <FlareLucideIcon icon={FLARE_CHROME_LUCIDE.forward} size={NAV_ROW_CHEVRON_SIZE} color={c.text} />
                  )}
                </Pressable>
              );
            })}
          </Card>

          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: selectionMode }}
            disabled={selectionMode}
            onPress={() => openRequestSupplies()}
            style={[styles.changeLink, selectionMode && styles.changeLinkDisabled]}
            pointerEvents={selectionMode ? "none" : "auto"}
          >
            <Text
              style={[
                styles.changeLinkText,
                { color: c.primary, fontFamily: TYPOGRAPHY.fontFamily.regular },
              ]}
            >
              Send request
            </Text>
          </Pressable>
        </ScrollView>

        {!selectionMode && (
          <TrackerThumbFab
            accessibilityLabel="Add order"
            onPress={openNewOrderSetup}
            tabBarClearance={tabBarClearance}
          />
        )}
      </View>

      <ConfirmModal
        visible={bulkDeleteOpen}
        title={selectedIds.size === 1 ? "Delete this order?" : `Delete ${selectedIds.size} orders?`}
        message="This removes each order and all data associated with it."
        confirmLabel={bulkDeleting ? "Deleting…" : "Delete"}
        confirmDanger
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
  orderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    paddingVertical: SPACING.sm,
    minHeight: 56,
  },
  orderCopy: { flex: 1, gap: SPACING.xxs },
  orderName: {
    fontSize: TYPOGRAPHY.fontSize.md,
  },
  orderDue: {
    fontSize: TYPOGRAPHY.fontSize.sm,
  },
  changeLink: { paddingVertical: SPACING.md, alignItems: "center" },
  changeLinkDisabled: { opacity: 0.4 },
  changeLinkText: {
    fontSize: TYPOGRAPHY.fontSize.md,
  },
});
