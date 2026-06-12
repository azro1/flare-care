import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  ActivityIndicator,
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
  LOG_HISTORY_LOAD_MORE_BATCH,
  LOG_HISTORY_RECENT_PREVIEW_COUNT,
  LOG_HISTORY_WIZARD_LOAD_MORE_BATCH,
} from "../lib/logHistoryConstants";
import {
  CARD_SECTION_INNER_GAP,
  FLARE_FONT_FAMILY,
  FLARE_FONT_SIZE,
  FLARE_LINE_HEIGHT,
  SCREEN_EDGE_PADDING,
} from "../lib/layoutConstants";
import { useFlareColors } from "../theme";

export {
  LOG_HISTORY_LOAD_MORE_BATCH,
  LOG_HISTORY_RECENT_PREVIEW_COUNT,
  LOG_HISTORY_WIZARD_LOAD_MORE_BATCH,
} from "../lib/logHistoryConstants";

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

/** White card list tray + bulb tip below — symptom/medication history pattern. */
export function LogHistoryIntroSection({
  tip,
  children,
}: {
  tip: string;
  children: ReactNode;
}) {
  return (
    <>
      <LogHistoryCard>
        <View style={logHistoryCardStyles.trackerCardBody}>{children}</View>
      </LogHistoryCard>
      <LogHistoryTipRow text={tip} />
    </>
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

type LogHistoryPreviewListProps = {
  items: LogHistoryListItem[];
  visibleCount: number;
  hasMore: boolean;
  onLoadMore: () => void;
  loadingMore?: boolean;
  emptyMessage?: string;
  onPressItem?: (id: string) => void;
  loadMoreLabel?: string;
  renderTitleAccessory?: (item: LogHistoryListItem) => ReactNode;
  renderSubtitle?: (item: LogHistoryListItem) => ReactNode;
  renderTrailing?: (item: LogHistoryListItem) => ReactNode;
  rowTextLayout?: "default" | "logsPill";
};

/** Paginated list — **load more** link reveals the next batch. */
export function LogHistoryPreviewList({
  items,
  visibleCount,
  hasMore,
  onLoadMore,
  loadingMore,
  emptyMessage,
  onPressItem,
  loadMoreLabel = "load more logs",
  renderTitleAccessory,
  renderSubtitle,
  renderTrailing,
  rowTextLayout,
}: LogHistoryPreviewListProps) {
  const c = useFlareColors();
  const visibleItems = items.slice(0, visibleCount);

  return (
    <View>
      <LogHistoryList
        items={visibleItems}
        emptyMessage={emptyMessage}
        onPressItem={onPressItem}
        renderTitleAccessory={renderTitleAccessory}
        renderSubtitle={renderSubtitle}
        renderTrailing={renderTrailing}
        rowTextLayout={rowTextLayout}
      />
      {hasMore ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={loadMoreLabel}
          onPress={onLoadMore}
          disabled={loadingMore}
          style={({ pressed }) => [logHistoryListStyles.loadMoreRow, pressed && !loadingMore && { opacity: 0.7 }]}
        >
          {loadingMore ? (
            <ActivityIndicator color={c.primary} size="small" />
          ) : (
            <Text style={[logHistoryListStyles.loadMoreLabel, { color: c.primary }]}>{loadMoreLabel}</Text>
          )}
        </Pressable>
      ) : null}
    </View>
  );
}

export function LogHistoryList({
  items,
  emptyMessage,
  onPressItem,
  renderTitleAccessory,
  renderSubtitle,
  renderTrailing,
  rowTextLayout = "logsPill",
}: {
  items: LogHistoryListItem[];
  emptyMessage?: string;
  onPressItem?: (id: string) => void;
  /** Inline icon/badge immediately after the title (same row). */
  renderTitleAccessory?: (item: LogHistoryListItem) => ReactNode;
  /** Replaces default subtitle line when provided (return null to fall back). */
  renderSubtitle?: (item: LogHistoryListItem) => ReactNode;
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
        const titleAccessory = renderTitleAccessory?.(item) ?? null;
        const customSubtitle = renderSubtitle?.(item);
        const rowBody = (
          <>
            <View style={logHistoryListStyles.logTitleRow}>
              <Text
                style={[
                  primaryStyle,
                  logHistoryListStyles.logTitleText,
                  { color: titleColor },
                  item.completed ? logHistoryListStyles.logPrimaryCompleted : null,
                ]}
                numberOfLines={1}
              >
                {item.title}
              </Text>
              {titleAccessory}
            </View>
            {customSubtitle ??
              (whenLine ? (
                <Text style={[secondaryStyle, { color: c.textMuted }]} numberOfLines={1}>
                  {whenLine}
                </Text>
              ) : null)}
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
  /** Holds tray height on first load so the card does not jump when rows appear. */
  listTrayLoading: {
    minHeight: 132,
    alignItems: "center",
    justifyContent: "center",
  },
});

export function LogHistoryListLoading() {
  const c = useFlareColors();
  return (
    <View style={logHistoryCardStyles.listTrayLoading}>
      <ActivityIndicator color={c.primary} />
    </View>
  );
}

/** Bulb tip — standalone card, or `embedded` inside another card (e.g. My Meds reminders). */
export function LogHistoryTipRow({
  text,
  style,
  embedded,
}: {
  text: string;
  style?: StyleProp<ViewStyle>;
  embedded?: boolean;
}) {
  const c = useFlareColors();
  return (
    <View
      style={[
        logHistoryTipRowStyles.tipRow,
        embedded ? { backgroundColor: c.surfaceSubtle, borderRadius: 12 } : { backgroundColor: c.card },
        style,
      ]}
    >
      <Ionicons name="bulb-outline" size={18} color="#EAB308" accessibilityIgnoresInvertColors />
      <Text style={[logHistoryTipRowStyles.tipText, { color: c.textMuted }]}>{text}</Text>
    </View>
  );
}

export const logHistoryTipRowStyles = StyleSheet.create({
  tipRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: STACKED_DETAIL_ROW_EDGE,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: SCREEN_EDGE_PADDING,
  },
  tipText: {
    flex: 1,
    fontSize: FLARE_FONT_SIZE.muted,
    fontFamily: FLARE_FONT_FAMILY.regular,
    lineHeight: FLARE_LINE_HEIGHT.muted,
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
  logTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minWidth: 0,
  },
  logTitleText: { flexShrink: 1 },
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
  loadMoreRow: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: CARD_SECTION_INNER_GAP,
    marginBottom: CARD_SECTION_INNER_GAP,
  },
  loadMoreLabel: {
    fontSize: FLARE_FONT_SIZE.muted,
    fontFamily: FLARE_FONT_FAMILY.medium,
    textDecorationLine: "underline",
  },
});
