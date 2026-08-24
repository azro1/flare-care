import React from "react";
import type { LucideIcon } from "lucide-react-native";
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
import { FLARE_CHROME_LUCIDE, FlareLucideIcon } from "../lib/flareLucideIcons";
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
  FLARE_INLINE_ACTION_LINK,
  FLARE_LINE_HEIGHT,
  NAV_ROW_CHEVRON_SIZE,
  SECTION_TITLE_MARGIN_BOTTOM,
  LOG_TRAY_SECOND_LINE_GAP,
  ONE_LINE_TRAY_PADDING,
  ONE_LINE_TRAY_SEPARATOR_PAD,
  TRAY_ROW_PADDING_H,
  TRAY_ROW_PADDING_Y,
  flareTextHasDigit,
} from "../lib/layoutConstants";
import { useFlareColors } from "../theme";

export {
  LOG_HISTORY_LOAD_MORE_BATCH,
  LOG_HISTORY_RECENT_PREVIEW_COUNT,
  LOG_HISTORY_WIZARD_LOAD_MORE_BATCH,
} from "../lib/logHistoryConstants";

/** Row pad so text clears the hairline without growing the outer tray inset. */
export function oneLineTraySeparatorRowStyle(index: number, count: number): ViewStyle {
  return {
    paddingTop: index > 0 ? ONE_LINE_TRAY_SEPARATOR_PAD : 0,
    paddingBottom: index < count - 1 ? ONE_LINE_TRAY_SEPARATOR_PAD : 0,
  };
}

/** @deprecated Use `oneLineTraySeparatorRowStyle`. */
export const trayInCardSeparatorRowStyle = oneLineTraySeparatorRowStyle;

export type LogHistoryListItem = {
  id: string;
  title: string;
  whenIso?: string;
  /** When set, shown instead of formatting `whenIso` (e.g. entry count on dashboard). */
  subtitle?: string;
  /** Shown when neither `subtitle` nor `whenIso` is set. */
  whenFallback?: string;
  /** When true with trailingText, shows a checkmark beside the count. */
  completed?: boolean;
  /** Shown on the right (e.g. Today summary counts). */
  trailingText?: string;
  /** Smaller + `textSecondary` title (e.g. dashboard “Next appointment”). */
  titleSecondary?: boolean;
  accessibilityLabel?: string;
};

/** Timestamp log row — title + when line from `whenIso` (history lists, bowel). */
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
    whenIso: whenIso || undefined,
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

/**
 * One-line link tray — white card + dark inset tray of title-only rows (Account, Legal).
 * Use this for **one-liners**. Two-line Logs / history rows use `LogHistoryList` instead.
 * Outer pad `ONE_LINE_TRAY_PADDING`; hairline clearance `ONE_LINE_TRAY_SEPARATOR_PAD`.
 */
export function OneLineTrayList({
  items,
  onPressItem,
  emptyMessage,
  renderTrailing,
  renderSubtitle,
}: {
  items: LogHistoryListItem[];
  onPressItem?: (id: string) => void;
  emptyMessage?: string;
  renderTrailing?: (item: LogHistoryListItem) => ReactNode;
  renderSubtitle?: (item: LogHistoryListItem) => ReactNode;
}) {
  const c = useFlareColors();
  return (
    <LogHistoryCard>
      <View
        style={[
          logHistoryListStyles.logList,
          {
            backgroundColor: c.surfaceSubtle,
            paddingVertical: ONE_LINE_TRAY_PADDING,
          },
        ]}
      >
        <LogHistoryList
          items={items}
          emptyMessage={emptyMessage}
          rowTextLayout="default"
          titleRegular
          rowPaddingHorizontal={ONE_LINE_TRAY_PADDING}
          rowPaddingVertical={4}
          insetTray={false}
          getRowStyle={(_item, index) => oneLineTraySeparatorRowStyle(index, items.length)}
          renderTrailing={renderTrailing}
          renderSubtitle={renderSubtitle}
          onPressItem={onPressItem}
        />
      </View>
    </LogHistoryCard>
  );
}

/** @deprecated Use `OneLineTrayList`. */
export const TrayInCardList = OneLineTrayList;

