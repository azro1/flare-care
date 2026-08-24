import { FLARE_CHROME_LUCIDE, FlareLucideIcon } from "../lib/flareLucideIcons";
import React, { useEffect, useRef } from "react";
import { Animated, InteractionManager } from "react-native";

/** Wait for push + modal cover to settle before the first wriggle (avoids post-land shimmy). */
const WRIGGLE_START_DELAY_MS = 800;

export function WriggleReminderBell({ color }: { color: string }) {
  const rotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let cancelled = false;
    let startTimer: ReturnType<typeof setTimeout> | null = null;
    let loop: Animated.CompositeAnimation | null = null;

    const wriggle = Animated.sequence([
      Animated.timing(rotate, { toValue: 1, duration: 90, useNativeDriver: true }),
      Animated.timing(rotate, { toValue: -1, duration: 90, useNativeDriver: true }),
      Animated.timing(rotate, { toValue: 0.65, duration: 75, useNativeDriver: true }),
      Animated.timing(rotate, { toValue: -0.65, duration: 75, useNativeDriver: true }),
      Animated.timing(rotate, { toValue: 0, duration: 70, useNativeDriver: true }),
    ]);

    const task = InteractionManager.runAfterInteractions(() => {
      startTimer = setTimeout(() => {
        if (cancelled) return;
        loop = Animated.loop(Animated.sequence([wriggle, Animated.delay(4500)]));
        loop.start();
      }, WRIGGLE_START_DELAY_MS);
    });

    return () => {
      cancelled = true;
      task.cancel();
      if (startTimer) clearTimeout(startTimer);
      loop?.stop();
    };
  }, [rotate]);

  const wiggle = rotate.interpolate({
    inputRange: [-1, 1],
    outputRange: ["-10deg", "10deg"],
  });

  return (
    <Animated.View style={{ transform: [{ rotate: wiggle }] }}>
      <FlareLucideIcon
        icon={FLARE_CHROME_LUCIDE.notifications}
        size={14}
        color={color}
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
    </Animated.View>
  );
}
