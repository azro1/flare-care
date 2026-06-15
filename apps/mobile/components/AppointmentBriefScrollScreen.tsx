import React from "react";
import { StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import { ScrollView } from "../lib/scrollViews";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LogHistoryTipRow } from "./LogHistoryList";
import { SCREEN_EDGE_PADDING } from "../lib/layoutConstants";
import { useFlareColors } from "../theme";

/** Card-first scroll + bulb tip directly below — same order as Bowel / My Meds. */
export function AppointmentBriefScrollScreen({
  tip,
  afterTip,
  children,
  contentStyle,
}: {
  tip?: string;
  children: React.ReactNode;
  afterTip?: React.ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
}) {
  const c = useFlareColors();
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, 16) + 24;

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: c.screen }]}
      contentContainerStyle={[{ paddingBottom: bottomPad }, contentStyle]}
      showsVerticalScrollIndicator={false}
    >
      {children}
      {tip ? <LogHistoryTipRow text={tip} /> : null}
      {afterTip}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: SCREEN_EDGE_PADDING },
});
