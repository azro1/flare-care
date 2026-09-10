import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { FlareLucideIcon, FLARE_CHROME_LUCIDE } from "../lib/flareLucideIcons";
import { NEW_USER_INTRO_SLIDES, type NewUserIntroSlide } from "../lib/newUserIntroCopy";
import {
  FLARE_FONT_FAMILY,
  FULL_WIDTH_CTA_EDGE_PADDING,
  HOME_TILE_GAP,
  HEADER_CHROME_ICON_SIZE,
} from "../lib/layoutConstants";
import { useFlareColors } from "../theme";

/** Large welcome type — icon size stays 60; do not wrap in a bigger media slot. */
const TITLE_SIZE = 24;
const WELCOME_TITLE_SIZE = 26;
const TITLE_LINE = 30;
const WELCOME_TITLE_LINE = 32;
const SUPPORT_SIZE = 18;
const SUPPORT_LINE = 26;
const SUPPORT_BLOCK_HEIGHT = SUPPORT_LINE * 2;
const SLIDE_ICON_SIZE = 60;
/** 8/12 rhythm — swipe tips; X closes into the app anytime. */
const STACK_GAP_SM = HOME_TILE_GAP; // 12
const STACK_GAP_MD = HOME_TILE_GAP + 8; // 20
const STACK_GAP_LG = HOME_TILE_GAP * 2; // 24
const STACK_GAP_XL = HOME_TILE_GAP * 2 + 8; // 32
const TITLE_TO_SUPPORT_GAP = STACK_GAP_MD;
const DOTS_GAP = STACK_GAP_XL;
const HINT_GAP = STACK_GAP_LG;
/** Match dots→Swipe only — bump icon→title; leave dots/Swipe spacing alone. */
const ICON_TO_TITLE_GAP = HINT_GAP + STACK_GAP_SM;
const DOT_SIZE = 8;
const DOT_ACTIVE_WIDTH = 22;
const SLIDE_CONTENT_HEIGHT =
  SLIDE_ICON_SIZE +
  ICON_TO_TITLE_GAP +
  WELCOME_TITLE_LINE +
  TITLE_TO_SUPPORT_GAP +
  SUPPORT_BLOCK_HEIGHT;
/** Optical nudge — math center reads low. */
const OPTICAL_LIFT = 120;

/**
 * One-time swipe intro after sign-up.
 * Mid-screen tips; X enters the app anytime. No last-slide CTA.
 */
export function NewUserIntroScreen({ onFinished }: { onFinished: () => void }) {
  const c = useFlareColors();
  const insets = useSafeAreaInsets();
  const { width, height: windowHeight } = useWindowDimensions();
  const listRef = useRef<FlatList<NewUserIntroSlide>>(null);
  const [index, setIndex] = useState(0);
  const finishedRef = useRef(false);
  const dotProgress = useRef(
    NEW_USER_INTRO_SLIDES.map((_, i) => new Animated.Value(i === 0 ? 1 : 0)),
  ).current;

  const pagerHeight = Math.max(0, windowHeight - insets.top - insets.bottom);
  /** Dots sit under the lifted copy stack. */
  const dotsTop = useMemo(() => {
    const copyCenterY = (pagerHeight - OPTICAL_LIFT) / 2;
    return copyCenterY + SLIDE_CONTENT_HEIGHT / 2 + DOTS_GAP;
  }, [pagerHeight]);

  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onFinished();
  }, [onFinished]);

  useEffect(() => {
    Animated.parallel(
      dotProgress.map((progress, i) =>
        Animated.timing(progress, {
          toValue: i === index ? 1 : 0,
          duration: 240,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
      ),
    ).start();
  }, [dotProgress, index]);

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
      const isWelcome = slideIndex === 0;
      const titleSize = isWelcome ? WELCOME_TITLE_SIZE : TITLE_SIZE;
      const titleLine = isWelcome ? WELCOME_TITLE_LINE : TITLE_LINE;
      return (
        <View
          style={[
            styles.page,
            {
              width,
              height: pagerHeight,
              paddingHorizontal: FULL_WIDTH_CTA_EDGE_PADDING,
              paddingBottom: OPTICAL_LIFT,
            },
          ]}
        >
          <View style={styles.copyStack}>
            <View
              style={[
                styles.iconWrap,
                item.iconOpticalOffsetY ? { transform: [{ translateY: item.iconOpticalOffsetY }] } : null,
              ]}
            >
              <FlareLucideIcon icon={item.icon} size={SLIDE_ICON_SIZE} color={c.primary} />
            </View>
            <Text
              style={[
                styles.slideTitle,
                {
                  color: c.text,
                  fontSize: titleSize,
                  lineHeight: titleLine,
                  marginBottom: TITLE_TO_SUPPORT_GAP,
                },
              ]}
            >
              {item.title}
            </Text>
            <Text style={[styles.supportText, { color: c.textMuted }]}>{item.text}</Text>
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
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
        },
      ]}
      accessibilityLabel="Introduction. Swipe through tips. Tap close to enter the app."
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close introduction"
        onPress={finish}
        hitSlop={12}
        style={[styles.closeHit, { top: insets.top + 4 }]}
      >
        <FlareLucideIcon icon={FLARE_CHROME_LUCIDE.close} size={HEADER_CHROME_ICON_SIZE} color={c.text} />
      </Pressable>

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

        <View
          pointerEvents="none"
          style={[styles.belowCopy, { top: dotsTop }]}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <View style={styles.dots}>
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
                      outputRange: [c.cardBorder, c.primary],
                    }),
                  },
                ]}
              />
            ))}
          </View>
          {index < NEW_USER_INTRO_SLIDES.length - 1 ? (
            <Text style={[styles.hintLabel, styles.hintHit, { color: c.textMuted }]}>Swipe</Text>
          ) : (
            <View style={styles.hintHit} />
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  closeHit: {
    position: "absolute",
    right: FULL_WIDTH_CTA_EDGE_PADDING,
    zIndex: 2,
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  pagerWrap: {
    position: "relative",
  },
  pager: { flex: 1 },
  page: {
    alignItems: "center",
    justifyContent: "center",
  },
  copyStack: {
    width: "100%",
    alignItems: "center",
  },
  iconWrap: {
    marginBottom: ICON_TO_TITLE_GAP,
    alignItems: "center",
    justifyContent: "center",
  },
  slideTitle: {
    fontFamily: FLARE_FONT_FAMILY.bold,
    textAlign: "center",
    width: "100%",
  },
  supportText: {
    fontSize: SUPPORT_SIZE,
    lineHeight: SUPPORT_LINE,
    fontFamily: FLARE_FONT_FAMILY.regular,
    textAlign: "center",
    width: "100%",
    minHeight: SUPPORT_BLOCK_HEIGHT,
  },
  belowCopy: {
    position: "absolute",
    left: 0,
    right: 0,
    gap: HINT_GAP,
    alignItems: "center",
  },
  dots: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: STACK_GAP_SM - 4,
    height: DOT_SIZE,
    minHeight: DOT_SIZE,
  },
  dot: {
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
  },
  hintHit: {
    minHeight: 44,
    paddingVertical: STACK_GAP_SM,
    paddingHorizontal: STACK_GAP_MD,
    justifyContent: "center",
    alignItems: "center",
  },
  hintLabel: {
    fontSize: 15,
    lineHeight: 20,
    fontFamily: FLARE_FONT_FAMILY.medium,
    textAlign: "center",
  },
});
