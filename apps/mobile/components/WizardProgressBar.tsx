import React from "react";
import { StyleSheet, View } from "react-native";
import { RADIUS, SPACING } from "../designTokens";
import { useFlareColors } from "../theme";

export function WizardProgressBar({
  current,
  total,
}: {
  current: number;
  total: number;
}) {
  const c = useFlareColors();
  const progress = Math.max(0, Math.min(1, current / total));

  return (
    <View style={[styles.track, { backgroundColor: c.inputBg }]}>
      <View
        style={[
          styles.fill,
          {
            backgroundColor: c.primary,
            width: `${progress * 100}%`,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 4,
    borderRadius: RADIUS.button,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: RADIUS.button,
  },
});
