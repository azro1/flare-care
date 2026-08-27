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
import { FLARE_BUTTON_MIN_HEIGHT, EntryPrimaryButton } from "./FlareButton";
import { FlareLucideIcon } from "../lib/flareLucideIcons";
import { NEW_USER_INTRO_SLIDES, type NewUserIntroSlide } from "../lib/newUserIntroCopy";
import {
  FLARE_FONT_FAMILY,
  FLARE_FONT_SIZE,
  FULL_WIDTH_CTA_EDGE_PADDING,
  HOME_TILE_GAP,
  NAV_HEADER_BAR_HEIGHT,
} from "../lib/layoutConstants";
import { useFlareColors } from "../theme";

/** Shared media band — large glyph to fill mid-stack visual weight. */
const MEDIA_SIZE = 148;
const MEDIA_GLYPH_SIZE = 60;
/**
 * Title size for new-user intro slides.
 * Welcome (first slide) is one step larger; change INTRO_SLIDE_TITLE_SIZE to scale both.
 */
const INTRO_SLIDE_TITLE_SIZE = 21;
const WELCOME_SLIDE_TITLE_SIZE = INTRO_SLIDE_TITLE_SIZE + 1;
/** Icon → title — tight so the glyph reads as part of the copy stack. */
const INTRO_ICON_TO_TITLE_GAP = HOME_TILE_GAP;
/** Title → support. */
const INTRO_TITLE_TO_SUPPORT_GAP = HOME_TILE_GAP * 2 + 4;
/** Support line-height × typical two lines on the welcome slide. */
const INTRO_SUPPORT_BLOCK_HEIGHT = 26 * 2;
/**
 * Fixed copy stack height (icon → title → support) for centering + fixed dots Y.
 * Do not measure onLayout — that made the dots slide on first land.
 */
const INTRO_COPY_STACK_HEIGHT =
  MEDIA_SIZE +
  INTRO_ICON_TO_TITLE_GAP +
  (WELCOME_SLIDE_TITLE_SIZE + 6) +
  INTRO_TITLE_TO_SUPPORT_GAP +
  INTRO_SUPPORT_BLOCK_HEIGHT;
/**
 * Copy sits below true vertical centre, then lifts with `INTRO_COPY_UP_NUDGE`.
 * Dots track under the support line.
 */
const INTRO_CONTENT_DOWN_NUDGE = HOME_TILE_GAP * 3;
/** Lift icon + title + support (+ dots follow). */
const INTRO_COPY_UP_NUDGE = HOME_TILE_GAP * 8;
/** Space between support copy and page dots. */
const INTRO_DOTS_GAP = HOME_TILE_GAP * 2 + 8;
const DOT_SIZE = 8;
/** Active page indicator stretches into a short pill. */
const DOT_ACTIVE_WIDTH = 22;
/**
 * Moves Next/Done + Skip only. Lower = closer to the bottom edge.
 * Mid-stack (icon / title / support / dots) uses `CONTENT_LAYOUT_FOOTER_PAD` instead.
 */
const FOOTER_PAD = 28;
/** Fixed reserve for copy + dots layout — leave this alone when nudging CTAs. */
const CONTENT_LAYOUT_FOOTER_PAD = 64;
/** Footer stack: Next + gap(16) + Skip hit — keep in sync with `styles.footer` / `skipHit`. */
const INTRO_FOOTER_STACK_HEIGHT = FLARE_BUTTON_MIN_HEIGHT + 16 + (FLARE_BUTTON_MIN_HEIGHT - 8);

/**
 * One-time swipe intro after sign-up — what Flarecare can do for you.
 * Copy centered between header and CTAs; dots stay fixed under the copy (do not swipe).
 * `FOOTER_PAD` and `CONTENT_LAYOUT_FOOTER_PAD` are independent on purpose.
 */
