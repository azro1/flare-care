import React from "react";
import { View, Text, StyleSheet, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useFlareColors } from "../theme";
import { SPACING, RADIUS, TYPOGRAPHY } from "../designTokens";

type HeroCardProps = {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
  style?: ViewStyle;
};

export function HeroCard({ title, subtitle, children, style }: HeroCardProps) {
  const colors = useFlareColors();
  const navyBlend = "#0D234B";

  return (
    <LinearGradient
      colors={[colors.primary, navyBlend]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.heroCard, style]}
    >
      <Text style={[styles.heroTitle, { fontFamily: TYPOGRAPHY.fontFamily.semibold }]}>
        {title}
      </Text>
      {subtitle && (
        <Text style={[styles.heroSubtitle, { fontFamily: TYPOGRAPHY.fontFamily.regular }]}>
          {subtitle}
        </Text>
      )}
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    borderRadius: RADIUS.hero,
    padding: SPACING.lg,
    marginVertical: SPACING.card,
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
