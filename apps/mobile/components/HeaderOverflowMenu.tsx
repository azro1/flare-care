import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFlareColors } from "../theme";

type OverflowItem = {
  id: string;
  label: string;
  route: string;
};

const OVERFLOW_ITEMS: OverflowItem[] = [
  { id: "settings", label: "Settings", route: "Settings" },
  { id: "symptom-history", label: "Symptom history", route: "SymptomHistory" },
  { id: "tracking-history", label: "Tracking history", route: "MedicationTrackingHistory" },
  { id: "about", label: "About FlareCare", route: "About" },
  { id: "ibd", label: "What is IBD?", route: "Ibd" },
  { id: "help", label: "Help", route: "AccountHelp" },
];

/** Routes where that menu entry is redundant (already on that screen). */
const HIDE_ITEM_ON_ROUTE: Partial<Record<string, string[]>> = {
  Settings: ["settings"],
  SymptomHistory: ["symptom-history"],
  MedicationTrackingHistory: ["tracking-history"],
  AccountHelp: ["help"],
  About: ["about"],
  Ibd: ["ibd"],
};

export function HeaderOverflowMenu({
  navigation,
  routeName,
  edgePadding = 12,
}: {
  navigation: { navigate: (name: string) => void };
  routeName: string;
  /** Same as `styles.screen` horizontal padding — aligns ⋮ with card/content edge. */
  edgePadding?: number;
}) {
  const [open, setOpen] = useState(false);
  const c = useFlareColors();
  const insets = useSafeAreaInsets();

  const items = useMemo(() => {
    const hidden = new Set(HIDE_ITEM_ON_ROUTE[routeName] ?? []);
    return OVERFLOW_ITEMS.filter((item) => !hidden.has(item.id));
  }, [routeName]);

  const close = () => setOpen(false);

  const onSelect = (route: string) => {
    close();
    navigation.navigate(route);
  };

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="More options"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen(true)}
        style={styles.trigger}
        hitSlop={{ top: 10, bottom: 10, left: 20, right: 6 }}
      >
        <Ionicons name="ellipsis-vertical" size={20} color={c.textMuted} accessibilityIgnoresInvertColors />
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
        <View style={styles.modalRoot}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Dismiss menu"
            onPress={close}
            style={[StyleSheet.absoluteFillObject, { backgroundColor: c.modalBackdrop }]}
          />
          <View
            style={[
              styles.panel,
              {
                backgroundColor: c.card,
                borderColor: c.cardBorder,
                top: insets.top + 44,
                right: edgePadding,
              },
            ]}
          >
            {items.map((item, index) => (
              <View key={item.id}>
                {index > 0 ? <View style={[styles.separator, { backgroundColor: c.cardBorder }]} /> : null}
                <Pressable
                  accessibilityRole="menuitem"
                  onPress={() => onSelect(item.route)}
                  style={({ pressed }) => [styles.row, pressed ? { opacity: 0.75 } : null]}
                >
                  <Text style={[styles.label, { color: c.text }]}>{item.label}</Text>
                </Pressable>
              </View>
            ))}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    height: 40,
    minWidth: 44,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  modalRoot: { flex: 1 },
  panel: {
    position: "absolute",
    minWidth: 228,
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 8,
  },
  row: { paddingHorizontal: 16, paddingVertical: 14 },
  label: { fontSize: 16, fontFamily: "Inter_400Regular" },
  separator: { height: StyleSheet.hairlineWidth },
});
