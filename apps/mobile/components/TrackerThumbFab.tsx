import { useNavigation } from "@react-navigation/native";
import React, { useEffect, useRef, useState } from "react";
import { Animated, Platform, Pressable, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FLARE_CHROME_LUCIDE, FlareLucideIcon } from "../lib/flareLucideIcons";
import {
  TRACKER_THUMB_FAB_SIZE,
  trackerThumbFabBottom,
  trackerThumbFabInsetRight,
  trackerThumbFabScrollPadding,
} from "../lib/layoutConstants";
import { useFlareColors } from "../theme";

export function useTrackerThumbFabLayout(tabBarClearance = 0) {
  const insets = useSafeAreaInsets();
  const fabBottom = trackerThumbFabBottom(insets.bottom, { tabBarClearance });
  const fabInsetRight = trackerThumbFabInsetRight(insets.right);
  const scrollBottomPad = trackerThumbFabScrollPadding(fabBottom);
  return { fabBottom, fabInsetRight, scrollBottomPad };
}

/**
 * Thumb-reach + on tracker hubs. Hidden until the stack push settles so it does not
 * slide with the page while the tab bar stays fixed.
 */
export function TrackerThumbFab({
  accessibilityLabel,
  onPress,
  tabBarClearance = 0,
}: {
  accessibilityLabel: string;
  onPress: () => void;
  tabBarClearance?: number;
}) {
  const c = useFlareColors();
  const navigation = useNavigation();
  const { fabBottom, fabInsetRight } = useTrackerThumbFabLayout(tabBarClearance);
  const opacity = useRef(new Animated.Value(0)).current;
  const [ready, setReady] = useState(false);
  const revealedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const reveal = () => {
      if (cancelled || revealedRef.current) return;
      revealedRef.current = true;
      setReady(true);
      Animated.timing(opacity, {
        toValue: 1,
        duration: 140,
        useNativeDriver: true,
      }).start();
    };

    // Native-stack event — keep FAB off-screen motion until the push lands.
    const unsubTransition = (
      navigation as {
        addListener: (
          event: string,
          cb: (e: { data?: { closing?: boolean } }) => void,
        ) => () => void;
      }
    ).addListener("transitionEnd", (e) => {
      if (e?.data?.closing) return;
      reveal();
    });

    // Fallback when there is no push animation (or transitionEnd never fires).
    const fallback = setTimeout(reveal, 450);

    return () => {
      cancelled = true;
      unsubTransition();
      clearTimeout(fallback);
    };
  }, [navigation, opacity]);

  return (
    <Animated.View
      pointerEvents={ready ? "box-none" : "none"}
      style={[
        styles.fabWrap,
        {
          bottom: fabBottom,
          right: fabInsetRight,
          opacity,
        },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={onPress}
        style={({ pressed }) => [
          styles.fab,
          {
            backgroundColor: c.primary,
            opacity: pressed ? 0.92 : 1,
            ...Platform.select({
              ios: {
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: c.isDark ? 0.35 : 0.18,
                shadowRadius: 8,
              },
              android: { elevation: 6 },
            }),
          },
        ]}
      >
        <FlareLucideIcon icon={FLARE_CHROME_LUCIDE.add} size={30} color={c.white} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fabWrap: {
    position: "absolute",
    zIndex: 21,
  },
  fab: {
    width: TRACKER_THUMB_FAB_SIZE,
    height: TRACKER_THUMB_FAB_SIZE,
    borderRadius: TRACKER_THUMB_FAB_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
  },
});
