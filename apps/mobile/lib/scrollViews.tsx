import React from "react";
import {
  Animated as RNAnimated,
  ScrollView as RNScrollView,
  type ScrollViewProps,
} from "react-native";
import { hideScrollIndicators } from "./hideScrollIndicators";

/** Prefer this over react-native ScrollView — indicators stay hidden on React 19. */
export const ScrollView = React.forwardRef<RNScrollView, ScrollViewProps>((props, ref) => (
  <RNScrollView ref={ref} {...hideScrollIndicators} {...props} />
));
ScrollView.displayName = "ScrollView";

/** Prefer this over Animated.ScrollView from react-native. */
export const AnimatedScrollView = React.forwardRef<
  RNScrollView,
  React.ComponentProps<typeof RNAnimated.ScrollView>
>((props, ref) => <RNAnimated.ScrollView ref={ref} {...hideScrollIndicators} {...props} />);
AnimatedScrollView.displayName = "ScrollView";
