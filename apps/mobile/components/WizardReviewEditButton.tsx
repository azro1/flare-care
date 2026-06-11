import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { CARD_SECTION_INNER_GAP, NAV_ROW_CHEVRON_SIZE, NAV_ROW_LABEL } from "../lib/layoutConstants";
import { useFlareColors } from "../theme";

/** Review section Edit — `DEV_NOTES` navigate row: `c.text` label, muted chevron. */
export function WizardReviewEditButton({
  onPress,
  accessibilityLabel,
}: {
  onPress: () => void;
  accessibilityLabel: string;
}) {
  const c = useFlareColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
    >
      <Text style={[styles.label, { color: c.text }]}>Edit</Text>
      <Ionicons name="chevron-forward" size={NAV_ROW_CHEVRON_SIZE} color={c.textMuted} accessibilityIgnoresInvertColors />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 2, marginLeft: CARD_SECTION_INNER_GAP },
  label: NAV_ROW_LABEL,
});
