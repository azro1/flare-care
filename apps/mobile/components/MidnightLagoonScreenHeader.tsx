import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useFlareColors } from "../theme";
import { SPACING, TYPOGRAPHY } from "../designTokens";

type ScreenHeaderProps = {
  title: string;
  subtitle?: string;
  onMenuPress?: () => void;
  rightAction?: React.ReactNode;
};

export function ScreenHeader({ title, subtitle, onMenuPress, rightAction }: ScreenHeaderProps) {
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
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {title}
        </Text>
      </View>
      {rightAction ? (
        <View style={styles.rightAction}>{rightAction}</View>
      ) : onMenuPress ? (
        <Pressable
          onPress={onMenuPress}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel="Menu"
        >
          <Text style={[styles.menuIcon, { color: colors.textSecondary }]}>⋮</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  rightAction: {
    flexShrink: 0,
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
