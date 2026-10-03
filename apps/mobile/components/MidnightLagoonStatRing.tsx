import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { useFlareColors } from "../theme";
import { RADIUS, TYPOGRAPHY, DIMENSIONS } from "../designTokens";

type StatRingProps = {
  value: string;
  label: string;
  progress: number;
};

export function StatRing({ value, label, progress }: StatRingProps) {
  const colors = useFlareColors();
  const size = DIMENSIONS.ringOuter;
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progressOffset = circumference - (progress * circumference);

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
      <View style={styles.ringContainer}>
        <Svg width={size} height={size}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={colors.tray}
            strokeWidth={strokeWidth}
            fill="none"
          />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={colors.primary}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={progressOffset}
            strokeLinecap="round"
            rotation="-90"
            origin={`${size / 2}, ${size / 2}`}
          />
        </Svg>
      </View>
      <Text
        style={[
          styles.value,
          { color: colors.text, fontFamily: TYPOGRAPHY.fontFamily.bold },
        ]}
      >
        {value}
      </Text>
      <Text
        style={[
          styles.label,
          { color: colors.textSecondary, fontFamily: TYPOGRAPHY.fontFamily.regular },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: RADIUS.card,
    borderWidth: 1,
    padding: 12,
    alignItems: "center",
  },
  ringContainer: {
    marginBottom: 6,
  },
  value: {
    fontSize: TYPOGRAPHY.fontSize.stat,
    marginBottom: 2,
  },
  label: {
    fontSize: TYPOGRAPHY.fontSize.xs,
  },
});
