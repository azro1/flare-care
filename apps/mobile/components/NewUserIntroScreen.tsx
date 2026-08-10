import React, { useCallback, useRef, useState } from "react";
import {
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type ViewToken,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FLARE_BUTTON_MIN_HEIGHT, PrimaryButton } from "./FlareButton";
import { NEW_USER_INTRO_SLIDES, type NewUserIntroSlide } from "../lib/newUserIntroCopy";
import { FLARE_FONT_FAMILY, FULL_WIDTH_CTA_EDGE_PADDING, SCREEN_EDGE_PADDING } from "../lib/layoutConstants";
import { useFlareColors } from "../theme";

/** Shared media band — all slides use the same icon size. */
const MEDIA_SIZE = 72;
const MEDIA_GLYPH_SIZE = 56;
/** Fixed top inset — must not track pager height, or lifting the footer pulls slide content up. */
const SLIDE_CONTENT_TOP = 96;
/** Extra space under dots/CTA (on top of safe-area). */
const FOOTER_LIFT = 56;

/**
 * One-time swipe intro after sign-up — what FlareCare can do for you.
 * Skip anytime → dashboard. Last slide: Get started → dashboard.
 */
export function NewUserIntroScreen({ onFinished }: { onFinished: () => void }) {
  const c = useFlareColors();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const [pagerHeight, setPagerHeight] = useState(0);
  const last = index >= NEW_USER_INTRO_SLIDES.length - 1;

  const onMomentumScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const next = Math.round(e.nativeEvent.contentOffset.x / width);
      setIndex(Math.max(0, Math.min(NEW_USER_INTRO_SLIDES.length - 1, next)));
    },
    [width],
  );

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const first = viewableItems[0];
    if (first?.index != null) setIndex(first.index);
  }).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 60 }).current;

  const renderSlide = useCallback(
    ({ item }: { item: NewUserIntroSlide }) => {
      return (
        <View
          style={[
            styles.page,
            {
              width,
              height: pagerHeight || undefined,
              paddingTop: SLIDE_CONTENT_TOP,
            },
          ]}
        >
          <View style={styles.contentBlock}>
            <View style={styles.mediaSlot}>
              {item.icon ? (
                <View
                  style={
                    item.iconOpticalOffsetY
                      ? { transform: [{ translateY: item.iconOpticalOffsetY }] }
                      : null
                  }
                >
                  {item.icon.family === "mci" ? (
                    <MaterialCommunityIcons name={item.icon.name} size={MEDIA_GLYPH_SIZE} color={c.primary} />
                  ) : (
                    <Ionicons name={item.icon.name} size={MEDIA_GLYPH_SIZE} color={c.primary} />
                  )}
                </View>
              ) : null}
            </View>

            {item.headline ? (
              <>
                <Text style={[styles.welcomeHeadline, { color: c.text }]}>{item.headline}</Text>
                <Text style={[styles.welcomeSub, { color: c.textMuted }]}>{item.text}</Text>
              </>
            ) : (
              <Text style={[styles.text, { color: c.text }]}>{item.text}</Text>
            )}
          </View>
        </View>
      );
    },
    [c.primary, c.text, c.textMuted, pagerHeight, width],
  );

  return (
    <View
      style={[
        styles.screen,
        {
          backgroundColor: c.screen,
          paddingTop: insets.top + 12,
          paddingBottom: Math.max(insets.bottom, 12) + FOOTER_LIFT,
        },
      ]}
    >
      <View style={styles.topBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Skip introduction"
          onPress={onFinished}
          hitSlop={12}
          style={styles.skipHit}
        >
          <Text style={[styles.skip, { color: c.textMuted }]}>Skip</Text>
        </Pressable>
      </View>

      <FlatList
        data={NEW_USER_INTRO_SLIDES}
        keyExtractor={(item) => item.text}
        horizontal
        pagingEnabled
        bounces={false}
        overScrollMode="never"
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        disableIntervalMomentum
        snapToInterval={width}
        snapToAlignment="start"
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        onMomentumScrollEnd={onMomentumScrollEnd}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        onLayout={(e) => setPagerHeight(e.nativeEvent.layout.height)}
        style={styles.pager}
        contentContainerStyle={pagerHeight > 0 ? { height: pagerHeight } : styles.pagerContent}
        renderItem={renderSlide}
      />

      <View style={styles.footer}>
        <View style={styles.dots} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {NEW_USER_INTRO_SLIDES.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor: c.primary,
                  opacity: i === index ? 1 : 0.28,
                  transform: [{ scale: i === index ? 1.15 : 1 }],
                },
              ]}
            />
          ))}
        </View>

        <View style={styles.ctaSlot}>
          {last ? (
            <PrimaryButton title="Get started" onPress={onFinished} noTopMargin />
          ) : (
            <View style={styles.swipeHint} accessibilityRole="text" accessibilityLabel="Swipe to continue">
              <Text style={[styles.swipeHintText, { color: c.textMuted }]}>Swipe to continue</Text>
              <Ionicons name="chevron-forward" size={16} color={c.textMuted} />
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  topBar: {
    paddingHorizontal: SCREEN_EDGE_PADDING,
    alignItems: "flex-end",
    minHeight: 36,
  },
  skipHit: { paddingVertical: 6, paddingHorizontal: 4 },
  skip: { fontSize: 15, fontFamily: FLARE_FONT_FAMILY.medium },
  pager: { flex: 1 },
  pagerContent: { flexGrow: 1 },
  page: {
    paddingHorizontal: SCREEN_EDGE_PADDING + 8,
    justifyContent: "flex-start",
    alignItems: "center",
  },
  contentBlock: {
    alignItems: "center",
    width: "100%",
    maxWidth: 320,
    gap: 12,
  },
  mediaSlot: {
    width: MEDIA_SIZE,
    height: MEDIA_SIZE,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  welcomeHeadline: {
    fontSize: 24,
    lineHeight: 30,
    fontFamily: FLARE_FONT_FAMILY.bold,
    textAlign: "center",
  },
  welcomeSub: {
    fontSize: 16,
    lineHeight: 22,
    fontFamily: FLARE_FONT_FAMILY.regular,
    textAlign: "center",
  },
  text: {
    fontSize: 18,
    lineHeight: 28,
    fontFamily: FLARE_FONT_FAMILY.regular,
    textAlign: "center",
  },
  footer: {
    paddingHorizontal: FULL_WIDTH_CTA_EDGE_PADDING,
    gap: 20,
    paddingTop: 8,
  },
  dots: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  ctaSlot: {
    minHeight: FLARE_BUTTON_MIN_HEIGHT,
    justifyContent: "center",
  },
  swipeHint: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    minHeight: FLARE_BUTTON_MIN_HEIGHT,
  },
  swipeHintText: {
    fontSize: 15,
    fontFamily: FLARE_FONT_FAMILY.medium,
  },
});
