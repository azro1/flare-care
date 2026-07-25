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
  onDismiss,
  dismissAccessibilityLabel = "Dismiss message",
}: {
  instruction: InstructionCopy;
  icon: MciIconName | IonIconName;
  iconFamily?: "mci" | "ion";
  onDismiss: () => void;
  dismissAccessibilityLabel?: string;
}) {
  const c = useFlareColors();
  const { title, paragraphs } = instruction;

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
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
        <Text style={[styles.title, { color: c.text }]}>{title}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={dismissAccessibilityLabel}
          onPress={onDismiss}
          hitSlop={SCREEN_EDGE_PADDING}
          style={[styles.close, { backgroundColor: c.surfaceSubtle }]}
        >
          <Ionicons name="close" size={18} color={c.textSecondary} accessibilityIgnoresInvertColors />
        </Pressable>
      </View>
      {paragraphs.map((paragraph) => (
        <Text key={paragraph} style={[styles.body, { color: c.textSecondary }]}>
          {paragraph}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
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
