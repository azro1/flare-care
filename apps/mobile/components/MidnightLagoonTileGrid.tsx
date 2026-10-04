import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet, useWindowDimensions, type LayoutChangeEvent } from "react-native";
import { useFlareColors } from "../theme";
import { SPACING, RADIUS, TYPOGRAPHY, DIMENSIONS } from "../designTokens";
import { FlareLucideIcon } from "../lib/flareLucideIcons";
import { HEADER_CHROME_ICON_SIZE } from "../lib/layoutConstants";
import type { LucideIcon } from "lucide-react-native";

type TileGridProps = {
  tiles: Array<{
    icon: LucideIcon;
    label: string;
    onPress: () => void;
  }>;
  columns?: 2 | 3;
  /** When true, tiles have no filled background so they sit flat on a card. */
  plain?: boolean;
};

export function TileGrid({ tiles, columns = 3, plain = false }: TileGridProps) {
  const colors = useFlareColors();
  const { width: windowWidth } = useWindowDimensions();
  const estimatedWidth = Math.floor(
    (windowWidth - SPACING.screen * 2 - SPACING.lg * 2 - 2 - SPACING.sm * (columns - 1)) / columns,
  );
  const [tileWidth, setTileWidth] = useState(estimatedWidth);

  // Measure the row and give every tile an exact pixel width, so the column
  // count is guaranteed instead of guessed from percentages.
  const handleLayout = (event: LayoutChangeEvent) => {
    const width = event.nativeEvent.layout.width;
    const next = Math.floor((width - SPACING.sm * (columns - 1)) / columns);
    setTileWidth((prev) => (prev === next ? prev : next));
  };

  return (
    <View style={styles.grid} onLayout={handleLayout}>
      {tiles.map((tile, index) => (
        <Pressable
          key={index}
          onPress={tile.onPress}
          style={({ pressed }) => [
            styles.tile,
            { 
              backgroundColor: plain ? "transparent" : colors.tray, 
              opacity: pressed ? 0.7 : 1,
              width: tileWidth || undefined,
            },
          ]}
          accessibilityRole="button"
        >
          <View style={styles.iconTile}>
            <FlareLucideIcon icon={tile.icon} size={HEADER_CHROME_ICON_SIZE} color={colors.primary} />
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
