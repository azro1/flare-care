import type { ComponentProps } from "react";
import { Animated, ScrollView } from "react-native";

/** Hide scroll indicators app-wide; scrolling still works normally. */
const hideScrollIndicators = {
  showsVerticalScrollIndicator: false,
  showsHorizontalScrollIndicator: false,
} as const;

type ScrollViewDefaults = {
  defaultProps?: Partial<ComponentProps<typeof ScrollView>>;
};

const ScrollViewWithDefaults = ScrollView as typeof ScrollView & ScrollViewDefaults;
const AnimatedScrollViewWithDefaults = Animated.ScrollView as typeof Animated.ScrollView & ScrollViewDefaults;

ScrollViewWithDefaults.defaultProps = {
  ...ScrollViewWithDefaults.defaultProps,
  ...hideScrollIndicators,
};

AnimatedScrollViewWithDefaults.defaultProps = {
  ...AnimatedScrollViewWithDefaults.defaultProps,
  ...hideScrollIndicators,
};
