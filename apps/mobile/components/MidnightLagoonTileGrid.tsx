import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useFlareColors } from "../theme";
import { SPACING, RADIUS, TYPOGRAPHY, DIMENSIONS, OPACITY } from "../designTokens";
import { FlareLucideIcon } from "../lib/flareLucideIcons";
import type { LucideIcon } from "lucide-react-native";

type TileGridProps = {
  tiles: Array<{
    icon: LucideIcon;
    label: string;
    onPress: () => void;
  }>;
  columns?: 2 | 3;
};

export function TileGrid({ tiles, columns = 3 }: TileGridProps) {
  const colors = useFlareColors();

  // Calculate tile width: (100% - gaps) / columns
  const tileWidthPercentage = columns === 3 ? `31%` : `48%`;

  return (
    <View style={[styles.grid, columns === 2 && styles.grid2]}>
      {tiles.map((tile, index) => (
        <Pressable
          key={index}
          onPress={tile.onPress}
          style={({ pressed }) => [
            styles.tile,
            { 
              backgroundColor: colors.tray, 
              opacity: pressed ? 0.7 : 1,
              width: tileWidthPercentage,
            },
          ]}
          accessibilityRole="button"
        >
          <View
            style={[
              styles.iconTile,
              { backgroundColor: colors.primary + Math.round(OPACITY.iconTile * 255).toString(16).padStart(2, '0') },
            ]}
          >
            <FlareLucideIcon icon={tile.icon} size={18} color={colors.primary} />
          </View>
          <Text
            style={[
              styles.tileLabel,
              { color: colors.text, fontFamily: TYPOGRAPHY.fontFamily.medium },
            ]}
          >
            {tile.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.sm,
  },
  grid2: {
    gap: SPACING.sm,
  },
  tile: {
    borderRadius: RADIUS.tile,
    padding: SPACING.md,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 70,
  },
  iconTile: {
    width: DIMENSIONS.iconTile,
    height: DIMENSIONS.iconTile,
    borderRadius: RADIUS.iconTile,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.sm,
  },
  tileLabel: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    textAlign: "center",
  },
});
