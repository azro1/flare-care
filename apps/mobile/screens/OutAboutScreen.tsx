/**
 * Out & About — umbrella for everyday leaving-the-house helpers.
 * v1: Going Out only; Find a Toilet / Travel / etc. can land here later.
 */
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { LogHistoryCard } from "../components/LogHistoryList";
import { FLARE_CHROME_LUCIDE, FlareLucideIcon } from "../lib/flareLucideIcons";
import { OUT_ABOUT_ICON } from "../lib/goingOutShared";
import {
  CARD_INNER_PADDING,
  FLARE_FONT_FAMILY,
  FLARE_FONT_SIZE,
  FLARE_LINE_HEIGHT,
  HOME_FEATURE_TILE_ICON_SIZE,
  NAV_ROW_CHEVRON_SIZE,
  SCREEN_EDGE_PADDING,
  bottomTabBarScrollInset,
} from "../lib/layoutConstants";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFlareColors } from "../theme";

export function OutAboutScreen() {
  const navigation = useNavigation<any>();
  const c = useFlareColors();
  const insets = useSafeAreaInsets();
  const bottomScrollInset = bottomTabBarScrollInset(insets.bottom);

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: c.screen }]}
      contentContainerStyle={[styles.content, { paddingBottom: bottomScrollInset + 16 }]}
    >
      <LogHistoryCard style={{ padding: CARD_INNER_PADDING + 2, gap: 0 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open Going Out"
          onPress={() => navigation.navigate("GoingOut")}
          style={styles.row}
        >
          <FlareLucideIcon icon={OUT_ABOUT_ICON} size={HOME_FEATURE_TILE_ICON_SIZE} color={c.primary} />
          <View style={styles.textCol}>
            <Text style={[styles.title, { color: c.text }]}>Going Out</Text>
            <Text style={[styles.hint, { color: c.textMuted }]}>
              Your prep checklist when you leave the house
            </Text>
          </View>
          <FlareLucideIcon icon={FLARE_CHROME_LUCIDE.forward} size={NAV_ROW_CHEVRON_SIZE} color={c.text} />
        </Pressable>
      </LogHistoryCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    paddingHorizontal: SCREEN_EDGE_PADDING,
    paddingTop: 8,
    gap: 16,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 10,
  },
  textCol: { flex: 1, gap: 4 },
  title: {
    fontSize: FLARE_FONT_SIZE.subhead,
    lineHeight: FLARE_LINE_HEIGHT.subhead,
    fontFamily: FLARE_FONT_FAMILY.bold,
  },
  hint: {
    fontSize: FLARE_FONT_SIZE.muted,
    lineHeight: FLARE_LINE_HEIGHT.muted,
    fontFamily: FLARE_FONT_FAMILY.regular,
  },
});
