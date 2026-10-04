/**
 * Log list in the Midnight Lagoon style: one card of tray rows, a "load more" link,
 * and an empty state. Used by the Symptom, Medication and Wellbeing history screens
 * so they match the rest of the redesign instead of the old log-list styling.
 */
import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { ScrollView } from "../lib/scrollViews";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { LucideIcon } from "lucide-react-native";
import { Card } from "./MidnightLagoonCard";
import { TrayRow } from "./MidnightLagoonTray";
import { FlareLucideIcon } from "../lib/flareLucideIcons";
import { formatLogWhenLine } from "../lib/logDisplay";
import { SPACING, TYPOGRAPHY } from "../designTokens";
import { useFlareColors } from "../theme";

export type MidnightLagoonLogListItem = {
  id: string;
  label: string;
  /** ISO timestamp, shown as the row's right-hand value. */
  whenIso?: string | null;
};

type Props = {
  items: MidnightLagoonLogListItem[];
  visibleCount: number;
  hasMore: boolean;
  loading: boolean;
  loadingMore: boolean;
  icon: LucideIcon;
  emptyText: string;
  onPressItem: (id: string) => void;
  onLoadMore: () => void;
  onLongPressItem?: (id: string) => void;
};

export function MidnightLagoonLogList({
  items,
  visibleCount,
  hasMore,
  loading,
  loadingMore,
  icon,
  emptyText,
  onPressItem,
  onLoadMore,
  onLongPressItem,
}: Props) {
  const colors = useFlareColors();
  const insets = useSafeAreaInsets();
  const visible = items.slice(0, visibleCount);
  const showLoading = loading && items.length === 0;

  return (
    <View style={[styles.screen, { backgroundColor: colors.screen }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 16) + 24 }]}
      >
        {showLoading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : visible.length === 0 ? (
          <Card>
            <View style={styles.emptyWrap}>
              <FlareLucideIcon icon={icon} size={40} color={colors.textSecondary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary, fontFamily: TYPOGRAPHY.fontFamily.regular }]}>
                {emptyText}
              </Text>
            </View>
          </Card>
        ) : (
          <>
            <Card noPadding style={styles.listCard}>
              {visible.map((item) => (
                <TrayRow
                  key={item.id}
                  icon={icon}
                  label={item.label}
                  value={formatLogWhenLine(item.whenIso)}
                  showChevron
                  onPress={() => onPressItem(item.id)}
                  onLongPress={onLongPressItem ? () => onLongPressItem(item.id) : undefined}
                />
              ))}
            </Card>
            {hasMore ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="load more logs"
                onPress={onLoadMore}
                disabled={loadingMore}
                style={({ pressed }) => [styles.loadMore, pressed && !loadingMore && { opacity: 0.7 }]}
              >
                {loadingMore ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Text style={[styles.loadMoreText, { color: colors.primary, fontFamily: TYPOGRAPHY.fontFamily.medium }]}>
                    load more logs
                  </Text>
                )}
              </Pressable>
            ) : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: SPACING.screen,
    paddingTop: SPACING.lg,
  },
  loadingWrap: {
    paddingVertical: SPACING.xl,
    alignItems: "center",
  },
  listCard: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  emptyWrap: {
    alignItems: "center",
    paddingVertical: SPACING.xl,
    gap: SPACING.md,
  },
  emptyText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    textAlign: "center",
  },
  loadMore: {
    paddingVertical: SPACING.md,
    alignItems: "center",
  },
  loadMoreText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
  },
});
