import { Ionicons } from "@expo/vector-icons";
import { Platform, Pressable, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  TRACKER_THUMB_FAB_SIZE,
  trackerThumbFabBottom,
  trackerThumbFabInsetRight,
  trackerThumbFabScrollPadding,
} from "../lib/layoutConstants";
import { useFlareColors } from "../theme";

export function useTrackerThumbFabLayout(tabBarClearance = 0) {
  const insets = useSafeAreaInsets();
  const fabBottom = trackerThumbFabBottom(insets.bottom, { tabBarClearance });
  const fabInsetRight = trackerThumbFabInsetRight(insets.right);
  const scrollBottomPad = trackerThumbFabScrollPadding(fabBottom);
  return { fabBottom, fabInsetRight, scrollBottomPad };
}

export function TrackerThumbFab({
  accessibilityLabel,
  onPress,
  tabBarClearance = 0,
}: {
  accessibilityLabel: string;
  onPress: () => void;
  tabBarClearance?: number;
}) {
  const c = useFlareColors();
  const { fabBottom, fabInsetRight } = useTrackerThumbFabLayout(tabBarClearance);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [
        styles.fab,
        {
          backgroundColor: c.primary,
          bottom: fabBottom,
          right: fabInsetRight,
          opacity: pressed ? 0.92 : 1,
          ...Platform.select({
            ios: {
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: c.isDark ? 0.35 : 0.18,
              shadowRadius: 8,
            },
            android: { elevation: 6 },
          }),
        },
      ]}
    >
      <Ionicons name="add" size={30} color={c.white} accessibilityIgnoresInvertColors />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    width: TRACKER_THUMB_FAB_SIZE,
    height: TRACKER_THUMB_FAB_SIZE,
    borderRadius: TRACKER_THUMB_FAB_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 21,
  },
});
