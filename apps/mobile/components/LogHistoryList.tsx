import React from "react";
import { Pressable, StyleSheet, Text, View, type ReactNode } from "react-native";
import { STACKED_DETAIL_ROW_EDGE } from "./StackedDetailField";
import { formatLogWhenLine } from "../lib/logDisplay";
import {
  FLARE_FONT_FAMILY,
  FLARE_FONT_SIZE,
  FLARE_LINE_HEIGHT,
  SCREEN_EDGE_PADDING,
} from "../lib/layoutConstants";
import { useFlareColors } from "../theme";

export type LogHistoryListItem = {
  id: string;
  title: string;
  whenIso?: string;
  /** When set, shown instead of formatting `whenIso` (e.g. entry count on dashboard). */
  subtitle?: string;
  /** Shown when neither `subtitle` nor `whenIso` is set. */
  whenFallback?: string;
  /** Dashboard goals — dims title and uses status subtitle. */
  completed?: boolean;
  /** Shown on the right (e.g. Today summary counts). */
  trailingText?: string;
  accessibilityLabel?: string;
};

export function LogHistoryList({
  items,
  onPressItem,
  renderTrailing,
}: {
  items: LogHistoryListItem[];
  onPressItem?: (id: string) => void;
  renderTrailing?: (item: LogHistoryListItem) => ReactNode;
}) {
  const c = useFlareColors();
  return (
    <View style={[logHistoryListStyles.logList, { backgroundColor: c.surfaceSubtle }]}>
      {items.map((item, index) => {
        const whenLine = item.trailingText
          ? ""
          : item.subtitle ?? (item.whenIso ? formatLogWhenLine(item.whenIso) : (item.whenFallback ?? ""));
        const titleColor =
          item.completed || item.trailingText !== undefined ? c.textMuted : c.text;
        const rowBody = (
          <>
            <Text
              style={[
                item.trailingText !== undefined
                  ? logHistoryListStyles.logPrimaryRegular
                  : logHistoryListStyles.logPrimary,
                { color: titleColor },
                item.completed ? logHistoryListStyles.logPrimaryCompleted : null,
              ]}
              numberOfLines={1}
            >
              {item.title}
            </Text>
            {whenLine ? (
              <Text style={[logHistoryListStyles.logSecondary, { color: c.textMuted }]} numberOfLines={1}>
                {whenLine}
              </Text>
            ) : null}
          </>
        );
        const trailingNode = item.trailingText ? (
          <Text style={[logHistoryListStyles.trailingValue, { color: c.text }]}>{item.trailingText}</Text>
        ) : renderTrailing ? (
          renderTrailing(item)
        ) : null;
        return (
          <View
            key={item.id}
            style={[
              logHistoryListStyles.logRow,
              index !== items.length - 1
                ? { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.cardBorder }
                : null,
            ]}
          >
            {onPressItem ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={item.accessibilityLabel ?? `${item.title}. ${whenLine}. View details`}
                onPress={() => onPressItem(item.id)}
                style={({ pressed }) => [logHistoryListStyles.logMain, pressed && { opacity: 0.7 }]}
              >
                {rowBody}
              </Pressable>
            ) : (
              <View style={logHistoryListStyles.logMain} accessibilityLabel={item.accessibilityLabel}>
                {rowBody}
              </View>
            )}
            {trailingNode ? <View style={logHistoryListStyles.logActions}>{trailingNode}</View> : null}
          </View>
        );
      })}
    </View>
  );
}

export const logHistoryCardStyles = StyleSheet.create({
  trackerCard: { borderRadius: 14, padding: 14, marginBottom: 12, gap: 14 },
  trackerCardBody: { gap: 14 },
  trackerIntro: {
    fontSize: FLARE_FONT_SIZE.body,
    fontFamily: FLARE_FONT_FAMILY.regular,
    lineHeight: FLARE_LINE_HEIGHT.body,
  },
  sectionTitle: {
    fontSize: FLARE_FONT_SIZE.navTitle,
    fontFamily: FLARE_FONT_FAMILY.bold,
  },
});

export const logHistoryListStyles = StyleSheet.create({
  logList: { borderRadius: 14, overflow: "hidden" },
  logRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SCREEN_EDGE_PADDING,
    paddingVertical: 12,
    gap: STACKED_DETAIL_ROW_EDGE,
  },
  logMain: { flex: 1, minWidth: 0 },
  logPrimary: { fontSize: FLARE_FONT_SIZE.body, fontFamily: FLARE_FONT_FAMILY.medium },
  logPrimaryRegular: { fontSize: FLARE_FONT_SIZE.body, fontFamily: FLARE_FONT_FAMILY.regular },
  logPrimaryCompleted: { textDecorationLine: "line-through" },
  logSecondary: {
    fontSize: FLARE_FONT_SIZE.muted,
    fontFamily: FLARE_FONT_FAMILY.regular,
    marginTop: 2,
    lineHeight: FLARE_LINE_HEIGHT.muted,
  },
  logActions: { flexDirection: "row", alignItems: "center", flexShrink: 0 },
  trailingValue: { fontSize: FLARE_FONT_SIZE.body, fontFamily: FLARE_FONT_FAMILY.medium },
  logIconBtn: { padding: 6 },
});
