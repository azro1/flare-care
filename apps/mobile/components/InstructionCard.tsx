import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { Platform, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import {
  INSTRUCTION_CARD_ACCENT_WIDTH,
  INSTRUCTION_CARD_BODY,
  INSTRUCTION_CARD_BODY_GAP,
  INSTRUCTION_CARD_BORDER_WIDTH,
  INSTRUCTION_CARD_CLOSE_ICON_SIZE,
  INSTRUCTION_CARD_CLOSE_SIZE,
  INSTRUCTION_CARD_ICON_SIZE,
  INSTRUCTION_CARD_MCI_ICON_SCALE,
  INSTRUCTION_CARD_HEADER_BODY_GAP,
  INSTRUCTION_CARD_HEADER_GAP,
  INSTRUCTION_CARD_ICON_WELL_SIZE,
  INSTRUCTION_CARD_PADDING_BOTTOM,
  INSTRUCTION_CARD_PADDING_H,
  INSTRUCTION_CARD_PADDING_TOP,
  INSTRUCTION_CARD_RADIUS,
  INSTRUCTION_CARD_TITLE,
  INSTRUCTION_CARD_TITLE_ICON_ALIGN_PAD,
  SCREEN_EDGE_PADDING,
} from "../lib/layoutConstants";
import { useFlareColors } from "../theme";

export type InstructionCopy = {
  title: string;
  paragraphs: readonly string[];
};

export function InstructionCard({
  instruction,
  onDismiss,
  iconFamily = "ion",
  iconName = "compass-outline",
  dismissAccessibilityLabel = "Dismiss message",
  bordered = true,
  style,
}: {
  instruction: InstructionCopy;
  onDismiss: () => void;
  iconFamily?: "ion" | "mci";
  iconName?: React.ComponentProps<typeof Ionicons>["name"] | React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  dismissAccessibilityLabel?: string;
  /** Green border + left accent. Dashboard keeps true; wizards can turn off. */
  bordered?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const c = useFlareColors();
  const { title, paragraphs } = instruction;
  const iconSize = INSTRUCTION_CARD_ICON_SIZE;

  const icon =
    iconFamily === "mci" ? (
      <View style={{ transform: [{ scale: INSTRUCTION_CARD_MCI_ICON_SCALE }] }}>
        <MaterialCommunityIcons
          name={iconName as React.ComponentProps<typeof MaterialCommunityIcons>["name"]}
          size={iconSize}
          color={c.primary}
          accessibilityIgnoresInvertColors
        />
      </View>
    ) : (
      <Ionicons
        name={iconName as React.ComponentProps<typeof Ionicons>["name"]}
        size={iconSize}
        color={c.primary}
        accessibilityIgnoresInvertColors
      />
    );

  return (
    <View
      style={[
        styles.card,
        !bordered && styles.cardBorderless,
        style,
        {
          backgroundColor: c.card,
          ...(bordered
            ? {
                borderColor: c.primary,
                ...Platform.select({
                  ios: { shadowColor: c.primary },
                  android: {},
                }),
              }
            : null),
        },
      ]}
    >
      {bordered ? <View style={[styles.accentBar, { backgroundColor: c.primary }]} /> : null}
      <View style={styles.content}>
        <View style={styles.headerRow}>
          <View style={[styles.iconWell, { backgroundColor: c.surfaceSubtle }]}>{icon}</View>
          <Text style={[styles.title, { color: c.text }]}>{title}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={dismissAccessibilityLabel}
            onPress={onDismiss}
            hitSlop={SCREEN_EDGE_PADDING}
            style={[styles.close, { backgroundColor: c.surfaceSubtle }]}
          >
            <Ionicons
              name="close"
              size={INSTRUCTION_CARD_CLOSE_ICON_SIZE}
              color={c.textSecondary}
              accessibilityIgnoresInvertColors
            />
          </Pressable>
        </View>
        <View style={styles.bodyBlock}>
          {paragraphs.map((paragraph) => (
            <Text key={paragraph} style={[styles.body, { color: c.textSecondary }]}>
              {paragraph}
            </Text>
          ))}
        </View>
      </View>
    </View>
  );
}

const iconWellRadius = INSTRUCTION_CARD_ICON_WELL_SIZE / 2;
const closeRadius = INSTRUCTION_CARD_CLOSE_SIZE / 2;

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    borderRadius: INSTRUCTION_CARD_RADIUS,
    borderWidth: INSTRUCTION_CARD_BORDER_WIDTH,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.14,
        shadowRadius: 10,
      },
      android: { elevation: 6 },
    }),
  },
  cardBorderless: {
    borderWidth: 0,
  },
  accentBar: {
    width: INSTRUCTION_CARD_ACCENT_WIDTH,
  },
  content: {
    flex: 1,
    paddingTop: INSTRUCTION_CARD_PADDING_TOP,
    paddingBottom: INSTRUCTION_CARD_PADDING_BOTTOM,
    paddingRight: INSTRUCTION_CARD_PADDING_H,
    paddingLeft: INSTRUCTION_CARD_PADDING_H,
    gap: INSTRUCTION_CARD_HEADER_BODY_GAP,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: INSTRUCTION_CARD_HEADER_GAP,
  },
  iconWell: {
    width: INSTRUCTION_CARD_ICON_WELL_SIZE,
    height: INSTRUCTION_CARD_ICON_WELL_SIZE,
    borderRadius: iconWellRadius,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    flex: 1,
    ...INSTRUCTION_CARD_TITLE,
    paddingTop: INSTRUCTION_CARD_TITLE_ICON_ALIGN_PAD,
  },
  close: {
    width: INSTRUCTION_CARD_CLOSE_SIZE,
    height: INSTRUCTION_CARD_CLOSE_SIZE,
    borderRadius: closeRadius,
    alignItems: "center",
    justifyContent: "center",
  },
  bodyBlock: {
    gap: INSTRUCTION_CARD_BODY_GAP,
  },
  body: {
    ...INSTRUCTION_CARD_BODY,
    ...Platform.select({ android: { includeFontPadding: false } }),
  },
});
