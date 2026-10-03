import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useFlareColors } from "../theme";
import { SPACING, TYPOGRAPHY } from "../designTokens";

type ScreenHeaderProps = {
  title: string;
  subtitle?: string;
  onMenuPress?: () => void;
};

export function ScreenHeader({ title, subtitle, onMenuPress }: ScreenHeaderProps) {
  const colors = useFlareColors();

  return (
    <View style={styles.header}>
      <View style={styles.headerText}>
        {subtitle && (
          <Text
            style={[
              styles.subtitle,
              { color: colors.textSecondary, fontFamily: TYPOGRAPHY.fontFamily.regular },
            ]}
          >
            {subtitle}
          </Text>
        )}
        <Text
          style={[
            styles.title,
            { color: colors.text, fontFamily: TYPOGRAPHY.fontFamily.bold },
          ]}
        >
          {title}
        </Text>
      </View>
      {onMenuPress && (
        <Pressable
          onPress={onMenuPress}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel="Menu"
        >
          <Text style={[styles.menuIcon, { color: colors.textSecondary }]}>⋮</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  headerText: {
    flex: 1,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.fontSize.md,
    marginBottom: 2,
  },
  title: {
    fontSize: TYPOGRAPHY.fontSize.screenTitle,
  },
  menuIcon: {
    fontSize: 22,
  },
});
