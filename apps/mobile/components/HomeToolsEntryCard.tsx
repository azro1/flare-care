/**
 * My tools — single normal feature tile on home (wrench), opens the Tools screen.
 */
import React from "react";
import { HomeFeatureTileGrid } from "./HomeFeatureTileGrid";
import { FLARE_FEATURE_LUCIDE, FlareLucideIcon } from "../lib/flareLucideIcons";
import { HOME_FEATURE_TILE_ICON_SIZE } from "../lib/layoutConstants";
import { useFlareColors } from "../theme";

type Props = {
  pageWidth: number;
  onPress: () => void;
};

export function HomeToolsEntryCard({ pageWidth, onPress }: Props) {
  const c = useFlareColors();
  if (pageWidth <= 0) return null;

  return (
    <HomeFeatureTileGrid
      pageWidth={pageWidth}
      tiles={[
        {
          id: "tools",
          label: "My tools",
          icon: (
            <FlareLucideIcon
              icon={FLARE_FEATURE_LUCIDE.tools}
              size={HOME_FEATURE_TILE_ICON_SIZE}
              color={c.primary}
            />
          ),
        },
      ]}
      onPressTile={onPress}
    />
  );
}
