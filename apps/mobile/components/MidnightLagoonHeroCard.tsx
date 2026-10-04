import React, { useState } from "react";
import { Text, StyleSheet, View, ViewStyle, type LayoutChangeEvent } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { useFlareColors } from "../theme";
import { SPACING, RADIUS, TYPOGRAPHY } from "../designTokens";

type HeroCardProps = {
  title?: string;
  subtitle?: string;
  children?: React.ReactNode;
  style?: ViewStyle;
  /** Gradient start. Defaults to the green hero. */
  fillStart?: string;
  /** Gradient end. Defaults to the green hero. */
  fillEnd?: string;
};

export function HeroCard({ title, subtitle, children, style, fillStart, fillEnd }: HeroCardProps) {
  const colors = useFlareColors();
  const gradientStart = fillStart ?? colors.heroStart;
  const gradientEnd = fillEnd ?? colors.heroEnd;
  const [size, setSize] = useState({ width: 0, height: 0 });

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setSize((prev) => (prev.width === width && prev.height === height ? prev : { width, height }));
  };

  return (
    <View onLayout={onLayout} style={[styles.heroCard, { backgroundColor: gradientStart }, style]}>
      {size.width > 0 && size.height > 0 ? (
        <Svg width={size.width} height={size.height} style={StyleSheet.absoluteFill} pointerEvents="none">
          <Defs>
            <LinearGradient id="heroFill" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={gradientStart} />
              <Stop offset="1" stopColor={gradientEnd} />
            </LinearGradient>
          </Defs>
          <Rect width={size.width} height={size.height} fill="url(#heroFill)" />
        </Svg>
      ) : null}
      {title ? (
        <Text style={[styles.heroTitle, { fontFamily: TYPOGRAPHY.fontFamily.semibold }]}>{title}</Text>
      ) : null}
      {subtitle ? (
        <Text style={[styles.heroSubtitle, { fontFamily: TYPOGRAPHY.fontFamily.regular }]}>{subtitle}</Text>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    borderRadius: RADIUS.hero,
    padding: SPACING.lg,
    marginTop: SPACING.card,
    marginBottom: SPACING.card,
    overflow: "hidden",
  },
  heroTitle: {
    fontSize: TYPOGRAPHY.fontSize.heroTitle,
    color: "#ffffff",
    marginBottom: SPACING.xs,
  },
  heroSubtitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: "rgba(255, 255, 255, 0.85)",
    marginBottom: SPACING.card,
  },
});
