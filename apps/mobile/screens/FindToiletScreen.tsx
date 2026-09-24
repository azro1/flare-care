/**
 * Find a Toilet — nearby list from GB Toilet Map; Directions opens Apple/Google Maps.
 * Honesty + attribution required (CC BY 4.0). Not an authority on open/access.
 */
import React, { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LogHistoryCard } from "../components/LogHistoryList";
import {
  CARD_INNER_PADDING,
  CARD_SECTION_INNER_GAP,
  FLARE_FONT_FAMILY,
  FLARE_FONT_SIZE,
  FLARE_INLINE_ACTION_LINK,
  FLARE_LINE_HEIGHT,
  INSTRUCTION_CARD_RADIUS,
  SCREEN_EDGE_PADDING,
  STACKED_LINE_GAP,
  TRAY_ROW_PADDING_H,
  TRAY_ROW_PADDING_Y,
  bottomTabBarScrollInset,
} from "../lib/layoutConstants";
import { FlareLucideIcon } from "../lib/flareLucideIcons";
import {
  FIND_TOILET_ATTRIBUTION,
  FIND_TOILET_ATTRIBUTION_URL,
  FIND_TOILET_DISTANCE_ICON,
  fetchNearbyToilets,
  formatToiletDistance,
  formatToiletLastChecked,
  openToiletDirections,
  requestUserLocation,
  toiletBadgeLabels,
  type NearbyToilet,
  type UserCoords,
} from "../lib/findToiletShared";
import { useFlareColors } from "../theme";

