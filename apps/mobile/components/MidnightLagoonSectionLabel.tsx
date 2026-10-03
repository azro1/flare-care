import React from "react";
import { Text, StyleSheet, TextStyle } from "react-native";
import { useFlareColors } from "../theme";
import { SPACING, TYPOGRAPHY } from "../designTokens";

type SectionLabelProps = {
  children: string;
  style?: TextStyle;
};

export function SectionLabel({ children, style }: SectionLabelProps) {
  const colors = useFlareColors();

  return (
    <Text
      style={[
        styles.label,
        {
          color: colors.textSecondary,
          fontFamily: TYPOGRAPHY.fontFamily.semibold,
        },
        style,
      ]}
    >
      {children.toUpperCase()}
    </Text>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    letterSpacing: TYPOGRAPHY.letterSpacing.section,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
    marginHorizontal: 2,
  },
});
