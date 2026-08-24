import { FLARE_CHROME_LUCIDE, FlareLucideIcon } from "../lib/flareLucideIcons";
import React from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import {
  CARD_SECTION_INNER_GAP,
  FLARE_FONT_FAMILY,
  FLARE_FONT_SIZE,
  NAV_ROW_CHEVRON_SIZE,
} from "../lib/layoutConstants";
import { useFlareColors } from "../theme";

/** Review section Edit — matches compact field data (13). */
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
      <FlareLucideIcon icon={FLARE_CHROME_LUCIDE.forward} size={NAV_ROW_CHEVRON_SIZE} color={c.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 2, marginLeft: CARD_SECTION_INNER_GAP },
  label: {
    fontSize: FLARE_FONT_SIZE.muted,
    fontFamily: FLARE_FONT_FAMILY.regular,
  },
});
