import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type ReactNode,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { EmptyTrayMessage } from "./EmptyTrayMessage";
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

/** Timestamp log row — title + `formatLogWhenLine` subtitle (history lists, bowel). */
export function buildTimestampLogRowItem({
  id,
  title,
  whenIso,
  accessibilityLabel,
}: {
  id: string;
  title: string;
  whenIso: string | null | undefined;
  accessibilityLabel?: string;
}): LogHistoryListItem {
  return {
    id,
    title,
    subtitle: formatLogWhenLine(whenIso),
    accessibilityLabel,
  };
}

/** Browse row — title + custom subtitle (e.g. dashboard Logs pill entry counts). */
export function buildBrowseLogRowItem({
  id,
  title,
  subtitle,
  accessibilityLabel,
}: {
  id: string;
  title: string;
  subtitle: string;
  accessibilityLabel: string;
}): LogHistoryListItem {
  return { id, title, subtitle, accessibilityLabel };
}

export function LogHistoryCard({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const c = useFlareColors();
  return (
    <View style={[logHistoryCardStyles.trackerCard, { backgroundColor: c.card }, style]}>
      {children}
    </View>
  );
}

/** White card with intro copy and grey list tray — symptom/medication history pattern. */
export function LogHistoryIntroSection({
  intro,
  children,
}: {
  intro: string;
  children: ReactNode;
}) {
  const c = useFlareColors();
  return (
    <LogHistoryCard>
      <Text style={[logHistoryCardStyles.trackerIntro, { color: c.textMuted }]}>{intro}</Text>
      <View style={logHistoryCardStyles.trackerCardBody}>{children}</View>
    </LogHistoryCard>
  );
}

/** Title → subtitle spacing used by Dashboard → Logs pill browse rows (`Symptom logs` / `3 entries`). */
const logsPillRowTextStyles = {
  primary: {
    fontSize: FLARE_FONT_SIZE.body,
    fontFamily: FLARE_FONT_FAMILY.medium,
  },
  secondary: {
    fontSize: FLARE_FONT_SIZE.muted,
    fontFamily: FLARE_FONT_FAMILY.regular,
    marginTop: 2,
    lineHeight: FLARE_LINE_HEIGHT.muted,
  },
} as const;

export function LogHistoryList({
  items,
  emptyMessage,
  onPressItem,
  renderTrailing,
  rowTextLayout = "logsPill",
}: {
  items: LogHistoryListItem[];
  emptyMessage?: string;
  onPressItem?: (id: string) => void;
  renderTrailing?: (item: LogHistoryListItem) => ReactNode;
  /** Title/subtitle typography. Default matches dashboard Logs pill + history rows. */
  rowTextLayout?: "default" | "logsPill";
}) {
  if (items.length === 0 && emptyMessage) {
    return <EmptyTrayMessage message={emptyMessage} />;
  }
  const c = useFlareColors();
  return (
    <View style={[logHistoryListStyles.logList, { backgroundColor: c.surfaceSubtle }]}>
      {items.map((item, index) => {
        const whenLine = item.trailingText
          ? ""
          : item.subtitle ?? (item.whenIso ? formatLogWhenLine(item.whenIso) : (item.whenFallback ?? ""));
        const titleColor =
          item.completed || item.trailingText !== undefined ? c.textMuted : c.text;
        const useLogsPillText = rowTextLayout === "logsPill" && item.trailingText === undefined;
        const primaryStyle = useLogsPillText
          ? logsPillRowTextStyles.primary
          : item.trailingText !== undefined
            ? logHistoryListStyles.logPrimaryRegular
            : logHistoryListStyles.logPrimary;
        const secondaryStyle = useLogsPillText
          ? logsPillRowTextStyles.secondary
          : logHistoryListStyles.logSecondary;
        const rowBody = (
          <>
            <Text
              style={[
                primaryStyle,
                { color: titleColor },
                item.completed ? logHistoryListStyles.logPrimaryCompleted : null,
              ]}
              numberOfLines={1}
            >
              {item.title}
            </Text>
            {whenLine ? (
              <Text style={[secondaryStyle, { color: c.textMuted }]} numberOfLines={1}>
                {whenLine}
              </Text>
            ) : null}
          </>
        );
        const trailingNode = item.trailingText ? (
          <Text style={[logHistoryListStyles.trailingValue, { color: c.text }]}>{item.trailingText}</Text>
        ) : renderTrailing ? (
          renderTrailing(item)
        ) : onPressItem ? (
          <Ionicons
            name="chevron-forward"
            size={18}
            color={c.text}
            accessibilityIgnoresInvertColors
          />
        ) : null;
        const rowContent = (
          <>
            <View style={logHistoryListStyles.logMain}>{rowBody}</View>
            {trailingNode ? <View style={logHistoryListStyles.logActions}>{trailingNode}</View> : null}
          </>
        );
        return onPressItem ? (
          <Pressable
            key={item.id}
            accessibilityRole="button"
            accessibilityLabel={item.accessibilityLabel ?? `${item.title}. ${whenLine}. View details`}
            onPress={() => onPressItem(item.id)}
            style={({ pressed }) => [
              logHistoryListStyles.logRow,
              index !== items.length - 1
                ? { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.cardBorder }
                : null,
              pressed && { opacity: 0.7 },
            ]}
          >
            {rowContent}
          </Pressable>
        ) : (
          <View
            key={item.id}
            style={[
              logHistoryListStyles.logRow,
              index !== items.length - 1
                ? { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.cardBorder }
                : null,
            ]}
            accessibilityLabel={item.accessibilityLabel}
          >
            {rowContent}
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
