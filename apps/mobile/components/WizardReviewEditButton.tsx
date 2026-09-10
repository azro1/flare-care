import React from "react";
import { Pressable, StyleSheet } from "react-native";
import { FLARE_CHROME_LUCIDE, FlareLucideIcon } from "../lib/flareLucideIcons";
import { CARD_SECTION_INNER_GAP, NAV_ROW_CHEVRON_SIZE } from "../lib/layoutConstants";
import { useFlareColors } from "../theme";

/** Review section Edit — pencil icon beside the section title. */
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
      hitSlop={10}
      style={({ pressed }) => [styles.hit, pressed && { opacity: 0.7 }]}
    >
      <FlareLucideIcon icon={FLARE_CHROME_LUCIDE.edit} size={NAV_ROW_CHEVRON_SIZE} color={c.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hit: {
    marginLeft: CARD_SECTION_INNER_GAP,
    flexShrink: 0,
    justifyContent: "center",
  },
});
