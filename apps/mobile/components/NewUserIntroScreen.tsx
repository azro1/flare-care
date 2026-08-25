import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FLARE_BUTTON_MIN_HEIGHT, PrimaryButton } from "./FlareButton";
import { FlareLucideIcon } from "../lib/flareLucideIcons";
import { NEW_USER_INTRO_SLIDES, type NewUserIntroSlide } from "../lib/newUserIntroCopy";
import { FLARE_FONT_FAMILY, FULL_WIDTH_CTA_EDGE_PADDING } from "../lib/layoutConstants";
import { useFlareColors } from "../theme";

/** Shared media band — disc stays 72; smaller glyph for clear inset. */
const MEDIA_SIZE = 72;
const MEDIA_GLYPH_SIZE = 40;
/**
 * Title size for new-user intro slides.
 * Welcome (first slide) is one step larger; change INTRO_SLIDE_TITLE_SIZE to scale both.
 */
const INTRO_SLIDE_TITLE_SIZE = 21;
const WELCOME_SLIDE_TITLE_SIZE = INTRO_SLIDE_TITLE_SIZE + 1;
/** Top padding above the icon/title stack on each intro slide. */
const SLIDE_CONTENT_TOP = 72;
/** Matches `contentBlock.gap` — keep in sync. */
const INTRO_COPY_STACK_GAP = 26;
/** Matches `mediaSlot.marginBottom` — keep in sync. */
const INTRO_MEDIA_MARGIN_BOTTOM = 10;
/** Support line-height × typical two lines on the welcome slide. */
const INTRO_SUPPORT_BLOCK_HEIGHT = 26 * 2;
/**
 * Fixed Y for page dots — derived from layout constants (not onLayout).
 * Measuring after paint made the dots slide up on first land.
 */
const INTRO_COPY_STACK_HEIGHT =
  MEDIA_SIZE +
  INTRO_MEDIA_MARGIN_BOTTOM +
  INTRO_COPY_STACK_GAP +
  (WELCOME_SLIDE_TITLE_SIZE + 6) +
  INTRO_COPY_STACK_GAP +
  INTRO_SUPPORT_BLOCK_HEIGHT;
const DOTS_TOP = SLIDE_CONTENT_TOP + INTRO_COPY_STACK_HEIGHT + 28;
const DOT_SIZE = 8;
/** Active page indicator stretches into a short pill. */
const DOT_ACTIVE_WIDTH = 22;
/** Extra padding under Skip (above safe-area) — lifts CTAs into the thumb zone. */
const FOOTER_PAD = 64;

/**
 * One-time swipe intro after sign-up — what FlareCare can do for you.
 * Full-height pager (swipe + Next); dots stay fixed under the copy.
 */
