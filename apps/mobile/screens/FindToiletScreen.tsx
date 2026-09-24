/**
 * Find a Toilet — map-first.
 * Primary: near me. Secondary: choose a place (planning).
 * Directions → Apple/Google Maps. Short CC BY credit + dataset link (Toilet Map).
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  InteractionManager,
  Keyboard,
  Linking,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import MapView, { Marker, type Region } from "react-native-maps";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FLARE_BUTTON_BORDER_RADIUS } from "../components/FlareButton";
import {
  CARD_INNER_PADDING,
  FLARE_FONT_FAMILY,
  FLARE_FONT_SIZE,
  FLARE_INLINE_ACTION_LINK,
  FLARE_LINE_HEIGHT,
  INSTRUCTION_CARD_RADIUS,
  SCREEN_EDGE_PADDING,
  STACKED_LINE_GAP,
  TRAY_ROW_PADDING_H,
  TRAY_ROW_PADDING_Y,
} from "../lib/layoutConstants";
import {
  FIND_TOILET_ATTRIBUTION,
  FIND_TOILET_ATTRIBUTION_URL,
  FIND_TOILET_DISTANCE_ICON,
  FIND_TOILET_PLACE_DROPDOWN_MAX_H,
  FIND_TOILET_SHEET_PEEK_H,
  FIND_TOILET_SHEET_TOP_GAP,
  TOILET_MAP_FILTERS,
  fetchNearbyToilets,
  filterNearbyToilets,
  formatToiletDistance,
  formatToiletLastChecked,
  formatToiletMapCount,
  openToiletDirections,
  requestUserLocation,
  searchUkPlaces,
  toiletBadgeLabels,
  toiletMapRegion,
  type NearbyToilet,
  type PlaceSearchHit,
  type ToiletMapFilter,
  type ToiletSearchAnchor,
} from "../lib/findToiletShared";
import { FlareLucideIcon } from "../lib/flareLucideIcons";
import { useFlareColors } from "../theme";

export function FindToiletScreen() {
  const c = useFlareColors();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toilets, setToilets] = useState<NearbyToilet[]>([]);
  const [anchor, setAnchor] = useState<ToiletSearchAnchor | null>(null);
  const [filter, setFilter] = useState<ToiletMapFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [placeMode, setPlaceMode] = useState(false);
  const [placeQuery, setPlaceQuery] = useState("");
  const [placeHits, setPlaceHits] = useState<PlaceSearchHit[]>([]);
  const [placeSearching, setPlaceSearching] = useState(false);
  const [placeError, setPlaceError] = useState<string | null>(null);
  /** Sheet stop = modes + filters only. Place search / results must not change peekOffset. */
  const [sheetCeilingH, setSheetCeilingH] = useState(140);
  /** Screen body height (below nav header) — not full window. */
  const [screenH, setScreenH] = useState(Dimensions.get("window").height);

  const sheetBottom = 0;
  const topOverlayTop = 8;
  const peekH = FIND_TOILET_SHEET_PEEK_H + Math.max(insets.bottom, 8);
  const sheetH = Math.max(
    peekH,
    screenH - topOverlayTop - sheetCeilingH - FIND_TOILET_SHEET_TOP_GAP - sheetBottom,
  );
  /** How far the sheet sits down when only the peek is showing. */
  const peekOffset = Math.max(0, sheetH - peekH);
  const translateY = useRef(new Animated.Value(peekOffset)).current;
  const dragStartY = useRef(peekOffset);
  const sheetExpandedRef = useRef(false);

  const snapSheet = useCallback(
    (expanded: boolean) => {
      sheetExpandedRef.current = expanded;
      Animated.spring(translateY, {
        toValue: expanded ? 0 : peekOffset,
        useNativeDriver: true,
        bounciness: 0,
        speed: 18,
      }).start();
    },
    [peekOffset, translateY],
  );

  const collapseSheet = useCallback(() => snapSheet(false), [snapSheet]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        // Keep sheet parked while choosing a place so it can’t fight the dropdown.
        onMoveShouldSetPanResponder: (_, g) =>
          !placeMode && Math.abs(g.dy) > 4 && Math.abs(g.dy) > Math.abs(g.dx),
        onPanResponderGrant: () => {
          translateY.stopAnimation((v) => {
            dragStartY.current = typeof v === "number" ? v : peekOffset;
          });
        },
        onPanResponderMove: (_, g) => {
          const next = Math.min(peekOffset, Math.max(0, dragStartY.current + g.dy));
          translateY.setValue(next);
        },
        onPanResponderRelease: (_, g) => {
          const current = Math.min(peekOffset, Math.max(0, dragStartY.current + g.dy));
          const mid = peekOffset / 2;
          if (g.vy < -0.45 || current < mid) snapSheet(true);
          else if (g.vy > 0.45 || current >= mid) snapSheet(false);
          else snapSheet(sheetExpandedRef.current);
        },
      }),
    [peekOffset, placeMode, snapSheet, translateY],
  );

  useEffect(() => {
    if (!sheetExpandedRef.current) {
      translateY.setValue(peekOffset);
    }
  }, [peekOffset, translateY]);

  const filtered = useMemo(() => filterNearbyToilets(toilets, filter), [toilets, filter]);
  const selected = filtered.find((t) => t.id === selectedId) ?? null;

  useEffect(() => {
    if (!selectedId) return;
    if (!filtered.some((t) => t.id === selectedId)) setSelectedId(null);
  }, [filtered, selectedId]);

  const loadForAnchor = useCallback(async (next: ToiletSearchAnchor) => {
    setLoading(true);
    setError(null);
    setAnchor(next);
    collapseSheet();
    try {
      const result = await fetchNearbyToilets(next.coords);
      setToilets(result.toilets);
      setSelectedId(result.toilets[0]?.id ?? null);
      const region = toiletMapRegion(next.coords);
      mapRef.current?.animateToRegion(region, 400);
    } catch (e) {
      setToilets([]);
      setSelectedId(null);
      setError(e instanceof Error ? e.message : "Couldn't find toilets nearby");
    } finally {
      setLoading(false);
    }
  }, [collapseSheet]);

  const loadNearMe = useCallback(async () => {
    setPlaceMode(false);
    setPlaceHits([]);
    setPlaceError(null);
    setLoading(true);
    setError(null);
    try {
      const coords = await requestUserLocation();
      await loadForAnchor({ coords, label: "me", kind: "me" });
    } catch (e) {
      setLoading(false);
      setToilets([]);
      setAnchor(null);
      setError(e instanceof Error ? e.message : "Couldn't find toilets nearby");
    }
  }, [loadForAnchor]);

  useFocusEffect(
    useCallback(() => {
      // Primary job: near me on open.
      void loadNearMe();
    }, [loadNearMe]),
  );

  const runPlaceSearch = useCallback(async () => {
    const q = placeQuery.trim();
    if (q.length < 2) {
      setPlaceError("Type a place name (e.g. campsite, town, park)");
      return;
    }
    setPlaceSearching(true);
    setPlaceError(null);
    try {
      const hits = await searchUkPlaces(q);
      setPlaceHits(hits);
      if (hits.length === 0) setPlaceError("No places found — try a different name");
      Keyboard.dismiss();
    } catch (e) {
      setPlaceHits([]);
      setPlaceError(e instanceof Error ? e.message : "Couldn't search for that place");
    } finally {
      setPlaceSearching(false);
    }
  }, [placeQuery]);

  const pickPlace = useCallback(
    async (hit: PlaceSearchHit) => {
      setPlaceHits([]);
      setPlaceQuery(hit.label);
      setPlaceMode(false);
      await loadForAnchor({ coords: hit.coords, label: hit.label, kind: "place" });
    },
    [loadForAnchor],
  );

  /** Collapse the sheet first, then hand off — avoids a janky jump into Maps. */
  const goDirections = useCallback(
    (toilet: NearbyToilet) => {
      collapseSheet();
      InteractionManager.runAfterInteractions(() => {
        setTimeout(() => {
          void openToiletDirections(toilet);
        }, 180);
      });
    },
    [collapseSheet],
  );

  const region: Region | undefined = anchor ? toiletMapRegion(anchor.coords) : undefined;
  const countLabel = formatToiletMapCount(
    filtered.length,
    anchor?.kind === "place" ? anchor.label : undefined,
  );

  return (
    <View
      style={[styles.screen, { backgroundColor: c.screen }]}
      onLayout={(e) => setScreenH(e.nativeEvent.layout.height)}
    >
      {region ? (
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          initialRegion={region}
          showsUserLocation
          showsMyLocationButton={false}
          toolbarEnabled={false}
        >
          {filtered.map((toilet) => {
            return (
              <Marker
                key={toilet.id}
                coordinate={{ latitude: toilet.lat, longitude: toilet.lng }}
                title={toilet.name}
                description={
                  toilet.free
                    ? `Free · ${formatToiletDistance(toilet.distanceMeters)}`
                    : formatToiletDistance(toilet.distanceMeters)
                }
                onPress={() => setSelectedId(toilet.id)}
              />
            );
          })}
        </MapView>
      ) : (
        <View style={[styles.centered, { backgroundColor: c.screen }]}>
          {loading ? (
            <>
              <ActivityIndicator color={c.primary} />
              <Text style={[styles.loadingCopy, { color: c.textMuted }]}>
                Finding toilets near you…
              </Text>
            </>
          ) : error ? (
            <>
              <Text style={[styles.errorCopy, { color: c.text }]}>{error}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Try again near me"
                onPress={() => void loadNearMe()}
                hitSlop={8}
              >
                <Text style={[styles.retry, { color: c.primary }]}>Try again</Text>
              </Pressable>
            </>
          ) : null}
        </View>
      )}

      {region ? (
        <Animated.View
          style={[
            styles.bottomPanel,
            {
              backgroundColor: c.card,
              height: sheetH,
              paddingBottom: Math.max(insets.bottom, SCREEN_EDGE_PADDING) + STACKED_LINE_GAP * 2,
              bottom: 0,
              transform: [{ translateY }],
            },
          ]}
        >
          {/* Grabber — same idea as SlideUpSheet / fingerprint consent: drag follows thumb */}
          <View style={styles.grabberHit} {...panResponder.panHandlers}>
            <View style={[styles.sheetHandle, { backgroundColor: c.cardBorder }]} />
            {loading ? (
              <View style={styles.bottomLoading}>
                <ActivityIndicator color={c.primary} />
                <Text style={[styles.loadingCopy, { color: c.textMuted }]}>Updating…</Text>
              </View>
            ) : error && toilets.length === 0 ? (
              <View style={styles.peekBlock}>
                <Text style={[styles.errorCopy, { color: c.text }]}>{error}</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Try again"
                  onPress={() => void (anchor ? loadForAnchor(anchor) : loadNearMe())}
                  hitSlop={8}
                >
                  <Text style={[styles.retry, { color: c.primary }]}>Try again</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.peekBlock}>
                <Text style={[styles.count, { color: c.text }]} numberOfLines={1}>
                  {countLabel}
                </Text>
                <Text style={[styles.selectedMeta, { color: c.textMuted }]} numberOfLines={1}>
                  {selected
                    ? `${formatToiletDistance(selected.distanceMeters)} · ${selected.name}`
                    : "Drag up for details"}
                </Text>
              </View>
            )}
          </View>

          {!loading && !(error && toilets.length === 0) ? (
            filtered.length === 0 ? (
              <Text style={[styles.selectedMeta, { color: c.textMuted }]}>
                No toilets match this filter.
              </Text>
            ) : (
              <ScrollView
                style={styles.resultsScroll}
                contentContainerStyle={styles.resultsContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled
              >
                {filtered.map((toilet) => {
                  const badges = toiletBadgeLabels(toilet);
                  const lastChecked = formatToiletLastChecked(
                    toilet.verifiedAt || toilet.updatedAt,
                  );
                  return (
                    <View
                      key={toilet.id}
                      accessibilityLabel={`${toilet.name}, ${formatToiletDistance(toilet.distanceMeters)}`}
                      style={[
                        styles.toiletCard,
                        { backgroundColor: c.surfaceSubtle },
                      ]}
                    >
                      <View style={styles.toiletCardTop}>
                        <View style={styles.toiletCardMain}>
                          <View style={styles.distanceRow}>
                            <FlareLucideIcon
                              icon={FIND_TOILET_DISTANCE_ICON}
                              size={FLARE_FONT_SIZE.body}
                              color={c.primary}
                            />
                            <Text style={[styles.resultDistance, { color: c.textMuted }]}>
                              {formatToiletDistance(toilet.distanceMeters)}
                            </Text>
                          </View>
                          <Text style={[styles.selectedName, { color: c.text }]} numberOfLines={2}>
                            {toilet.name}
                          </Text>
                        </View>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Directions to ${toilet.name}`}
                          onPress={() => goDirections(toilet)}
                          hitSlop={8}
                          style={styles.resultDirections}
                        >
                          <Text style={[styles.retry, { color: c.primary }]}>Directions</Text>
                        </Pressable>
                      </View>

                      {badges.length > 0 ? (
                        <View style={styles.badgeRow}>
                          {badges.map((label) => (
                            <View
                              key={label}
                              style={[styles.badgePill, { backgroundColor: c.card }]}
                            >
                              <Text style={[styles.badgePillText, { color: c.text }]}>{label}</Text>
                            </View>
                          ))}
                        </View>
                      ) : null}

                      {toilet.openToday ? (
                        <Text style={[styles.metaLine, { color: c.textMuted }]}>
                          {toilet.openToday}
                        </Text>
                      ) : null}

                      {toilet.paymentDetails ? (
                        <Text style={[styles.metaLine, { color: c.textMuted }]} numberOfLines={1}>
                          {toilet.paymentDetails}
                        </Text>
                      ) : null}

                      {toilet.notes ? (
                        <Text style={[styles.notesLine, { color: c.textMuted }]} numberOfLines={3}>
                          {toilet.notes}
                        </Text>
                      ) : null}

                      {lastChecked ? (
                        <Text style={[styles.metaLine, { color: c.textMuted }]}>
                          Last checked: {lastChecked}
                        </Text>
                      ) : null}
                    </View>
                  );
                })}
              </ScrollView>
            )
          ) : null}

          <Pressable
            accessibilityRole="link"
            accessibilityLabel="Toilet Map data attribution"
            onPress={() => void Linking.openURL(FIND_TOILET_ATTRIBUTION_URL)}
            hitSlop={8}
          >
            <Text style={[styles.attribution, { color: c.textMuted }]} numberOfLines={1}>
              {FIND_TOILET_ATTRIBUTION}
            </Text>
          </Pressable>
        </Animated.View>
      ) : null}

      {/* Above the sheet so Android elevation doesn’t bury taps. */}
      <View style={styles.topOverlay} pointerEvents="box-none">
        {/*
          Sheet ceiling = modes + filters only.
          Place search + results sit below in normal layout (not absolute over the map).
        */}
        <View
          style={[styles.topCard, { backgroundColor: c.card }]}
          onLayout={(e) => setSheetCeilingH(e.nativeEvent.layout.height)}
        >
          <View style={styles.modeRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: !placeMode && anchor?.kind !== "place" }}
              accessibilityLabel="Toilets near me"
              onPress={() => void loadNearMe()}
              style={[
                styles.modeChip,
                {
                  backgroundColor:
                    !placeMode && anchor?.kind !== "place" ? c.primary : c.surfaceSubtle,
                },
              ]}
            >
              <Text
                style={[
                  styles.modeChipLabel,
                  {
                    color: !placeMode && anchor?.kind !== "place" ? c.white : c.text,
                  },
                ]}
              >
                Near me
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: placeMode || anchor?.kind === "place" }}
              accessibilityLabel="Choose a place"
              onPress={() => {
                collapseSheet();
                setPlaceHits([]);
                setPlaceError(null);
                setPlaceMode(true);
              }}
              style={[
                styles.modeChip,
                {
                  backgroundColor:
                    placeMode || anchor?.kind === "place" ? c.primary : c.surfaceSubtle,
                },
              ]}
            >
              <Text
                style={[
                  styles.modeChipLabel,
                  {
                    color: placeMode || anchor?.kind === "place" ? c.white : c.text,
                  },
                ]}
              >
                Choose a place
              </Text>
            </Pressable>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
            keyboardShouldPersistTaps="handled"
          >
            {TOILET_MAP_FILTERS.map((item) => {
              const on = filter === item.id;
              return (
                <Pressable
                  key={item.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={`Filter ${item.label}`}
                  onPress={() => {
                    setFilter(item.id);
                  }}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: on ? c.primary : c.surfaceSubtle,
                    },
                  ]}
                >
                  <Text style={[styles.chipLabel, { color: on ? c.white : c.text }]}>
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {placeMode ? (
          <View style={[styles.placePanel, { backgroundColor: c.card }]}>
            <View style={styles.placeSearchRow}>
              <TextInput
                value={placeQuery}
                onChangeText={setPlaceQuery}
                placeholder="Town, campsite, park, beach…"
                placeholderTextColor={c.textMuted}
                returnKeyType="search"
                onSubmitEditing={() => void runPlaceSearch()}
                autoCorrect={false}
                autoCapitalize="words"
                style={[
                  styles.placeInput,
                  {
                    color: c.text,
                    backgroundColor: c.surfaceSubtle,
                  },
                ]}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Search place"
                onPress={() => void runPlaceSearch()}
                hitSlop={8}
                disabled={placeSearching}
                style={styles.placeSearchBtn}
              >
                <Text style={[styles.retry, { color: c.primary }]}>
                  {placeSearching ? "…" : "Search"}
                </Text>
              </Pressable>
            </View>
            {placeError ? (
              <Text style={[styles.placeHint, { color: c.textMuted }]}>{placeError}</Text>
            ) : (
              <Text style={[styles.placeHint, { color: c.textMuted }]}>
                Planning ahead — camping, parks, festivals, unfamiliar places
              </Text>
            )}
            {placeHits.length > 0 ? (
              <ScrollView
                style={styles.placeHits}
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled
              >
                {placeHits.map((hit) => (
                  <Pressable
                    key={`${hit.label}-${hit.coords.lat}-${hit.coords.lng}`}
                    accessibilityRole="button"
                    accessibilityLabel={`Use place ${hit.label}`}
                    onPress={() => void pickPlace(hit)}
                    style={[styles.hitRow, { backgroundColor: c.surfaceSubtle }]}
                  >
                    <Text style={[styles.hitLabel, { color: c.text }]} numberOfLines={2}>
                      {hit.label}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: SCREEN_EDGE_PADDING,
  },
  loadingCopy: {
    fontSize: FLARE_FONT_SIZE.muted,
    fontFamily: FLARE_FONT_FAMILY.regular,
  },
  errorCopy: {
    fontSize: FLARE_FONT_SIZE.body,
    lineHeight: FLARE_LINE_HEIGHT.body,
    fontFamily: FLARE_FONT_FAMILY.regular,
    textAlign: "center",
  },
  retry: {
    ...FLARE_INLINE_ACTION_LINK,
  },
  topOverlay: {
    position: "absolute",
    left: SCREEN_EDGE_PADDING,
    right: SCREEN_EDGE_PADDING,
    top: 8,
    zIndex: 20,
    elevation: 20,
  },
  topCard: {
    borderRadius: INSTRUCTION_CARD_RADIUS,

    padding: CARD_INNER_PADDING,
    // Slightly more than STACKED_LINE_GAP so Near me row isn’t tight on filters.
    gap: STACKED_LINE_GAP * 2,
  },
  modeRow: {
    flexDirection: "row",
    gap: 8,
  },
  modeChip: {
    flex: 1,
    borderRadius: FLARE_BUTTON_BORDER_RADIUS,

    paddingVertical: 10,
    alignItems: "center",
  },
  modeChipLabel: {
    fontSize: FLARE_FONT_SIZE.muted,
    lineHeight: FLARE_LINE_HEIGHT.muted,
    fontFamily: FLARE_FONT_FAMILY.medium,
  },
  placePanel: {
    marginTop: STACKED_LINE_GAP,
    borderRadius: INSTRUCTION_CARD_RADIUS,

    padding: CARD_INNER_PADDING,
    gap: 8,
  },
  placeSearchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  placeInput: {
    flex: 1,

    borderRadius: FLARE_BUTTON_BORDER_RADIUS,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: FLARE_FONT_SIZE.body,
    fontFamily: FLARE_FONT_FAMILY.regular,
  },
  placeSearchBtn: {
    flexShrink: 0,
    paddingVertical: 8,
  },
  placeHint: {
    fontSize: FLARE_FONT_SIZE.caption,
    lineHeight: FLARE_LINE_HEIGHT.caption,
    fontFamily: FLARE_FONT_FAMILY.regular,
  },
  placeHits: {
    maxHeight: FIND_TOILET_PLACE_DROPDOWN_MAX_H,
    gap: STACKED_LINE_GAP,
  },
  hitRow: {
    borderRadius: FLARE_BUTTON_BORDER_RADIUS,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: STACKED_LINE_GAP,
  },
  hitLabel: {
    fontSize: FLARE_FONT_SIZE.body,
    lineHeight: FLARE_LINE_HEIGHT.body,
    fontFamily: FLARE_FONT_FAMILY.regular,
  },
  filterRow: {
    gap: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  chip: {
    borderRadius: FLARE_BUTTON_BORDER_RADIUS,

    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipLabel: {
    fontSize: FLARE_FONT_SIZE.caption,
    lineHeight: FLARE_LINE_HEIGHT.caption,
    fontFamily: FLARE_FONT_FAMILY.medium,
  },
  bottomPanel: {
    position: "absolute",
    left: 0,
    right: 0,
    borderTopLeftRadius: INSTRUCTION_CARD_RADIUS,
    borderTopRightRadius: INSTRUCTION_CARD_RADIUS,




    paddingHorizontal: CARD_INNER_PADDING,
    paddingTop: STACKED_LINE_GAP,
    gap: STACKED_LINE_GAP,
    overflow: "hidden",
    zIndex: 2,
    elevation: 2,
  },
  grabberHit: {
    paddingTop: STACKED_LINE_GAP * 2,
    paddingBottom: 4,
  },
  sheetHandle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: 8,
  },
  peekBlock: {
    gap: STACKED_LINE_GAP,
  },
  bottomLoading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 4,
  },
  count: {
    fontSize: FLARE_FONT_SIZE.navTitle,
    lineHeight: FLARE_LINE_HEIGHT.navTitle,
    fontFamily: FLARE_FONT_FAMILY.bold,
  },
  resultsScroll: {
    flex: 1,
  },
  resultsContent: {
    paddingBottom: 4,
    gap: STACKED_LINE_GAP * 3,
  },
  toiletCard: {

    borderRadius: FLARE_BUTTON_BORDER_RADIUS,
    paddingHorizontal: TRAY_ROW_PADDING_H,
    paddingVertical: TRAY_ROW_PADDING_Y + 4,
    gap: STACKED_LINE_GAP + 2,
  },
  toiletCardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  toiletCardMain: {
    flex: 1,
    minWidth: 0,
    gap: STACKED_LINE_GAP,
  },
  distanceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: STACKED_LINE_GAP,
  },
  resultDistance: {
    fontSize: FLARE_FONT_SIZE.caption,
    lineHeight: FLARE_LINE_HEIGHT.caption,
    fontFamily: FLARE_FONT_FAMILY.medium,
  },
  resultDirections: {
    flexShrink: 0,
    paddingTop: 2,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  badgePill: {

    borderRadius: FLARE_BUTTON_BORDER_RADIUS,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgePillText: {
    fontSize: FLARE_FONT_SIZE.caption,
    lineHeight: FLARE_LINE_HEIGHT.caption,
    fontFamily: FLARE_FONT_FAMILY.medium,
  },
  metaLine: {
    fontSize: FLARE_FONT_SIZE.caption,
    lineHeight: FLARE_LINE_HEIGHT.caption,
    fontFamily: FLARE_FONT_FAMILY.regular,
  },
  notesLine: {
    fontSize: FLARE_FONT_SIZE.caption,
    lineHeight: FLARE_LINE_HEIGHT.caption,
    fontFamily: FLARE_FONT_FAMILY.regular,
  },
  selectedName: {
    fontSize: FLARE_FONT_SIZE.body,
    lineHeight: FLARE_LINE_HEIGHT.body,
    fontFamily: FLARE_FONT_FAMILY.medium,
  },
  selectedMeta: {
    fontSize: FLARE_FONT_SIZE.caption,
    lineHeight: FLARE_LINE_HEIGHT.caption,
    fontFamily: FLARE_FONT_FAMILY.regular,
  },
  attribution: {
    fontSize: FLARE_FONT_SIZE.caption,
    lineHeight: FLARE_LINE_HEIGHT.caption,
    fontFamily: FLARE_FONT_FAMILY.regular,
    paddingTop: STACKED_LINE_GAP,
  },
});
