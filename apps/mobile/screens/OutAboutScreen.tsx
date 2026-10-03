/**
 * Out & About — umbrella for everyday leaving-the-house helpers.
 * Going Out (prep) + Find a Toilet (in-the-moment).
 */
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ScrollView } from "../lib/scrollViews";
import { useNavigation } from "@react-navigation/native";
import { Card } from "../components/MidnightLagoonCard";
import { TrayRow } from "../components/MidnightLagoonTray";
import { ScreenHeader } from "../components/MidnightLagoonScreenHeader";
import { FlareLucideIcon } from "../lib/flareLucideIcons";
import { FIND_TOILET_ICON } from "../lib/findToiletShared";
import { GOING_OUT_ICON } from "../lib/goingOutShared";
import { SPACING, TYPOGRAPHY } from "../designTokens";
import {
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
    <View style={[styles.screen, { backgroundColor: c.screen }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: bottomScrollInset + 16 }]}
      >
        <ScreenHeader title="Out & About" />
        <Card noPadding style={{ paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md }}>
          <TrayRow
            icon={GOING_OUT_ICON}
            label="Going Out"
            value="Your prep checklist"
            showChevron
            onPress={() => navigation.navigate("GoingOut")}
          />
          <TrayRow
            icon={FIND_TOILET_ICON}
            label="Find a Toilet"
            value="Find a toilet near you"
            showChevron
            onPress={() => navigation.navigate("FindToilet")}
          />
        </Card>
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
