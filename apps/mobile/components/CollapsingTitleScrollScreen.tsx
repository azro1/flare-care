import React, { useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  StyleProp,
  StyleSheet,
  useWindowDimensions,
  View,
  ViewStyle,
} from "react-native";
import type { NavigationProp, ParamListBase } from "@react-navigation/native";
import type { NativeStackNavigationOptions } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  COLLAPSING_TITLE_GAP_BELOW_HEADER,
  COLLAPSING_TITLE_SCROLL_DISTANCE,
  collapsingTitleBlockHeight,
  collapsingTitleCollapsedScale,
  FLARE_FONT_FAMILY,
  FLARE_FONT_SIZE,
  FLARE_LINE_HEIGHT,
  INFORMATIONAL_PAGE_TITLE,
  NAV_HEADER_BAR_HEIGHT,
  SCREEN_EDGE_PADDING,
} from "../lib/layoutConstants";
import { useFlareColors } from "../theme";

type CollapsingTitlePreset = "section" | "informational";

function titleMetricsForPreset(preset: CollapsingTitlePreset) {
  if (preset === "informational") {
    return {
      expandedFontSize: INFORMATIONAL_PAGE_TITLE.fontSize,
      expandedLineHeight: INFORMATIONAL_PAGE_TITLE.lineHeight,
    };
  }
  return {
    expandedFontSize: FLARE_FONT_SIZE.sectionTitle,
    expandedLineHeight: FLARE_LINE_HEIGHT.sectionTitle,
  };
}

/** Short pages: finish collapse over available scroll; tall pages: cap at COLLAPSING_TITLE_SCROLL_DISTANCE. */
function collapseScrollDistanceFor(maxScrollY: number, viewportHeight: number, contentHeight: number) {
  if (viewportHeight <= 0 || contentHeight <= 0) {
    return COLLAPSING_TITLE_SCROLL_DISTANCE;
  }
  if (maxScrollY <= 0) {
    return COLLAPSING_TITLE_SCROLL_DISTANCE;
  }
  if (maxScrollY < COLLAPSING_TITLE_SCROLL_DISTANCE) {
    return maxScrollY;
  }
  return COLLAPSING_TITLE_SCROLL_DISTANCE;
}

type CollapsingTitleScrollScreenProps = {
  title: string;
  children: React.ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
  bottomInset?: number;
  /** `informational` — What is IBD?, About, etc. Default `section` for card-based screens. */
  titlePreset?: CollapsingTitlePreset;
};

type CollapsingHeaderProps = {
  options: NativeStackNavigationOptions;
  navigation: NavigationProp<ParamListBase>;
  title: string;
  scrollY: Animated.Value;
  titleWidth: number;
  onTitleLayout: (width: number) => void;
  screenWidth: number;
  textColor: string;
  screenColor: string;
  expandedFontSize: number;
  expandedLineHeight: number;
  collapsedScale: number;
  collapseScrollDistance: number;
};

function CollapsingHeader({
  options,
  navigation,
  title,
  scrollY,
  titleWidth,
  onTitleLayout,
  screenWidth,
  textColor,
  screenColor,
  expandedFontSize,
  expandedLineHeight,
  collapsedScale,
  collapseScrollDistance,
}: CollapsingHeaderProps) {
  const insets = useSafeAreaInsets();
  const headerHeight = insets.top + NAV_HEADER_BAR_HEIGHT;
  const largeTitleTop = headerHeight + COLLAPSING_TITLE_GAP_BELOW_HEADER;
  const collapsedTitleTop = insets.top + (NAV_HEADER_BAR_HEIGHT - FLARE_FONT_SIZE.navTitle) / 2;
  const collapseTravelY = largeTitleTop - collapsedTitleTop;

  const collapseProgress = useMemo(
    () =>
      scrollY.interpolate({
        inputRange: [0, collapseScrollDistance],
        outputRange: [0, 1],
        extrapolate: "clamp",
      }),
    [collapseScrollDistance, scrollY],
  );

  const titleScale = useMemo(
    () =>
      collapseProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [1, collapsedScale],
      }),
    [collapseProgress, collapsedScale],
  );

  const titleTranslateY = useMemo(
    () =>
      collapseProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -collapseTravelY],
      }),
    [collapseProgress, collapseTravelY],
  );

  const titleCenterOffset =
    titleWidth > 0 ? screenWidth / 2 - SCREEN_EDGE_PADDING - titleWidth / 2 : 0;
  const titleTranslateX = useMemo(
    () =>
      collapseProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, titleCenterOffset],
      }),
    [collapseProgress, titleCenterOffset],
  );

  const headerLeft = options.headerLeft?.({
    canGoBack: navigation.canGoBack(),
    tintColor: options.headerTintColor,
  });
  const headerRight = options.headerRight?.({
    canGoBack: navigation.canGoBack(),
    tintColor: options.headerTintColor,
  });

  return (
    <View style={styles.headerRoot} pointerEvents="box-none">
      <View style={[styles.headerBar, { height: headerHeight, backgroundColor: screenColor }]}>
        <View style={[styles.headerRow, { paddingTop: insets.top, height: headerHeight }]}>
          {headerLeft}
          <View style={styles.headerSideSpacer} />
          {headerRight}
        </View>
      </View>

      <Animated.Text
        pointerEvents="none"
        onLayout={(e) => {
          const w = e.nativeEvent.layout.width;
          if (w > 0) onTitleLayout(w);
        }}
        style={[
          styles.title,
          {
            fontSize: expandedFontSize,
            lineHeight: expandedLineHeight,
            top: largeTitleTop,
            left: SCREEN_EDGE_PADDING,
            color: textColor,
            transform: [
              { translateX: titleTranslateX },
              { translateY: titleTranslateY },
              { scale: titleScale },
            ],
          },
        ]}
      >
        {title}
      </Animated.Text>
    </View>
  );
}