/** Shared empty list — pass the tracker/wizard icon; copy defaults to “Nothing here yet”. */
export function LogHistoryEmptyState({
  icon,
  showTitle = true,
}: {
  icon: LucideIcon;
  /** Set false for icon-only empty trays (e.g. Supplies setup). */
  showTitle?: boolean;
}) {
  const c = useFlareColors();
  return (
    <View style={logHistoryEmptyStateStyles.wrap}>
      <View
        style={[
          logHistoryEmptyStateStyles.icon,
          !showTitle && logHistoryEmptyStateStyles.iconOnly,
          { backgroundColor: c.surfaceSubtle },
        ]}
      >
        <FlareLucideIcon icon={icon} size={28} color={c.primary} />
      </View>
      {showTitle ? (
        <Text style={[logHistoryEmptyStateStyles.title, { color: c.textMuted }]}>Nothing here yet</Text>
      ) : null}
    </View>
  );
}

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
  rowTextLayout?: "default" | "compact";
  selectionMode?: boolean;
  selectedIds?: ReadonlySet<string>;
  onToggleSelect?: (id: string) => void;
  onLongPressItem?: (id: string) => void;
  rowPaddingHorizontal?: number;
  rowPaddingVertical?: number;
  renderLeading?: (item: LogHistoryListItem) => ReactNode;
  getRowStyle?: (item: LogHistoryListItem, index: number) => StyleProp<ViewStyle>;
  multilineTitle?: boolean;
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
  selectionMode,
  selectedIds,
  onToggleSelect,
  onLongPressItem,
  rowPaddingHorizontal,
  rowPaddingVertical,
  renderLeading,
  getRowStyle,
  multilineTitle,
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
        selectionMode={selectionMode}
        selectedIds={selectedIds}
        onToggleSelect={onToggleSelect}
        onLongPressItem={onLongPressItem}
        rowPaddingHorizontal={rowPaddingHorizontal}
        rowPaddingVertical={rowPaddingVertical}
        renderLeading={renderLeading}
        getRowStyle={getRowStyle}
        multilineTitle={multilineTitle}
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
  rowTextLayout = "compact",
  selectionMode = false,
  selectedIds,
  onToggleSelect,
  onLongPressItem,
  rowPaddingHorizontal,
  rowPaddingVertical,
  renderLeading,
  getRowStyle,
  multilineTitle,
  insetTray = true,
  titleRegular = false,
  rowSeparator = "hairline",
}: {
  items: LogHistoryListItem[];
  emptyMessage?: string;
  onPressItem?: (id: string) => void;
  /** Inline icon/badge immediately after the title (same row). */
  renderTitleAccessory?: (item: LogHistoryListItem) => ReactNode;
  /** Replaces default subtitle line when provided (return null to fall back). */
  renderSubtitle?: (item: LogHistoryListItem) => ReactNode;
  renderTrailing?: (item: LogHistoryListItem) => ReactNode;
  /** Title/subtitle typography. Default `compact` (13). Pass `default` for body (14) titles. */
  rowTextLayout?: "default" | "compact";
  /** Title-only link rows (`OneLineTrayList` — Account, Legal) — muted size, regular weight. */
  titleRegular?: boolean;
  selectionMode?: boolean;
  selectedIds?: ReadonlySet<string>;
  onToggleSelect?: (id: string) => void;
  onLongPressItem?: (id: string) => void;
  /** Override `logRow` horizontal padding. Default is `TRAY_ROW_PADDING_H` — only pass to deviate. */
  rowPaddingHorizontal?: number;
  /** Override `logRow` vertical padding. Default is `TRAY_ROW_PADDING_Y` — only pass to deviate. */
  rowPaddingVertical?: number;
  /** Badge or icon before the title column (e.g. Bristol type number). */
  renderLeading?: (item: LogHistoryListItem) => ReactNode;
  getRowStyle?: (item: LogHistoryListItem, index: number) => StyleProp<ViewStyle>;
  /** Full-width body text per row (e.g. talking points) — no single-line clamp. */
  multilineTitle?: boolean;
  /** Grey inset tray behind rows. Pass `false` to sit on the white card (e.g. dashboard appointment). */
  insetTray?: boolean;
  /** `gap` = no hairline (spacing comes from `getRowStyle` / pad). */
  rowSeparator?: "hairline" | "gap";
}) {
  if (items.length === 0 && emptyMessage) {
    return <EmptyTrayMessage message={emptyMessage} />;
  }
  const c = useFlareColors();
  return (
    <View
      style={[
        insetTray ? logHistoryListStyles.logList : null,
        { backgroundColor: insetTray ? c.surfaceSubtle : "transparent" },
      ]}
    >
      {items.map((item, index) => {
        const textSubtitle = item.trailingText !== undefined ? undefined : item.subtitle;
        const whenFormatted =
          item.trailingText !== undefined || textSubtitle
            ? ""
            : item.whenIso
              ? formatLogWhenLine(item.whenIso)
              : (item.whenFallback ?? "");
        const whenLine = textSubtitle ?? whenFormatted;
        const titleColor =
          item.trailingText !== undefined || item.titleSecondary
            ? c.textSecondary
            : c.text;
        const useCompactText =
          rowTextLayout === "compact" || item.trailingText !== undefined || !!item.titleSecondary;
        const primaryStyle = useCompactText
          ? logHistoryListStyles.logPrimaryToday
          : titleRegular
            ? logHistoryListStyles.logPrimaryRegular
            : logHistoryListStyles.logPrimary;
        /** Numbers / dates / times under titles — caption; letter-only text stays muted. */
        const secondLineNeedsCaption = !textSubtitle || flareTextHasDigit(textSubtitle);
        const secondLineStyle = secondLineNeedsCaption
          ? logHistoryListStyles.logSecondaryWhen
          : logHistoryListStyles.logSecondary;
        const titleAccessory = renderTitleAccessory?.(item) ?? null;
        const customSubtitle = renderSubtitle?.(item);
        const reserveSubtitleLine = item.trailingText === undefined && !multilineTitle;
        const showSecondLine = reserveSubtitleLine && (customSubtitle != null || !!whenLine);
        /** Title-only / count rows match title+subtitle height in trays; flat-on-card lists stay dense. */
        const centerSingleLineBrowse = insetTray && !showSecondLine && !multilineTitle;
        const leadingNode = renderLeading?.(item) ?? null;
        const extraRowStyle = getRowStyle?.(item, index) ?? null;
        const isSelected = !!selectedIds?.has(item.id);
        const trailingNode = selectionMode ? (
          <View style={logHistoryListStyles.logSelectionCircle}>
            <FlareLucideIcon
              icon={isSelected ? FLARE_CHROME_LUCIDE.checkCircle : FLARE_CHROME_LUCIDE.circle}
              size={22}
              color={isSelected ? c.primary : c.textMuted}
            />
          </View>
        ) : item.trailingText ? (
          <View style={logHistoryListStyles.logTrailingWithStatus}>
            {item.completed ? (
              <FlareLucideIcon icon={FLARE_CHROME_LUCIDE.checkCircle} size={18} color={c.primary} />
            ) : null}
            <Text style={[logHistoryListStyles.trailingValueToday, { color: c.text }]}>{item.trailingText}</Text>
          </View>
        ) : renderTrailing ? (
          renderTrailing(item)
        ) : onPressItem ? (
          <FlareLucideIcon icon={FLARE_CHROME_LUCIDE.forward} size={NAV_ROW_CHEVRON_SIZE} color={c.text} />
        ) : null;
        const rowContent = (
          <>
            {leadingNode ? <View style={logHistoryListStyles.logLeading}>{leadingNode}</View> : null}
            <View
              style={[
                logHistoryListStyles.logMain,
                centerSingleLineBrowse ? logHistoryListStyles.logMainSingleLineBrowse : null,
              ]}
            >
              <View style={logHistoryListStyles.logTitleRow}>
                <Text
                  style={[
                    multilineTitle ? logHistoryListStyles.logPrimaryRegular : primaryStyle,
                    logHistoryListStyles.logTitleText,
                    { color: titleColor },
                  ]}
                  numberOfLines={multilineTitle ? undefined : 1}
                >
                  {item.title}
                </Text>
                {titleAccessory}
              </View>
              {showSecondLine ? (
                <View style={logHistoryListStyles.logSecondLine}>
                  {customSubtitle ??
                    (whenLine ? (
                      <Text style={[secondLineStyle, { color: c.textMuted }]} numberOfLines={1}>
                        {whenLine}
                      </Text>
                    ) : null)}
                </View>
              ) : null}
            </View>
            {trailingNode ? <View style={logHistoryListStyles.logActions}>{trailingNode}</View> : null}
          </>
        );
        const rowBorder =
          rowSeparator === "hairline" && index !== items.length - 1
            ? { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.cardBorder }
            : null;
        const rowPadStyle =
          rowPaddingHorizontal != null || rowPaddingVertical != null
            ? {
                ...(rowPaddingHorizontal != null ? { paddingHorizontal: rowPaddingHorizontal } : {}),
                ...(rowPaddingVertical != null ? { paddingVertical: rowPaddingVertical } : {}),
              }
            : null;
        const rowPressStyle = ({ pressed }: { pressed: boolean }) => [
          logHistoryListStyles.logRow,
          leadingNode ? logHistoryListStyles.logRowWithLeading : null,
          rowPadStyle,
          rowBorder,
          extraRowStyle,
          pressed && { opacity: 0.7 },
        ];
        const selectionLabel = isSelected ? "Selected" : "Not selected";
        const defaultA11y =
          item.accessibilityLabel ?? `${item.title}. ${whenLine}. View details`;
        const selectionA11y = `${item.title}. ${selectionLabel}`;

        if (selectionMode && onToggleSelect) {
          return (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityLabel={selectionA11y}
              accessibilityState={{ selected: isSelected }}
              onPress={() => onToggleSelect(item.id)}
              style={rowPressStyle}
            >
              {rowContent}
            </Pressable>
          );
        }

        return onPressItem ? (
          <Pressable
            key={item.id}
            accessibilityRole="button"
            accessibilityLabel={defaultA11y}
            onPress={() => onPressItem(item.id)}
            onLongPress={onLongPressItem ? () => onLongPressItem(item.id) : undefined}
            delayLongPress={400}
            style={rowPressStyle}
          >
            {rowContent}
          </Pressable>
        ) : (
          <View
            key={item.id}
            style={[
              logHistoryListStyles.logRow,
              leadingNode ? logHistoryListStyles.logRowWithLeading : null,
              rowPadStyle,
              rowBorder,
              extraRowStyle,
            ]}
            accessibilityLabel={defaultA11y}
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

export const logHistoryListStyles = StyleSheet.create({
  logList: { borderRadius: 14, overflow: "hidden" },
  logRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: TRAY_ROW_PADDING_H,
    paddingVertical: TRAY_ROW_PADDING_Y,
    gap: STACKED_DETAIL_ROW_EDGE,
  },
  logRowWithLeading: { alignItems: "flex-start" },
  logLeading: { flexShrink: 0 },
  logSelectionCircle: {
    width: 22,
    alignItems: "center",
    flexShrink: 0,
  },
  logMain: { flex: 1, minWidth: 0 },
  /** Title-only browse rows — same height as title + subtitle; title vertically centred with chevron. */
  logMainSingleLineBrowse: {
    minHeight: FLARE_LINE_HEIGHT.body + LOG_TRAY_SECOND_LINE_GAP + FLARE_LINE_HEIGHT.muted,
    justifyContent: "center",
  },
  logTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minWidth: 0,
  },
  logTitleText: { flexShrink: 1 },
  logPrimary: { fontSize: FLARE_FONT_SIZE.body, fontFamily: FLARE_FONT_FAMILY.medium },
  logPrimaryRegularBody: { fontSize: FLARE_FONT_SIZE.body, fontFamily: FLARE_FONT_FAMILY.regular },
  logPrimaryRegular: { fontSize: FLARE_FONT_SIZE.muted, fontFamily: FLARE_FONT_FAMILY.regular },
  /** Dashboard Today summary rows — slightly smaller than history browse rows. */
  logPrimaryToday: { fontSize: FLARE_FONT_SIZE.muted, fontFamily: FLARE_FONT_FAMILY.regular },
  /** Gap above second line (when / subtitle) — `LOG_TRAY_SECOND_LINE_GAP` (includes +1 optical pad). */
  logSecondLine: { marginTop: LOG_TRAY_SECOND_LINE_GAP },
  logSecondary: {
    fontSize: FLARE_FONT_SIZE.muted,
    fontFamily: FLARE_FONT_FAMILY.regular,
    lineHeight: FLARE_LINE_HEIGHT.muted,
  },
  /** Date/time under list titles — digits read large at muted, so use caption. */
  logSecondaryWhen: {
    fontSize: FLARE_FONT_SIZE.caption,
    fontFamily: FLARE_FONT_FAMILY.regular,
    lineHeight: FLARE_LINE_HEIGHT.caption,
  },
  logActions: { flexDirection: "row", alignItems: "center", flexShrink: 0 },
  logTrailingWithStatus: { flexDirection: "row", alignItems: "center", gap: 8 },
  trailingValue: { fontSize: FLARE_FONT_SIZE.body, fontFamily: FLARE_FONT_FAMILY.medium },
  /** Today counts (e.g. 2/5) — caption so digits don't outsize titles. */
  trailingValueToday: { fontSize: FLARE_FONT_SIZE.caption, fontFamily: FLARE_FONT_FAMILY.medium },
  logIconBtn: { padding: 6 },
  loadMoreRow: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: CARD_SECTION_INNER_GAP,
    marginBottom: CARD_SECTION_INNER_GAP,
  },
  loadMoreLabel: {
    ...FLARE_INLINE_ACTION_LINK,
    textDecorationLine: "underline",
  },
});

const logHistoryEmptyStateStyles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    paddingVertical: 20,
    paddingHorizontal: 8,
  },
  icon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SECTION_TITLE_MARGIN_BOTTOM,
  },
  iconOnly: { marginBottom: 0 },
  title: {
    fontSize: FLARE_FONT_SIZE.sectionTitle,
    fontFamily: FLARE_FONT_FAMILY.bold,
    lineHeight: FLARE_LINE_HEIGHT.sectionTitle,
    marginBottom: 6,
  },
});