export function FindToiletScreen() {
  const c = useFlareColors();
  const insets = useSafeAreaInsets();
  const bottomScrollInset = bottomTabBarScrollInset(insets.bottom);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toilets, setToilets] = useState<NearbyToilet[]>([]);
  const [attribution, setAttribution] = useState(FIND_TOILET_ATTRIBUTION);
  const [attributionUrl, setAttributionUrl] = useState(FIND_TOILET_ATTRIBUTION_URL);
  const lastCoordsRef = useRef<UserCoords | null>(null);

  const refresh = useCallback(async (opts?: { reuseLocation?: boolean }) => {
    setLoading(true);
    setError(null);
    try {
      // Try again after a fetch error should not re-hit location (Android lock/permission flash).
      let coords = opts?.reuseLocation ? lastCoordsRef.current : null;
      if (!coords) {
        coords = await requestUserLocation();
        lastCoordsRef.current = coords;
      }
      const result = await fetchNearbyToilets(coords);
      setToilets(result.toilets);
      setAttribution(result.attribution);
      setAttributionUrl(result.attributionUrl);
    } catch (e) {
      setToilets([]);
      setError(e instanceof Error ? e.message : "Couldn't find toilets nearby");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: c.screen }]}
      contentContainerStyle={[styles.content, { paddingBottom: bottomScrollInset + 24 }]}
    >
      <LogHistoryCard style={styles.shellCard}>
        <Text style={[styles.lead, { color: c.text }]}>Find a Toilet</Text>
        <Text style={[styles.support, { color: c.textMuted }]}>
          Nearby publicly accessible toilets when you need one.
        </Text>

        {loading ? (
          <View style={styles.loadingBlock}>
            <ActivityIndicator color={c.primary} />
            <Text style={[styles.loadingCopy, { color: c.textMuted }]}>Finding toilets near you…</Text>
          </View>
        ) : error ? (
          <View style={styles.errorBlock}>
            <Text style={[styles.errorCopy, { color: c.text }]}>{error}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Try again"
              onPress={() => void refresh({ reuseLocation: true })}
              hitSlop={8}
            >
              <Text style={[styles.retry, { color: c.primary }]}>Try again</Text>
            </Pressable>
          </View>
        ) : toilets.length === 0 ? (
          <Text style={[styles.emptyCopy, { color: c.textMuted }]}>
            No toilets found nearby. Try moving closer to a town or street.
          </Text>
        ) : (
          <View style={[styles.tray, { backgroundColor: c.surfaceSubtle }]}>
            {toilets.map((toilet, index) => {
              const badges = toiletBadgeLabels(toilet);
              const lastChecked = formatToiletLastChecked(toilet.verifiedAt || toilet.updatedAt);
              const showBorder = index < toilets.length - 1;
              return (
                <View
                  key={toilet.id}
                  style={[
                    styles.row,
                    showBorder
                      ? { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.cardBorder }
                      : null,
                  ]}
                >
                  <View style={styles.rowText}>
                    <View style={styles.distanceRow}>
                      <FlareLucideIcon
                        icon={FIND_TOILET_DISTANCE_ICON}
                        size={FLARE_FONT_SIZE.caption}
                        color={c.textMuted}
                      />
                      <Text style={[styles.distance, { color: c.textMuted }]}>
                        {formatToiletDistance(toilet.distanceMeters)}
                      </Text>
                    </View>
                    <Text style={[styles.name, { color: c.text }]}>{toilet.name}</Text>
                    {badges.length > 0 ? (
                      <Text style={[styles.badges, { color: c.textMuted }]}>{badges.join(" · ")}</Text>
                    ) : null}
                    {lastChecked ? (
                      <Text style={[styles.lastChecked, { color: c.textMuted }]}>
                        Last checked: {lastChecked}
                      </Text>
                    ) : null}
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Directions to ${toilet.name}`}
                    onPress={() => void openToiletDirections(toilet)}
                    hitSlop={8}
                    style={styles.directionsHit}
                  >
                    <Text style={[styles.directions, { color: c.primary }]}>Directions</Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        )}

        <Pressable
          accessibilityRole="link"
          accessibilityLabel="Toilet Map data attribution"
          onPress={() => void Linking.openURL(attributionUrl)}
          hitSlop={8}
        >
          <Text style={[styles.attribution, { color: c.textMuted }]}>{attribution}</Text>
        </Pressable>
      </LogHistoryCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    paddingHorizontal: SCREEN_EDGE_PADDING,
    paddingTop: 8,
    gap: 14,
  },
  shellCard: {
    padding: CARD_INNER_PADDING,
    gap: CARD_SECTION_INNER_GAP,
    marginBottom: 0,
  },
  lead: {
    fontSize: FLARE_FONT_SIZE.navTitle,
    lineHeight: FLARE_LINE_HEIGHT.navTitle,
    fontFamily: FLARE_FONT_FAMILY.bold,
  },
  support: {
    fontSize: FLARE_FONT_SIZE.muted,
    lineHeight: FLARE_LINE_HEIGHT.muted,
    fontFamily: FLARE_FONT_FAMILY.regular,
    marginBottom: STACKED_LINE_GAP,
  },
  loadingBlock: {
    alignItems: "center",
    gap: 10,
    paddingVertical: 28,
  },
  loadingCopy: {
    fontSize: FLARE_FONT_SIZE.muted,
    fontFamily: FLARE_FONT_FAMILY.regular,
  },
  errorBlock: {
    gap: 10,
    paddingVertical: 8,
  },
  errorCopy: {
    fontSize: FLARE_FONT_SIZE.body,
    lineHeight: FLARE_LINE_HEIGHT.body,
    fontFamily: FLARE_FONT_FAMILY.regular,
  },
  retry: {
    ...FLARE_INLINE_ACTION_LINK,
  },
  emptyCopy: {
    fontSize: FLARE_FONT_SIZE.body,
    lineHeight: FLARE_LINE_HEIGHT.body,
    fontFamily: FLARE_FONT_FAMILY.regular,
  },
  tray: {
    borderRadius: INSTRUCTION_CARD_RADIUS - 2,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingHorizontal: TRAY_ROW_PADDING_H,
    paddingVertical: TRAY_ROW_PADDING_Y,
  },
  rowText: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  distanceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  distance: {
    fontSize: FLARE_FONT_SIZE.caption,
    lineHeight: FLARE_LINE_HEIGHT.caption,
    fontFamily: FLARE_FONT_FAMILY.medium,
  },
  name: {
    fontSize: FLARE_FONT_SIZE.body,
    lineHeight: FLARE_LINE_HEIGHT.body,
    fontFamily: FLARE_FONT_FAMILY.medium,
  },
  badges: {
    fontSize: FLARE_FONT_SIZE.caption,
    lineHeight: FLARE_LINE_HEIGHT.caption,
    fontFamily: FLARE_FONT_FAMILY.regular,
  },
  lastChecked: {
    fontSize: FLARE_FONT_SIZE.caption,
    lineHeight: FLARE_LINE_HEIGHT.caption,
    fontFamily: FLARE_FONT_FAMILY.regular,
  },
  directionsHit: {
    paddingTop: 14,
    flexShrink: 0,
  },
  directions: {
    ...FLARE_INLINE_ACTION_LINK,
  },
  attribution: {
    fontSize: FLARE_FONT_SIZE.caption,
    lineHeight: FLARE_LINE_HEIGHT.caption,
    fontFamily: FLARE_FONT_FAMILY.regular,
    textDecorationLine: "underline",
    marginTop: STACKED_LINE_GAP,
  },
});
