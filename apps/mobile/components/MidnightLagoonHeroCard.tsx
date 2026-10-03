import React from "react";
import { View, Text, StyleSheet, ViewStyle } from "react-native";
import { useFlareColors } from "../theme";
import { SPACING, RADIUS, TYPOGRAPHY } from "../designTokens";

type HeroCardProps = {
  title?: string;
  subtitle?: string;
  children?: React.ReactNode;
  style?: ViewStyle;
};

export function HeroCard({ title, subtitle, children, style }: HeroCardProps) {
  const colors = useFlareColors();

  return (
    <View style={[styles.heroCard, { backgroundColor: colors.primary }, style]}>
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
