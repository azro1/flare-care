import React from "react";
import { StyleSheet, Text, View } from "react-native";
import {
  EMPTY_TRAY_PADDING,
  FLARE_FONT_FAMILY,
  FLARE_FONT_SIZE,
  FLARE_LINE_HEIGHT,
} from "../lib/layoutConstants";
import { useFlareColors } from "../theme";

/** Muted placeholder copy in a rounded `surfaceSubtle` tray — lists, cards, or any empty region. */
export function EmptyTrayMessage({ message }: { message: string }) {
  const c = useFlareColors();
  return (
    <View style={[styles.tray, { backgroundColor: c.surfaceSubtle }]}>
      <View style={styles.content}>
        <Text style={[styles.text, { color: c.textMuted }]}>{message}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tray: { borderRadius: 14, overflow: "hidden" },
  content: {
    paddingHorizontal: EMPTY_TRAY_PADDING,
    paddingVertical: EMPTY_TRAY_PADDING,
  },
  text: {
    fontSize: FLARE_FONT_SIZE.muted,
    fontFamily: FLARE_FONT_FAMILY.regular,
    lineHeight: FLARE_LINE_HEIGHT.muted,
  },
});
