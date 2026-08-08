import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import React, { type ComponentProps } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { FLARE_FONT_FAMILY, FLARE_FONT_SIZE, SCREEN_EDGE_PADDING } from "../lib/layoutConstants";
import { useFlareColors } from "../theme";
import type { InstructionCopy } from "./InstructionCard";

type MciIconName = ComponentProps<typeof MaterialCommunityIcons>["name"];
type IonIconName = ComponentProps<typeof Ionicons>["name"];

/**
 * Welcome copy inside an empty section card (icon + title + X + paragraphs).
 * Prefer this over floating `InstructionCard` on list/hub screens that have an empty state.
 */
export function EmptySectionWelcome({
  instruction,
  icon,
  iconFamily = "mci",
  showIcon = true,
  showTitle = true,
  fillHeight = false,
  onDismiss,
  dismissAccessibilityLabel = "Dismiss message",
}: {
  instruction: InstructionCopy;
  icon: MciIconName | IonIconName;
  iconFamily?: "mci" | "ion";
  /** Leading icon well. Off for section welcomes (icon already on the tile / empty state). */
  showIcon?: boolean;
  /** Card title. */
  showTitle?: boolean;
  /** Give the card a tall min height (header + body stay at the top; extra space at the bottom). */
  fillHeight?: boolean;
  onDismiss: () => void;
  dismissAccessibilityLabel?: string;
}) {
  const c = useFlareColors();
  const { title, paragraphs } = instruction;

  const closeButton = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={dismissAccessibilityLabel}
      onPress={onDismiss}
      hitSlop={SCREEN_EDGE_PADDING}
      style={[styles.close, { backgroundColor: c.surfaceSubtle }]}
    >
      <Ionicons name="close" size={18} color={c.textSecondary} accessibilityIgnoresInvertColors />
    </Pressable>
  );

  return (
    <View style={[styles.wrap, fillHeight && styles.wrapFill]}>
      <View style={styles.header}>
        {showIcon ? (
          <View style={[styles.iconWell, { backgroundColor: c.surfaceSubtle }]}>
            {iconFamily === "ion" ? (
              <Ionicons name={icon as IonIconName} size={22} color={c.primary} accessibilityIgnoresInvertColors />
            ) : (
              <MaterialCommunityIcons
                name={icon as MciIconName}
                size={22}
                color={c.primary}
                accessibilityIgnoresInvertColors
              />
            )}
          </View>
        ) : null}
        {showTitle ? <Text style={[styles.title, { color: c.text }]}>{title}</Text> : null}
        {closeButton}
      </View>
      <View style={styles.bodyGroup}>
        {paragraphs.map((paragraph) => (
          <Text key={paragraph} style={[styles.body, { color: c.textSecondary }]}>
            {paragraph}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  /** Tall card: header + body sit at the top (Getting Started look); extra space falls to the bottom. */
  wrapFill: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconWell: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    flex: 1,
    fontSize: FLARE_FONT_SIZE.sectionTitle,
    fontFamily: FLARE_FONT_FAMILY.bold,
  },
  bodyGroup: { gap: 10 },
  close: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  body: {
    fontSize: FLARE_FONT_SIZE.body,
    fontFamily: FLARE_FONT_FAMILY.regular,
    lineHeight: 22,
  },
});
