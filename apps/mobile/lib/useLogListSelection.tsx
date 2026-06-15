import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { BackHandler, Pressable, StyleSheet } from "react-native";
import { SCREEN_EDGE_PADDING } from "./layoutConstants";
import { useListSelectionChrome } from "./listSelectionChrome";
import { useFlareColors } from "../theme";

export const logListSelectionHeaderStyles = StyleSheet.create({
  closeBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: SCREEN_EDGE_PADDING - 8,
  },
  selectAllBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
});

type NavigationWithOptions = {
  setOptions: (options: object) => void;
};

export function useLogListSelection({
  routeName,
  itemIds,
  navigation,
  headerTitle,
  renderIdleHeaderRight,
}: {
  routeName: string;
  itemIds: string[];
  navigation: NavigationWithOptions;
  /** Restored when leaving selection mode — must match `headerOptions` title for this route. */
  headerTitle: string;
  /** Optional header action when not in selection mode (e.g. navigate to a sibling list). */
  renderIdleHeaderRight?: () => React.ReactNode;
}) {
  const c = useFlareColors();
  const { setChrome } = useListSelectionChrome();
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const bulkDeleteInFlight = useRef(false);

  const exitSelectionMode = useCallback(() => {
    setSelectionMode(false);
    setSelectedIds(new Set());
    setBulkDeleteOpen(false);
  }, []);

  const enterSelectionWith = useCallback((id: string) => {
    setSelectionMode(true);
    setSelectedIds(new Set([id]));
  }, []);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      if (prev.size === itemIds.length) return new Set();
      return new Set(itemIds);
    });
  }, [itemIds]);

  const openBulkDelete = useCallback(() => {
    if (selectedIds.size === 0) return;
    setBulkDeleteOpen(true);
  }, [selectedIds.size]);

  useFocusEffect(
    useCallback(() => {
      return () => {
        exitSelectionMode();
      };
    }, [exitSelectionMode]),
  );

  useFocusEffect(
    useCallback(() => {
      if (!selectionMode) return;
      const sub = BackHandler.addEventListener("hardwareBackPress", () => {
        exitSelectionMode();
        return true;
      });
      return () => sub.remove();
    }, [exitSelectionMode, selectionMode]),
  );

  useEffect(() => {
    if (!selectionMode) {
      setChrome(null);
      return;
    }
    setChrome({
      routeName,
      selectedCount: selectedIds.size,
      totalCount: itemIds.length,
      onCancel: exitSelectionMode,
      onSelectAll: toggleSelectAll,
      onDelete: openBulkDelete,
      deleteDisabled: selectedIds.size === 0 || bulkDeleting,
    });
    return () => setChrome(null);
  }, [
    bulkDeleting,
    exitSelectionMode,
    itemIds.length,
    openBulkDelete,
    routeName,
    selectedIds.size,
    selectionMode,
    setChrome,
    toggleSelectAll,
  ]);

  useFocusEffect(
    useCallback(() => {
      if (selectionMode) return;
      navigation.setOptions({
        headerTitle,
        headerRight: renderIdleHeaderRight ? () => renderIdleHeaderRight() : undefined,
      });
    }, [headerTitle, navigation, renderIdleHeaderRight, selectionMode]),
  );

  useLayoutEffect(() => {
    if (!selectionMode) {
      return;
    }
    const allSelected = itemIds.length > 0 && selectedIds.size === itemIds.length;
    navigation.setOptions({
      headerTitle: selectedIds.size === 1 ? "1 selected" : `${selectedIds.size} selected`,
      headerLeft: () => (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          onPress={exitSelectionMode}
          hitSlop={{ top: 10, bottom: 10, left: 8, right: 12 }}
          style={logListSelectionHeaderStyles.closeBtn}
        >
          <Ionicons name="close" size={26} color={c.textMuted} accessibilityIgnoresInvertColors />
        </Pressable>
      ),
      headerRight: () => (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={allSelected ? "Deselect all" : "Select all"}
          onPress={toggleSelectAll}
          hitSlop={10}
          style={logListSelectionHeaderStyles.selectAllBtn}
        >
          <Ionicons name="checkmark-done-outline" size={24} color={c.textMuted} accessibilityIgnoresInvertColors />
        </Pressable>
      ),
    });
    return () => {
      navigation.setOptions({
        headerTitle,
        headerLeft: undefined,
        headerRight: renderIdleHeaderRight ? () => renderIdleHeaderRight() : undefined,
      });
    };
  }, [
    c.textMuted,
    exitSelectionMode,
    headerTitle,
    itemIds.length,
    navigation,
    renderIdleHeaderRight,
    selectedIds.size,
    selectionMode,
    toggleSelectAll,
  ]);

  const runBulkDelete = useCallback(
    async (deleteSelected: (ids: string[]) => Promise<void>) => {
      if (bulkDeleteInFlight.current || selectedIds.size === 0) return;
      bulkDeleteInFlight.current = true;
      setBulkDeleting(true);
      setBulkDeleteOpen(false);
      try {
        await deleteSelected([...selectedIds]);
        exitSelectionMode();
      } finally {
        setBulkDeleting(false);
        bulkDeleteInFlight.current = false;
      }
    },
    [exitSelectionMode, selectedIds],
  );

  return {
    selectionMode,
    selectedIds,
    bulkDeleteOpen,
    setBulkDeleteOpen,
    bulkDeleting,
    enterSelectionWith,
    toggleSelect,
    exitSelectionMode,
    runBulkDelete,
  };
}
