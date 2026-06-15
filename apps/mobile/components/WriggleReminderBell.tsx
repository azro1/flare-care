import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import { Animated } from "react-native";

export function WriggleReminderBell({ color }: { color: string }) {
  const rotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const wriggle = Animated.sequence([
      Animated.timing(rotate, { toValue: 1, duration: 90, useNativeDriver: true }),
      Animated.timing(rotate, { toValue: -1, duration: 90, useNativeDriver: true }),
      Animated.timing(rotate, { toValue: 0.65, duration: 75, useNativeDriver: true }),
      Animated.timing(rotate, { toValue: -0.65, duration: 75, useNativeDriver: true }),
      Animated.timing(rotate, { toValue: 0, duration: 70, useNativeDriver: true }),
    ]);
    const loop = Animated.loop(Animated.sequence([wriggle, Animated.delay(4500)]));
    loop.start();
    return () => loop.stop();
  }, [rotate]);

  const wiggle = rotate.interpolate({
    inputRange: [-1, 1],
    outputRange: ["-10deg", "10deg"],
  });

  return (
    <Animated.View style={{ transform: [{ rotate: wiggle }] }}>
      <Ionicons
        name="notifications"
        size={14}
        color={color}
        accessibilityElementsHidden
        importantForAccessibility="no"
        accessibilityIgnoresInvertColors
      />
    </Animated.View>
  );
}
