import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { ScrollView } from "../lib/scrollViews";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScreenHeader } from "../components/MidnightLagoonScreenHeader";
import { NewsFeedCard, newsFeedListStyles } from "../components/NewsFeed";
import { dashboardSnapshotByUserId } from "../lib/dashboardSnapshotCache";
import { LOG_HISTORY_LOAD_MORE_BATCH } from "../lib/logHistoryConstants";
import { bottomTabBarScrollInset } from "../lib/layoutConstants";
import { mapNewsItems, newsApiBase } from "../lib/newsShared";
import { logHistoryListStyles } from "../components/LogHistoryList";
import { SPACING, TYPOGRAPHY } from "../designTokens";
import { useFlareColors } from "../theme";

type SessionUser = { id: string };

const NEWS_PAGE_SIZE = LOG_HISTORY_LOAD_MORE_BATCH;

export function LatestNewsScreen({ user }: { user: SessionUser }) {
  const c = useFlareColors();
  const insets = useSafeAreaInsets();
  const bottomScrollInset = bottomTabBarScrollInset(insets.bottom);
  const [newsItems, setNewsItems] = useState(() => dashboardSnapshotByUserId[user.id]?.newsItems ?? []);
  const [newsError, setNewsError] = useState<string | null>(() => dashboardSnapshotByUserId[user.id]?.newsError ?? null);
  const [newsLoading, setNewsLoading] = useState(() => {
    const snap = dashboardSnapshotByUserId[user.id];
    if (!snap) return true;
    return !(snap.newsItems.length > 0 || snap.newsError);
  });
  const [expandedCount, setExpandedCount] = useState(NEWS_PAGE_SIZE);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      const seed = dashboardSnapshotByUserId[user.id];
      const hasCachedNews = (seed?.newsItems.length ?? 0) > 0;
      if (hasCachedNews) {
        setNewsItems(seed!.newsItems);
        setNewsError(seed!.newsError);
        setNewsLoading(false);
      } else {
        setNewsLoading(true);
      }
      setExpandedCount(NEWS_PAGE_SIZE);

      void (async () => {
        try {
          const apiBase = newsApiBase();
          if (!apiBase) {
            if (cancelled) return;
            setNewsItems([]);
            setNewsError("News unavailable");
            setNewsLoading(false);
            return;
          }
          const newsUrl = apiBase.includes("/functions/v1") ? `${apiBase}/news` : `${apiBase}/api/news`;
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 6000);
          const response = await fetch(newsUrl, { signal: controller.signal });
          clearTimeout(timeout);
          if (!response.ok) throw new Error("news request failed");
          const json = await response.json();
          const items = mapNewsItems(json);
          if (cancelled) return;
          setNewsItems(items);
          setNewsError(null);
          setNewsLoading(false);
          const prev = dashboardSnapshotByUserId[user.id];
          if (prev) {
            dashboardSnapshotByUserId[user.id] = { ...prev, newsItems: items, newsError: null };
          }
        } catch {
          if (cancelled) return;
          if (!hasCachedNews) {
            setNewsItems([]);
            setNewsError("Unable to load latest news.");
          }
          setNewsLoading(false);
          const prev = dashboardSnapshotByUserId[user.id];
          if (prev && !hasCachedNews) {
            dashboardSnapshotByUserId[user.id] = {
              ...prev,
              newsItems: [],
              newsError: "Unable to load latest news.",
            };
          }
        }
      })();

      return () => {
        cancelled = true;
      };
    }, [user.id]),
  );

  const visibleCount = useMemo(() => {
    if (newsItems.length === 0) return NEWS_PAGE_SIZE;
    if (newsItems.length <= NEWS_PAGE_SIZE) return newsItems.length;
    return Math.min(expandedCount, newsItems.length);
  }, [expandedCount, newsItems.length]);

  const visibleItems = useMemo(() => newsItems.slice(0, visibleCount), [newsItems, visibleCount]);
  const hasMore = newsItems.length > visibleCount;

  const loadMore = useCallback(() => {
    setExpandedCount((count) => Math.min(count + NEWS_PAGE_SIZE, newsItems.length));
  }, [newsItems.length]);

  return (
    <View style={[styles.screen, { backgroundColor: c.screen }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomScrollInset }]}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader title="Latest News" />
        {newsLoading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="small" color={c.primary} />
          </View>
        ) : newsError ? (
          <Text style={[styles.emptyText, { color: c.textSecondary, fontFamily: TYPOGRAPHY.fontFamily.regular }]}>{newsError}</Text>
        ) : newsItems.length === 0 ? (
          <Text style={[styles.emptyText, { color: c.textSecondary, fontFamily: TYPOGRAPHY.fontFamily.regular }]}>No news available right now.</Text>
        ) : (
          <>
            <View style={newsFeedListStyles.fullFeed}>
              {visibleItems.map((item) => (
                <NewsFeedCard key={item.link ?? item.title} item={item} variant="full" />
              ))}
            </View>
            {hasMore ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="load more"
                onPress={loadMore}
                style={({ pressed }) => [
                  logHistoryListStyles.loadMoreRow,
                  { paddingBottom: SPACING.sm },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Text style={[logHistoryListStyles.loadMoreLabel, { color: c.primary }]}>load more</Text>
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
    paddingVertical: SPACING.lg,
    alignItems: "center",
  },
  emptyText: {
    fontSize: TYPOGRAPHY.fontSize.md,
  },
});
