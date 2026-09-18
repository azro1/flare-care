/**
 * Automatic 2-column feature tile grid for My health / My tools.
 * Equal column width; height from content (title wraps). Add tiles → new rows.
 */
import React, { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { FLARE_FONT_FAMILY, FLARE_FONT_SIZE, HOME_TILE_GAP } from "../lib/layoutConstants";
import { useFlareColors } from "../theme";

export type HomeFeatureGridTile = {
  id: string;
  label: string;
  icon: React.ReactNode;
};

type Props = {
  tiles: HomeFeatureGridTile[];
  pageWidth: number;
  onPressTile: (tile: HomeFeatureGridTile) => void;
};

const TITLE_LINE_HEIGHT = 18;

function columnWidth(pageWidth: number): number {
  return Math.max(0, Math.floor((pageWidth - HOME_TILE_GAP) / 2));
}

export function HomeFeatureTileGrid({ tiles, pageWidth, onPressTile }: Props) {
  const c = useFlareColors();
  const tileW = useMemo(() => columnWidth(pageWidth), [pageWidth]);

  return (
    <View style={[styles.grid, { width: pageWidth }]}>
      {tiles.map((tile) => (
        <Pressable
          key={tile.id}
          accessibilityRole="button"
          accessibilityLabel={tile.label}
          onPress={() => onPressTile(tile)}
          style={[styles.tile, { width: tileW, backgroundColor: c.card }]}
        >
          <View style={styles.body}>
            <View style={styles.iconWrap}>{tile.icon}</View>
            <Text
              style={[styles.title, { color: c.text }]}
              numberOfLines={2}
              ellipsizeMode="tail"
            >
              {tile.label}
            </Text>
          </View>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: HOME_TILE_GAP,
    alignItems: "stretch",
  },
  tile: {
    flexDirection: "column",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 10,
    alignItems: "stretch",
    justifyContent: "center",
    overflow: "hidden",
    minHeight: 116,
  },
  body: {
    flexGrow: 1,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    width: "100%",
  },
  iconWrap: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: FLARE_FONT_SIZE.muted,
    fontFamily: FLARE_FONT_FAMILY.medium,
    textAlign: "center",
    lineHeight: TITLE_LINE_HEIGHT,
    width: "100%",
  },
});
