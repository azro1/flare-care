import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import { Image, Linking, Platform, Pressable, Share, StyleSheet, Text, View } from "react-native";
import type { DashboardNewsItem } from "../lib/dashboardSnapshotCache";
import { formatUkDate } from "../lib/formatUkDate";
import { FLARE_FONT_FAMILY, FLARE_FONT_SIZE, FLARE_INLINE_ACTION_LINK, FLARE_LINE_HEIGHT, HOME_TILE_GAP, SECTION_TITLE_MARGIN_BOTTOM, SECTION_TITLE_MARGIN_TOP } from "../lib/layoutConstants";
import { resolveNewsImageUri } from "../lib/newsShared";
import { useFlareColors } from "../theme";

export function NewsThumbnail({ imageUrl, iconSize = 30 }: { imageUrl?: string | null; iconSize?: number }) {
  const c = useFlareColors();
  const candidates = useMemo(() => {
    const trimmed = (imageUrl && String(imageUrl).trim()) || "";
    if (!trimmed) return [] as string[];
    const primary = resolveNewsImageUri(trimmed);
    const list: string[] = [];
    if (primary) list.push(primary);
    if (!list.includes(trimmed)) list.push(trimmed);
    return list;
  }, [imageUrl]);

  const [index, setIndex] = useState(0);
  useEffect(() => {
    setIndex(0);
  }, [candidates.join("|")]);

  if (!candidates.length || index >= candidates.length) {
    return <Ionicons name="newspaper-outline" size={iconSize} color={c.primary} style={{ opacity: 0.45 }} />;
  }

  return (
    <Image
      source={{ uri: candidates[index] }}
      style={styles.imageAsset}
      resizeMode="cover"
      onError={() => setIndex((i) => i + 1)}
    />
  );
}

type NewsFeedCardProps = {
  item: DashboardNewsItem;
  variant: "shelf" | "full";
  width?: number;
};

export function NewsFeedCard({ item, variant, width }: NewsFeedCardProps) {
  const c = useFlareColors();
  const isShelf = variant === "shelf";

  const openArticle = () => {
    if (item.link) Linking.openURL(item.link);
  };

  const shareArticle = () => {
    const message = item.link ? `${item.title}\n${item.link}` : item.title;
    void Share.share({
      message,
      title: item.title,
      ...(item.link && Platform.OS === "ios" ? { url: item.link } : null),
    }).catch(() => {
      // user dismissed / share unavailable
    });
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={item.title}
      onPress={openArticle}
      style={[
        styles.card,
        isShelf ? styles.cardShelf : styles.cardFull,
        { backgroundColor: c.newsCardBg },
        width != null ? { width } : null,
      ]}
    >
      <View style={[styles.imageWrap, isShelf ? styles.imageWrapShelf : styles.imageWrapFull, { backgroundColor: c.newsImageBg }]}>
        <NewsThumbnail imageUrl={item.imageUrl} iconSize={isShelf ? 24 : 30} />
      </View>
      <View style={isShelf ? styles.bodyShelf : styles.bodyFull}>
        <Text
          style={[styles.title, isShelf ? styles.titleShelf : null, { color: c.text }]}
          numberOfLines={isShelf ? 1 : 2}
          ellipsizeMode="tail"
        >
          {item.title}
        </Text>
        <View style={styles.footer}>
          <Text style={[styles.meta, { color: c.textMuted, flex: 1 }]} numberOfLines={1}>
            {item.source}
            {!isShelf && item.publishedAt ? ` · ${formatUkDate(item.publishedAt)}` : ""}
          </Text>
          {!isShelf ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Share ${item.title}`}
              hitSlop={10}
              onPress={(event) => {
                event.stopPropagation?.();
                shareArticle();
              }}
              style={({ pressed }) => [styles.shareButton, pressed && { opacity: 0.7 }]}
            >
              <Ionicons
                name={Platform.OS === "ios" ? "share-outline" : "share-social-outline"}
                size={20}
                color={c.textMuted}
                accessibilityIgnoresInvertColors
              />
            </Pressable>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

export function NewsSectionHeader({
  title,
  onSeeAll,
  showSeeAll,
  titleVariant = "subtle",
}: {
  title?: string;
  onSeeAll?: () => void;
  showSeeAll?: boolean;
  /** `focus` matches dashboard shelf headings (Today, More, Latest News). */
  titleVariant?: "focus" | "subtle";
}) {
  const c = useFlareColors();
  if (!title && !(showSeeAll && onSeeAll)) return null;
  return (
    <View style={[styles.sectionHeader, !title ? styles.sectionHeaderTrailingOnly : null]}>
      {title ? (
        <Text
          style={[
            titleVariant === "focus" ? styles.sectionTitleFocus : styles.sectionTitle,
            { color: c.text },
          ]}
        >
          {title}
        </Text>
      ) : (
        <View />
      )}
      {showSeeAll && onSeeAll ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="See all news"
          onPress={onSeeAll}
          hitSlop={8}
          style={({ pressed }) => pressed && { opacity: 0.7 }}
        >
          <Text style={[styles.seeAll, { color: c.primary }]}>See all</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export const newsFeedListStyles = StyleSheet.create({
  shelfRow: {
    flexDirection: "row",
    gap: HOME_TILE_GAP,
    paddingRight: 2,
  },
  fullFeed: { gap: 16 },
});

const styles = StyleSheet.create({
  imageAsset: {
    width: "100%",
    height: "100%",
  },
  card: {
    borderRadius: 12,
    overflow: "hidden",
  },
  cardShelf: {},
  cardFull: {
    width: "100%",
    paddingHorizontal: 14,
    paddingTop: 14,
  },
  imageWrap: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  imageWrapShelf: {
    aspectRatio: 16 / 8,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  imageWrapFull: {
    aspectRatio: 16 / 10,
    borderRadius: 8,
  },
  bodyShelf: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 10,
    gap: 4,
  },
  bodyFull: {
    paddingTop: 14,
    paddingBottom: 14,
    gap: 6,
  },
  title: {
    fontSize: FLARE_FONT_SIZE.body,
    fontFamily: FLARE_FONT_FAMILY.bold,
    lineHeight: FLARE_LINE_HEIGHT.body,
  },
  titleShelf: {
    fontSize: FLARE_FONT_SIZE.muted,
    lineHeight: FLARE_LINE_HEIGHT.muted,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  meta: {
    fontSize: 11,
    fontFamily: FLARE_FONT_FAMILY.regular,
  },
  shareButton: {
    padding: 4,
    marginRight: -4,
    marginBottom: -4,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: SECTION_TITLE_MARGIN_TOP,
    marginBottom: 12,
  },
  sectionHeaderTrailingOnly: {
    justifyContent: "flex-end",
    marginTop: 0,
  },
  sectionTitle: {
    fontSize: FLARE_FONT_SIZE.body,
    fontFamily: FLARE_FONT_FAMILY.bold,
  },
  sectionTitleFocus: {
    fontSize: FLARE_FONT_SIZE.sectionTitle,
    fontFamily: FLARE_FONT_FAMILY.bold,
  },
  seeAll: {
    ...FLARE_INLINE_ACTION_LINK,
  },
});
