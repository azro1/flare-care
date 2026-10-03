import React from "react";
import { View, ViewStyle, StyleSheet } from "react-native";
import { useFlareColors } from "../theme";
import { SPACING, RADIUS } from "../designTokens";

type CardProps = {
  children: React.ReactNode;
  style?: ViewStyle;
  noPadding?: boolean;
};

export function Card({ children, style, noPadding }: CardProps) {
  const colors = useFlareColors();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.cardBorder,
          padding: noPadding ? 0 : SPACING.lg,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS.card,
    borderWidth: 1,
    marginBottom: SPACING.card,
  },
});
