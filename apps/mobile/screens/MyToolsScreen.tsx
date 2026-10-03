/**
 * My tools — doors for Weight, Fluid Output, Food & Drink, Out & About.
 */
import React, { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { ScrollView } from "../lib/scrollViews";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScreenHeader } from "../components/MidnightLagoonScreenHeader";
import { HomeFeatureTileGrid, type HomeFeatureGridTile } from "../components/HomeFeatureTileGrid";
import { FlareLucideIcon } from "../lib/flareLucideIcons";
import { SPACING } from "../designTokens";
import {
  HOME_FEATURE_TILE_ICON_SIZE,
  SCREEN_EDGE_PADDING,
  bottomTabBarScrollInset,
} from "../lib/layoutConstants";
import { MY_TOOL_DOORS } from "../lib/myToolsShared";
import { useFlareColors } from "../theme";

export function MyToolsScreen() {
  const navigation = useNavigation<any>();
  const c = useFlareColors();
  const insets = useSafeAreaInsets();
  const bottomScrollInset = bottomTabBarScrollInset(insets.bottom);
  const [gridW, setGridW] = useState(0);

  const tiles = useMemo(
    (): HomeFeatureGridTile[] =>
      MY_TOOL_DOORS.map((door) => ({
        id: door.id,
        label: door.label,
        icon: <FlareLucideIcon icon={door.icon} size={HOME_FEATURE_TILE_ICON_SIZE} color={c.primary} />,
      })),
    [c.primary],
  );

  return (
    <View style={[styles.screen, { backgroundColor: c.screen }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: bottomScrollInset + 16 }]}
      >
        <ScreenHeader title="My Tools" />

        <View
          onLayout={(e) => {
            const w = Math.round(e.nativeEvent.layout.width);
            if (w > 0 && w !== gridW) setGridW(w);
          }}
        >
          {gridW > 0 ? (
            <HomeFeatureTileGrid
              tiles={tiles}
              pageWidth={gridW}
              onPressTile={(tile) => {
                const door = MY_TOOL_DOORS.find((d) => d.id === tile.id);
                if (door) navigation.navigate(door.screen);
              }}
            />
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: SCREEN_EDGE_PADDING,
    paddingTop: SPACING.lg,
  },
});
