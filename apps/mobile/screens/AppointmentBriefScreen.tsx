import { useSafeAreaInsets } from "react-native-safe-area-context";
import React from "react";
import { StyleSheet, View } from "react-native";
import { ScrollView } from "../lib/scrollViews";
import { ScreenHeader } from "../components/MidnightLagoonScreenHeader";
import { SPACING } from "../designTokens";
import { AppointmentBriefContent } from "./AppointmentBriefContent";
import { useFlareColors } from "../theme";

type SessionUser = { id: string };

export function AppointmentBriefScreen({ user: _user }: { user: SessionUser }) {
  const c = useFlareColors();
  const insets = useSafeAreaInsets();
  const contentPaddingBottom = Math.max(insets.bottom, 16) + 24;

  return (
    <View style={[styles.screen, { backgroundColor: c.screen }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: contentPaddingBottom }]}
      >
        <ScreenHeader title="Appointment Summary" />
        <AppointmentBriefContent />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: SPACING.screen,
    paddingTop: SPACING.lg,
  },
});