export function NewUserIntroScreen({ onFinished }: { onFinished: () => void }) {
  const c = useFlareColors();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const listRef = useRef<FlatList<NewUserIntroSlide>>(null);
  const [index, setIndex] = useState(0);
  const [pagerHeight, setPagerHeight] = useState(0);
  const last = index >= NEW_USER_INTRO_SLIDES.length - 1;
  const dotProgress = useRef(
    NEW_USER_INTRO_SLIDES.map((_, i) => new Animated.Value(i === 0 ? 1 : 0)),
  ).current;

  useEffect(() => {
    Animated.parallel(
      dotProgress.map((progress, i) =>
        Animated.timing(progress, {
          toValue: i === index ? 1 : 0,
          duration: 280,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
      ),
    ).start();
  }, [dotProgress, index]);

  const goTo = useCallback(
    (next: number) => {
      const clamped = Math.max(0, Math.min(NEW_USER_INTRO_SLIDES.length - 1, next));
      listRef.current?.scrollToIndex({ index: clamped, animated: true });
      setIndex(clamped);
    },
    [],
  );

  const onNext = useCallback(() => {
    if (last) {
      onFinished();
      return;
    }
    goTo(index + 1);
  }, [goTo, index, last, onFinished]);

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
    ({ item, index: slideIndex }: { item: NewUserIntroSlide; index: number }) => {
      const titleSize =
        slideIndex === 0 ? WELCOME_SLIDE_TITLE_SIZE : INTRO_SLIDE_TITLE_SIZE;
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
            <View style={[styles.mediaSlot, { backgroundColor: c.surfaceSubtle }]}>
              <View
                style={
                  item.iconOpticalOffsetY
                    ? { transform: [{ translateY: item.iconOpticalOffsetY }] }
                    : null
                }
              >
                <FlareLucideIcon icon={item.icon} size={MEDIA_GLYPH_SIZE} color={c.primary} />
              </View>
            </View>

            <Text
              style={[
                styles.slideTitle,
                { color: c.text, fontSize: titleSize, lineHeight: titleSize + 6 },
              ]}
            >
              {item.title}
            </Text>
            <Text style={[styles.supportText, { color: c.textMuted }]}>{item.text}</Text>
          </View>
        </View>
      );
    },
    [c.primary, c.surfaceSubtle, c.text, c.textMuted, pagerHeight, width],
  );

  return (
    <View
      style={[
        styles.screen,
        {
          backgroundColor: c.screen,
          paddingTop: insets.top + 8,
          paddingBottom: Math.max(insets.bottom, 12) + FOOTER_PAD,
        },
      ]}
    >
      <View
        style={styles.pagerWrap}
        onLayout={(e) => setPagerHeight(e.nativeEvent.layout.height)}
      >
        <FlatList
          ref={listRef}
          data={NEW_USER_INTRO_SLIDES}
          keyExtractor={(item) => item.title}
          horizontal
          pagingEnabled
          bounces={false}
          overScrollMode="never"
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          disableIntervalMomentum
          snapToInterval={width}
          snapToAlignment="start"
          getItemLayout={(_, i) => ({
            length: width,
            offset: width * i,
            index: i,
          })}
          onMomentumScrollEnd={onMomentumScrollEnd}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          onScrollToIndexFailed={({ index: failed }) => {
            requestAnimationFrame(() => {
              listRef.current?.scrollToIndex({ index: failed, animated: true });
            });
          }}
          style={styles.pager}
          contentContainerStyle={pagerHeight > 0 ? { height: pagerHeight } : undefined}
          renderItem={renderSlide}
        />

        {/* Fixed under copy — constant Y from layout tokens (no onLayout slide). */}
        <View
          pointerEvents="none"
          style={[styles.dots, { top: DOTS_TOP }]}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          {NEW_USER_INTRO_SLIDES.map((_, i) => (
            <Animated.View
              key={i}
              style={[
                styles.dot,
                {
                  width: dotProgress[i].interpolate({
                    inputRange: [0, 1],
                    outputRange: [DOT_SIZE, DOT_ACTIVE_WIDTH],
                  }),
                  backgroundColor: dotProgress[i].interpolate({
                    inputRange: [0, 1],
                    outputRange: [c.appearanceChipInactiveBg, c.primary],
                  }),
                },
              ]}
            />
          ))}
        </View>
      </View>

      <View style={styles.footer}>
        <PrimaryButton title={last ? "Done" : "Next"} onPress={onNext} noTopMargin />

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
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  pagerWrap: {
    flex: 1,
    position: "relative",
  },
  pager: { flex: 1 },
  page: {
    paddingHorizontal: FULL_WIDTH_CTA_EDGE_PADDING,
    justifyContent: "flex-start",
    alignItems: "stretch",
  },
  contentBlock: {
    width: "100%",
    alignItems: "stretch",
    gap: INTRO_COPY_STACK_GAP,
  },
  mediaSlot: {
    width: MEDIA_SIZE,
    height: MEDIA_SIZE,
    borderRadius: MEDIA_SIZE / 2,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: INTRO_MEDIA_MARGIN_BOTTOM,
  },
  slideTitle: {
    fontFamily: FLARE_FONT_FAMILY.bold,
    textAlign: "center",
    alignSelf: "stretch",
    width: "100%",
  },
  supportText: {
    fontSize: 18,
    lineHeight: 26,
    fontFamily: FLARE_FONT_FAMILY.regular,
    textAlign: "center",
    alignSelf: "stretch",
    width: "100%",
  },
  dots: {
    position: "absolute",
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  dot: {
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
  },
  footer: {
    paddingHorizontal: FULL_WIDTH_CTA_EDGE_PADDING,
    gap: 16,
    alignItems: "stretch",
  },
  skipHit: {
    alignSelf: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    minHeight: FLARE_BUTTON_MIN_HEIGHT - 8,
    justifyContent: "center",
  },
  skip: {
    fontSize: 15,
    fontFamily: FLARE_FONT_FAMILY.medium,
    textAlign: "center",
  },
});
