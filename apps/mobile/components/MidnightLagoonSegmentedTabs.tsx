import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useFlareColors } from "../theme";
import { SPACING, RADIUS, TYPOGRAPHY } from "../designTokens";

type SegmentedTab = {
  label: string;
  value: string;
};

type SegmentedTabsProps = {
  tabs: SegmentedTab[];
  activeValue: string;
  onChange: (value: string) => void;
};

export function SegmentedTabs({ tabs, activeValue, onChange }: SegmentedTabsProps) {
  const colors = useFlareColors();

  return (
    <View style={[styles.track, { backgroundColor: colors.tray }]}>
      {tabs.map((tab) => {
        const isActive = tab.value === activeValue;
        return (
          <Pressable
            key={tab.value}
            onPress={() => onChange(tab.value)}
            style={({ pressed }) => [
              styles.tab,
              isActive && { backgroundColor: colors.card },
              { opacity: pressed ? 0.7 : 1 },
            ]}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
          >
            <Text
              style={[
                styles.tabLabel,
                {
                  color: isActive ? colors.text : colors.textSecondary,
                  fontFamily: isActive ? TYPOGRAPHY.fontFamily.semibold : TYPOGRAPHY.fontFamily.regular,
                },
              ]}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: "row",
    borderRadius: RADIUS.tray,
    padding: SPACING.xs,
    marginVertical: SPACING.card,
  },
  tab: {
    flex: 1,
    paddingVertical: SPACING.sm,
    paddingHorizontal: 6,
    borderRadius: 9,
    alignItems: "center",
  },
  tabLabel: {
    fontSize: TYPOGRAPHY.fontSize.sm,
  },
});
