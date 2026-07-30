import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { ScrollView } from "../lib/scrollViews";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NewsFeedCard, newsFeedListStyles } from "../components/NewsFeed";
import { dashboardSnapshotByUserId } from "../lib/dashboardSnapshotCache";
import { NEWS_FEED_LOAD_MORE_BATCH } from "../lib/logHistoryConstants";
import { SCREEN_EDGE_PADDING } from "../lib/layoutConstants";
import { resolvePaginatedVisibleCount } from "../lib/paginatedLogList";
import { logHistoryListStyles } from "../components/LogHistoryList";
import { useFlareColors } from "../theme";

type SessionUser = { id: string };

export function LatestNewsScreen({ user }: { user: SessionUser }) {
  const c = useFlareColors();
  const insets = useSafeAreaInsets();
  const bottomScrollInset = Math.max(insets.bottom, 16) + SCREEN_EDGE_PADDING;
  const [newsItems, setNewsItems] = useState(() => dashboardSnapshotByUserId[user.id]?.newsItems ?? []);
  const [newsError, setNewsError] = useState<string | null>(() => dashboardSnapshotByUserId[user.id]?.newsError ?? null);
  const [newsLoading, setNewsLoading] = useState(() => {
    const snap = dashboardSnapshotByUserId[user.id];
    if (!snap) return true;
    return !(snap.newsItems.length > 0 || snap.newsError);
  });
  const [expandedCount, setExpandedCount] = useState(NEWS_FEED_LOAD_MORE_BATCH);

  useFocusEffect(
    useCallback(() => {
      const snap = dashboardSnapshotByUserId[user.id];
      if (!snap) return;
      setNewsItems(snap.newsItems);
      setNewsError(snap.newsError);
      setNewsLoading(!(snap.newsItems.length > 0 || snap.newsError));
      setExpandedCount(NEWS_FEED_LOAD_MORE_BATCH);
    }, [user.id]),
  );

  const visibleCount = useMemo(
    () => resolvePaginatedVisibleCount(newsItems.length, expandedCount, NEWS_FEED_LOAD_MORE_BATCH),
    [expandedCount, newsItems.length],
  );
  const visibleItems = useMemo(() => newsItems.slice(0, visibleCount), [newsItems, visibleCount]);
  const hasMore = newsItems.length > visibleCount;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.screen }}
      contentContainerStyle={{
        padding: SCREEN_EDGE_PADDING,
        paddingBottom: bottomScrollInset,
      }}
      showsVerticalScrollIndicator={false}
    >
      {newsLoading ? (
        <View style={{ paddingVertical: 24, alignItems: "center" }}>
          <ActivityIndicator size="small" color={c.primary} />
        </View>
      ) : newsError ? (
        <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: c.textMuted }}>{newsError}</Text>
      ) : newsItems.length === 0 ? (
        <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: c.textMuted }}>No news available right now.</Text>
      ) : (
        <View style={newsFeedListStyles.fullFeed}>
          {visibleItems.map((item) => (
            <NewsFeedCard key={item.link ?? item.title} item={item} variant="full" />
          ))}
          {hasMore ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="load more"
              onPress={() => setExpandedCount((count) => Math.min(count + NEWS_FEED_LOAD_MORE_BATCH, newsItems.length))}
              style={({ pressed }) => [logHistoryListStyles.loadMoreRow, pressed && { opacity: 0.7 }]}
            >
              <Text style={[logHistoryListStyles.loadMoreLabel, { color: c.primary }]}>load more</Text>
            </Pressable>
          ) : null}
        </View>
      )}
    </ScrollView>
  );
}
