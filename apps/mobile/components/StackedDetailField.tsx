import React from "react";
import { Platform, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from "react-native";
import { FLARE_INPUT_BORDER_RADIUS } from "./FlareInput";
import {
  DETAIL_FIELD_LABEL,
  FLARE_FONT_FAMILY,
  FLARE_FONT_SIZE,
  FLARE_LINE_HEIGHT,
  STACKED_LINE_GAP,
} from "../lib/layoutConstants";
import { useFlareColors } from "../theme";

/** Vertical/horizontal inset for stacked detail rows; exported for grouped panels in screens. */
export const STACKED_DETAIL_ROW_EDGE = 10;
/** Roomier padding for stacked label + value rows (detail trays, Account info, etc.). */
export const STACKED_DETAIL_ROW_VERTICAL_PADDING = 14;
export const STACKED_DETAIL_ROW_HORIZONTAL_PADDING = 16;

const textProps = Platform.OS === "android" ? ({ includeFontPadding: false } as const) : {};

type Props = {
  label?: string;
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
  selectable?: boolean;
  /** Match dashboard Today / Account compact lists (13). */
  compact?: boolean;
  /** Value size. Default muted (13). Pass `caption` only where decided (e.g. list when lines). */
  valueSize?: "muted" | "caption";
};

/**
 * Stacked label → value for detail screens. Divider sits on the outer shell; padding lives only on the inner block so top/bottom insets match.
 */
export function StackedDetailField({
  label,
  value,
  showDivider,
  valueColor,
  numberOfLines,
  style,
  insetRow,
  hideLabel,
  selectable,
  compact,
  valueSize = "muted",
}: Props) {
  const c = useFlareColors();
  const hasValue = value !== undefined && value !== "";
  const bottomBorder = showDivider
    ? { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.cardBorder }
    : undefined;

  const showFieldLabel = !hideLabel;
  const valueStyles: StyleProp<TextStyle> = [
    valueSize === "caption" ? styles.valueTextWhen : styles.valueText,
    compact && valueSize !== "caption" ? styles.valueTextCompact : null,
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
          borderRadius: FLARE_INPUT_BORDER_RADIUS,
          overflow: "hidden",
        },
      ]}
    >
      <View
        style={[
          styles.inner,
          {
            paddingTop: STACKED_DETAIL_ROW_VERTICAL_PADDING,
            paddingBottom: STACKED_DETAIL_ROW_VERTICAL_PADDING,
            paddingHorizontal: STACKED_DETAIL_ROW_HORIZONTAL_PADDING,
          },
          style,
        ]}
      >
        {showFieldLabel ? (
          <Text style={[styles.label, { color: c.textMuted }]} {...textProps}>
            {label}
          </Text>
        ) : null}
        {hasValue ? (
          <Text style={valueStyles} numberOfLines={numberOfLines} selectable={selectable} {...textProps}>
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
          borderRadius: FLARE_INPUT_BORDER_RADIUS,
          overflow: "hidden",
        },
      ]}
    >
      <View
        style={[
          styles.inner,
          {
            paddingTop: STACKED_DETAIL_ROW_VERTICAL_PADDING,
            paddingBottom: STACKED_DETAIL_ROW_VERTICAL_PADDING,
            paddingHorizontal: STACKED_DETAIL_ROW_HORIZONTAL_PADDING,
          },
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
  label: DETAIL_FIELD_LABEL,
  valueText: {
    fontSize: FLARE_FONT_SIZE.muted,
    fontFamily: FLARE_FONT_FAMILY.regular,
    lineHeight: FLARE_LINE_HEIGHT.muted,
  },
  valueTextCompact: {
    fontSize: FLARE_FONT_SIZE.muted,
    lineHeight: FLARE_LINE_HEIGHT.muted,
  },
  valueTextWhen: {
    fontSize: FLARE_FONT_SIZE.caption,
    fontFamily: FLARE_FONT_FAMILY.regular,
    lineHeight: FLARE_LINE_HEIGHT.caption,
  },
  valueAfterLabel: {
    marginTop: STACKED_LINE_GAP,
  },
});
