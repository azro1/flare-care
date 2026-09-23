import React, { useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { showFlareAlert } from "../components/FlareAlertHost";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FLARE_FONT_FAMILY, HEADER_CHROME_ICON_SIZE } from "../lib/layoutConstants";
import { FLARE_CHROME_LUCIDE, FlareLucideIcon } from "../lib/flareLucideIcons";
import { useFlareColors } from "../theme";

type OverflowItem = {
  id: string;
  label: string;
  route: string;
};

/**
 * ⋮ menu — Settings / Support hub / chrome. Educational resources live under Support
 * (What is IBD?, Nutrition Guide, …), not as app “Info”.
 */
const OVERFLOW_ITEMS: OverflowItem[] = [
  { id: "settings", label: "Settings", route: "Settings" },
  { id: "myCard", label: "My IBD Card", route: "MyCard" },
  { id: "support", label: "Support", route: "Support" },
  { id: "about", label: "About", route: "About" },
  { id: "help", label: "Help", route: "AccountHelp" },
];

/** Routes where that menu entry is redundant (already on that screen). */
const HIDE_ITEM_ON_ROUTE: Partial<Record<string, string[]>> = {
  Settings: ["settings"],
  MyCard: ["myCard"],
  Support: ["support"],
  /** Legacy route name — hide Support while on old Info deep link if any. */
  Info: ["support"],
  AccountHelp: ["help"],
  About: ["about"],
};

export function HeaderOverflowMenu({
  navigation,
  routeName,
  edgePadding = 12,
  onLogout,
  compact = false,
}: {
  navigation: { navigate: (name: string) => void };
  routeName: string;
  /** Same as `styles.screen` horizontal padding — aligns ⋮ with card/content edge. */
  edgePadding?: number;
  onLogout?: () => void | Promise<void>;
  /** Sit flush beside a leading header control (e.g. ? next to ⋮). */
  compact?: boolean;
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

  const onLogoutPress = () => {
    close();
    if (!onLogout) return;
    showFlareAlert("Log out?", "You will be logged out of your account. Are you sure?", [
      { text: "Stay signed in", style: "cancel" },
      { text: "Log out", style: "destructive", onPress: () => void onLogout() },
    ]);
  };

  return (
    <View style={compact ? styles.triggerCompactWrap : undefined}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="More options"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen(true)}
        style={compact ? styles.triggerCompact : styles.trigger}
        hitSlop={compact ? 10 : { top: 10, bottom: 10, left: 20, right: 6 }}
      >
        <FlareLucideIcon icon={FLARE_CHROME_LUCIDE.overflow} size={HEADER_CHROME_ICON_SIZE} color={c.text} />
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
            {items.map((item) => (
              <Pressable
                key={item.id}
                accessibilityRole="menuitem"
                onPress={() => onSelect(item.route)}
                style={({ pressed }) => [styles.row, pressed ? { opacity: 0.75 } : null]}
              >
                <Text style={[styles.label, { color: c.text }]}>{item.label}</Text>
              </Pressable>
            ))}
            {onLogout ? (
              <Pressable
                accessibilityRole="menuitem"
                onPress={onLogoutPress}
                style={({ pressed }) => [styles.row, pressed ? { opacity: 0.75 } : null]}
              >
                <Text style={[styles.label, { color: c.text }]}>Log out</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  trigger: {
    height: 40,
    minWidth: 44,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  triggerCompactWrap: {
    justifyContent: "center",
  },
  triggerCompact: {
    height: 40,
    alignItems: "center",
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
  row: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  label: { fontSize: 15, fontFamily: FLARE_FONT_FAMILY.medium },
});
