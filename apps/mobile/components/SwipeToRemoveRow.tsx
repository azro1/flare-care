import React, { useRef } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { useFlareColors } from "../theme";

type Props = {
  /** When false, children render normally (e.g. only one row left). */
  enabled: boolean;
  onRemove: () => void;
  children: React.ReactNode;
};

/**
 * Swipe left to reveal Remove. Tap Remove to delete — avoids accidental wipes in wizards.
 */
export function SwipeToRemoveRow({ enabled, onRemove, children }: Props) {
  const c = useFlareColors();
  const ref = useRef<Swipeable>(null);

  if (!enabled) {
    return <View>{children}</View>;
  }

  return (
    <Swipeable
      ref={ref}
      overshootRight={false}
      friction={2}
      rightThreshold={40}
      renderRightActions={() => (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Remove"
          onPress={() => {
            ref.current?.close();
            onRemove();
          }}
          style={[styles.action, { backgroundColor: c.destructiveFill }]}
        >
          <Text style={[styles.actionLabel, { color: c.white }]}>Remove</Text>
        </Pressable>
      )}
    >
      <View style={{ backgroundColor: c.screen }}>{children}</View>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  action: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 18,
  },
  actionLabel: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
});