export function NewUserIntroScreen({ onFinished }: { onFinished: () => void }) {
  const c = useFlareColors();
  const insets = useSafeAreaInsets();
  const { width, height: windowHeight } = useWindowDimensions();
  const listRef = useRef<FlatList<NewUserIntroSlide>>(null);
  const [index, setIndex] = useState(0);
  const last = index >= NEW_USER_INTRO_SLIDES.length - 1;
  const dotProgress = useRef(
    NEW_USER_INTRO_SLIDES.map((_, i) => new Animated.Value(i === 0 ? 1 : 0)),
  ).current;

  /** Stable on first paint — no onLayout jump (that caused the welcome land blip). */
  const safeBottom = Math.max(insets.bottom, 12);
  const bottomPad = safeBottom + FOOTER_PAD;
  const pagerHeight = Math.max(
    0,
    windowHeight - insets.top - NAV_HEADER_BAR_HEIGHT - INTRO_FOOTER_STACK_HEIGHT - bottomPad,
  );
  const layoutPagerHeight = Math.max(
    0,
    windowHeight -
      insets.top -
      NAV_HEADER_BAR_HEIGHT -
      INTRO_FOOTER_STACK_HEIGHT -
      (safeBottom + CONTENT_LAYOUT_FOOTER_PAD),
  );
  const contentTop =
    (layoutPagerHeight - INTRO_COPY_STACK_HEIGHT) / 2 +
    INTRO_CONTENT_DOWN_NUDGE -
    INTRO_COPY_UP_NUDGE;
  const dotsTop = contentTop + INTRO_COPY_STACK_HEIGHT + INTRO_DOTS_GAP;

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
              height: pagerHeight,
              paddingTop: contentTop,
            },
          ]}
        >
          <View style={styles.contentBlock}>
            <View
              style={[
                styles.mediaSlot,
                item.iconOpticalOffsetY
                  ? { transform: [{ translateY: item.iconOpticalOffsetY }] }
                  : null,
              ]}
            >
              <FlareLucideIcon icon={item.icon} size={MEDIA_GLYPH_SIZE} color={c.primary} />
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
    [c.primary, c.text, c.textMuted, contentTop, pagerHeight, width],
  );

  return (
    <View
      style={[
        styles.screen,
        {
          backgroundColor: c.screen,
          paddingTop: insets.top,
          paddingBottom: bottomPad,
        },
      ]}
    >
      <View style={[styles.header, { backgroundColor: c.screen }]} accessibilityRole="header">
        <Text
          style={{
            fontFamily: FLARE_FONT_FAMILY.bold,
            fontSize: FLARE_FONT_SIZE.navTitle,
            color: c.text,
            textAlign: "center",
          }}
        >
          {index === 0 ? "Welcome to" : "Flarecare"}
        </Text>
      </View>

      <View style={[styles.pagerWrap, { height: pagerHeight }]}>
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
          contentContainerStyle={{ height: pagerHeight }}
          renderItem={renderSlide}
        />

        {/* Fixed under centered copy — does not swipe with slides. */}
        <View
          pointerEvents="none"
          style={[styles.dots, { top: dotsTop }]}
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
                    // Not `appearanceChipInactiveBg` — in light mode that matches screen and vanishes.
                    outputRange: [c.cardBorder, c.primary],
                  }),
                },
              ]}
            />
          ))}
        </View>
      </View>

      <View style={styles.footer}>
        <EntryPrimaryButton title={last ? "Done" : "Next"} onPress={onNext} noTopMargin />

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
  header: {
    height: NAV_HEADER_BAR_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  pagerWrap: {
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
  },
  mediaSlot: {
    width: MEDIA_SIZE,
    height: MEDIA_SIZE,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: INTRO_ICON_TO_TITLE_GAP,
  },
  slideTitle: {
    fontFamily: FLARE_FONT_FAMILY.bold,
    textAlign: "center",
    alignSelf: "stretch",
    width: "100%",
    marginBottom: INTRO_TITLE_TO_SUPPORT_GAP,
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
