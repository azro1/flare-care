import { FLARE_CHROME_LUCIDE, FlareLucideIcon } from "../lib/flareLucideIcons";
import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { FLARE_FONT_FAMILY, FLARE_FONT_SIZE, FLARE_LINE_HEIGHT } from "../lib/layoutConstants";
import { useFlareColors } from "../theme";

const RING_SIZE = 196;
const STROKE_WIDTH = 12;
const RADIUS = (RING_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
/** Soft disc inset from the stroke so goal content sits in a clear center. */
const INNER_DISC = RING_SIZE - STROKE_WIDTH * 2 - 20;
const CHECK_BADGE = 40;

export const HYDRATION_RING_SIZE = RING_SIZE;

/** Circular progress for today's hydration. At goal, ring stays full and center swaps to success. */
export function HydrationProgressRing({
  glasses,
  target,
  atGoal,
}: {
  glasses: number;
  target: number;
  atGoal: boolean;
}) {
  const c = useFlareColors();
  const progress = atGoal ? 1 : Math.min(1, target > 0 ? glasses / target : 0);
  const strokeDashoffset = CIRCUMFERENCE * (1 - progress);
  const goalEnter = useRef(new Animated.Value(atGoal ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(goalEnter, {
      toValue: atGoal ? 1 : 0,
      friction: 7,
      tension: 80,
      useNativeDriver: true,
    }).start();
  }, [atGoal, goalEnter]);

  const goalScale = goalEnter.interpolate({
    inputRange: [0, 1],
    outputRange: [0.92, 1],
  });

  return (
    <View
      style={styles.wrap}
      accessibilityRole="summary"
      accessibilityLabel={
        atGoal ? `Complete. ${target} of ${target} cups` : `${glasses} of ${target} cups`
      }
    >
      <Svg width={RING_SIZE} height={RING_SIZE}>
        <Circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RADIUS}
          stroke={c.cardBorder}
          strokeWidth={STROKE_WIDTH}
          fill="none"
        />
        <Circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RADIUS}
          stroke={c.primary}
          strokeWidth={STROKE_WIDTH}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
          strokeDashoffset={strokeDashoffset}
          transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
        />
      </Svg>

      <View style={styles.center} pointerEvents="none">
        {atGoal ? (
          <Animated.View
            style={[
              styles.goalStage,
              { opacity: goalEnter, transform: [{ scale: goalScale }] },
            ]}
          >
            <View style={[styles.innerDisc, { backgroundColor: c.primary, opacity: 0.1 }]} />
            <View style={[styles.checkBadge, { backgroundColor: c.primary }]}>
              <FlareLucideIcon icon={FLARE_CHROME_LUCIDE.check} size={22} color={c.white} />
            </View>
            <View style={styles.goalCopyStack}>
              <Text style={[styles.goalTitle, { color: c.text }]}>Complete</Text>
              <Text style={[styles.goalCaption, { color: c.textMuted }]}>
                {target}/{target} cups today
              </Text>
            </View>
          </Animated.View>
        ) : (
          <View style={styles.stepStack}>
            <Text style={[styles.count, { color: c.text }]}>
              {glasses}
              <Text style={[styles.countOf, { color: c.textMuted }]}>/{target}</Text>
            </Text>
            <Text style={[styles.caption, { color: c.textMuted }]}>cups today</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  stepStack: {
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  goalStage: {
    width: INNER_DISC,
    height: INNER_DISC,
    alignItems: "center",
    justifyContent: "center",
  },
  innerDisc: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: INNER_DISC / 2,
  },
  /** Fixed in the disc — text spacing below won’t shift it. */
  checkBadge: {
    position: "absolute",
    top: 20,
    left: (INNER_DISC - CHECK_BADGE) / 2,
    width: CHECK_BADGE,
    height: CHECK_BADGE,
    borderRadius: CHECK_BADGE / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  goalCopyStack: {
    position: "absolute",
    top: 20 + CHECK_BADGE + 8,
    left: 12,
    right: 12,
    alignItems: "center",
    gap: 4,
  },
  goalTitle: {
    fontSize: 17,
    fontFamily: FLARE_FONT_FAMILY.extrabold,
    lineHeight: 21,
    textAlign: "center",
  },
  count: {
    fontSize: 40,
    fontFamily: FLARE_FONT_FAMILY.extrabold,
    lineHeight: 44,
  },
  countOf: {
    fontSize: FLARE_FONT_SIZE.navTitle,
    fontFamily: FLARE_FONT_FAMILY.bold,
  },
  caption: {
    fontSize: FLARE_FONT_SIZE.muted,
    fontFamily: FLARE_FONT_FAMILY.regular,
    lineHeight: FLARE_LINE_HEIGHT.muted,
    textAlign: "center",
  },
  goalCaption: {
    fontSize: 15,
    fontFamily: FLARE_FONT_FAMILY.regular,
    lineHeight: 20,
    textAlign: "center",
  },
});
