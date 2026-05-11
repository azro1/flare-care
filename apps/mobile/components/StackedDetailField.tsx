import React from "react";
import { Platform, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from "react-native";
import { useFlareColors } from "../theme";

/** Space between label and value (or between stacked value lines). */
const LABEL_TO_VALUE = 4;

/** Vertical/horizontal inset for stacked detail rows; exported for grouped panels in screens. */
export const STACKED_DETAIL_ROW_EDGE = 10;
const ROW_EDGE = STACKED_DETAIL_ROW_EDGE;

const textProps = Platform.OS === "android" ? ({ includeFontPadding: false } as const) : {};

type Props = {
  label: string;
  /** Omit or pass empty string for label-only rows (e.g. meal section title). */
  value?: string;
  showDivider?: boolean;
  valueColor?: string;
  numberOfLines?: number;
  /** Applied to the padded inner region (not the divider shell). */
  style?: StyleProp<ViewStyle>;
  /** Muted rounded well per row; horizontal inset matches `ROW_EDGE` (same as top/bottom). */
  insetRow?: boolean;
  /** Section title lives above the row — show value only. */
  hideLabel?: boolean;
};

/**
 * Stacked label → value for detail screens. Divider sits on the outer shell; padding lives only on the inner block so top/bottom insets match.
 */
export function StackedDetailField({ label, value, showDivider, valueColor, numberOfLines, style, insetRow, hideLabel }: Props) {
  const c = useFlareColors();
  const hasValue = value !== undefined && value !== "";
  const bottomBorder = showDivider
    ? { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.cardBorder }
    : undefined;

  const showFieldLabel = !hideLabel;
  const valueStyles: StyleProp<TextStyle> = [
    styles.valueText,
    { color: valueColor ?? c.text },
    hasValue && showFieldLabel && styles.valueAfterLabel,
  ];

  return (
    <View
      style={[
        styles.shell,
        bottomBorder,
        insetRow && {
          backgroundColor: c.surfaceSubtle,
          borderRadius: 10,
          overflow: "hidden",
        },
      ]}
    >
      <View
        style={[
          styles.inner,
          { paddingTop: ROW_EDGE, paddingBottom: ROW_EDGE },
          insetRow ? { paddingHorizontal: ROW_EDGE } : null,
          style,
        ]}
      >
        {showFieldLabel ? (
          <Text style={[styles.label, { color: c.textMuted }]} {...textProps}>
            {label}
          </Text>
        ) : null}
        {hasValue ? (
          <Text style={valueStyles} numberOfLines={numberOfLines} {...textProps}>
            {value}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

/** Meal row: same typography as `StackedDetailField`; optional per-row well. */
export function StackedMealLine({
  food,
  quantity,
  insetRow,
  valueColor,
  style,
}: {
  food: string;
  quantity?: string;
  insetRow?: boolean;
  /** Defaults to main text; use e.g. `textSecondary` so section titles can stay stronger on the card. */
  valueColor?: string;
  /** Applied to the padded inner region (same as `StackedDetailField`). */
  style?: StyleProp<ViewStyle>;
}) {
  const c = useFlareColors();
  const q = quantity?.trim();
  const mainColor = valueColor ?? c.text;
  return (
    <View
      style={[
        styles.shell,
        insetRow && {
          backgroundColor: c.surfaceSubtle,
          borderRadius: 10,
          overflow: "hidden",
        },
      ]}
    >
      <View
        style={[
          styles.inner,
          { paddingTop: ROW_EDGE, paddingBottom: ROW_EDGE },
          insetRow ? { paddingHorizontal: ROW_EDGE } : null,
          style,
        ]}
      >
        <Text style={[styles.valueText, { color: mainColor }]} {...textProps}>
          {food.trim() || "—"}
        </Text>
        {q ? (
          <Text style={[styles.valueText, { color: mainColor }, styles.valueAfterLabel]} numberOfLines={4} {...textProps}>
            {q}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    alignSelf: "stretch",
  },
  inner: {
    flexDirection: "column",
    alignSelf: "stretch",
  },
  label: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
  valueText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
  valueAfterLabel: {
    marginTop: LABEL_TO_VALUE,
  },
});