/**
 * One title morphs between a large page title and the nav bar centre.
 * Custom header with overflow visible so the title is not clipped when expanded.
 */
export function CollapsingTitleScrollScreen({
  title,
  children,
  contentContainerStyle,
  bottomInset = 0,
  titlePreset = "section",
}: CollapsingTitleScrollScreenProps) {
  const c = useFlareColors();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const scrollY = useRef(new Animated.Value(0)).current;
  const [titleWidth, setTitleWidth] = useState(0);
  const [scrollViewportHeight, setScrollViewportHeight] = useState(0);
  const [scrollContentHeight, setScrollContentHeight] = useState(0);

  const { expandedFontSize, expandedLineHeight } = titleMetricsForPreset(titlePreset);
  const collapsedScale = collapsingTitleCollapsedScale(expandedFontSize);
  const headerHeight = insets.top + NAV_HEADER_BAR_HEIGHT;
  const largeTitleTop = headerHeight + COLLAPSING_TITLE_GAP_BELOW_HEADER;
  const scrollPaddingTop = largeTitleTop + collapsingTitleBlockHeight(expandedLineHeight);

  const maxScrollY = Math.max(0, scrollContentHeight - scrollViewportHeight);
  const collapseScrollDistance = collapseScrollDistanceFor(
    maxScrollY,
    scrollViewportHeight,
    scrollContentHeight,
  );
  const needsMinScrollHeight =
    scrollViewportHeight > 0 && scrollContentHeight > 0 && maxScrollY <= 0;
  const minContentHeight = needsMinScrollHeight
    ? scrollViewportHeight + COLLAPSING_TITLE_SCROLL_DISTANCE
    : undefined;

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTransparent: true,
      headerShadowVisible: false,
      header: ({ options, navigation: nav }) => (
        <CollapsingHeader
          options={options}
          navigation={nav}
          title={title}
          scrollY={scrollY}
          titleWidth={titleWidth}
          onTitleLayout={setTitleWidth}
          screenWidth={screenWidth}
          textColor={c.text}
          screenColor={c.screen}
          expandedFontSize={expandedFontSize}
          expandedLineHeight={expandedLineHeight}
          collapsedScale={collapsedScale}
          collapseScrollDistance={collapseScrollDistance}
        />
      ),
    });
    return () => {
      navigation.setOptions({
        headerTransparent: false,
        header: undefined,
      });
    };
  }, [
    c.screen,
    c.text,
    collapseScrollDistance,
    collapsedScale,
    expandedFontSize,
    expandedLineHeight,
    navigation,
    screenWidth,
    title,
    titleWidth,
  ]);

  return (
    <Animated.ScrollView
      style={{ flex: 1, backgroundColor: c.screen }}
      onLayout={(e) => setScrollViewportHeight(e.nativeEvent.layout.height)}
      onContentSizeChange={(_, height) => setScrollContentHeight(height)}
      contentContainerStyle={[
        {
          paddingHorizontal: SCREEN_EDGE_PADDING,
          paddingTop: scrollPaddingTop,
          paddingBottom: bottomInset,
          minHeight: minContentHeight,
        },
        contentContainerStyle,
      ]}
      scrollEventThrottle={16}
      onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
        useNativeDriver: true,
      })}
    >
      {children}
    </Animated.ScrollView>
  );
}

const styles = StyleSheet.create({
  headerRoot: {
    overflow: "visible",
    zIndex: 100,
    elevation: 100,
  },
  headerBar: {
    overflow: "hidden",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerSideSpacer: {
    flex: 1,
  },
  title: {
    position: "absolute",
    fontFamily: FLARE_FONT_FAMILY.bold,
    maxWidth: "92%",
    includeFontPadding: false,
  },
});
