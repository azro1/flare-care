import type { ComponentProps } from "react";
import { Animated, FlatList, ScrollView, SectionList } from "react-native";

/** Hide scroll indicators app-wide; scrolling still works normally. */
export const hideScrollIndicators = {
  showsVerticalScrollIndicator: false,
  showsHorizontalScrollIndicator: false,
} as const;

type ScrollViewDefaults = {
  defaultProps?: Partial<ComponentProps<typeof ScrollView>>;
};

function applyDefaults(Component: ScrollViewDefaults) {
  Component.defaultProps = {
    ...Component.defaultProps,
    ...hideScrollIndicators,
  };
}

/** Best-effort fallback for any screen still importing ScrollView from react-native. */
applyDefaults(ScrollView as typeof ScrollView & ScrollViewDefaults);
applyDefaults(Animated.ScrollView as typeof Animated.ScrollView & ScrollViewDefaults);
applyDefaults(FlatList as typeof FlatList & ScrollViewDefaults);
applyDefaults(SectionList as typeof SectionList & ScrollViewDefaults);
