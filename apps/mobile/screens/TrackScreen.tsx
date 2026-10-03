import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import { ScrollView } from "../lib/scrollViews";
import { useNavigation } from "@react-navigation/native";
import { useFlareColors } from "../theme";
import { SPACING } from "../designTokens";
import { Card } from "../components/MidnightLagoonCard";
import { TrayRow } from "../components/MidnightLagoonTray";
import { ScreenHeader } from "../components/MidnightLagoonScreenHeader";
import { SectionLabel } from "../components/MidnightLagoonSectionLabel";
import { SegmentedTabs } from "../components/MidnightLagoonSegmentedTabs";
import { TileGrid } from "../components/MidnightLagoonTileGrid";
import { FLARE_FEATURE_LUCIDE } from "../lib/flareLucideIcons";
import type { SessionUser } from "../lib/supabase";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type TrackScreenProps = {
  user: SessionUser;
};

export function TrackScreen({ user }: TrackScreenProps) {
  const navigation = useNavigation<any>();
  const colors = useFlareColors();
  const insets = useSafeAreaInsets();

  const [timePeriod, setTimePeriod] = useState("2weeks");

  const timeTabs = [
    { label: "2 weeks", value: "2weeks" },
    { label: "4 weeks", value: "4weeks" },
    { label: "3 months", value: "3months" },
    { label: "Custom", value: "custom" },
  ];

  const logTiles = [
    { icon: FLARE_FEATURE_LUCIDE.symptoms, label: "Symptoms", onPress: () => navigation.navigate("SymptomLogWizard") },
    { icon: FLARE_FEATURE_LUCIDE.wellbeing, label: "Wellbeing", onPress: () => navigation.navigate("WellbeingWizard") },
    { icon: FLARE_FEATURE_LUCIDE.meds, label: "Meds", onPress: () => navigation.navigate("Meds") },
    { icon: FLARE_FEATURE_LUCIDE.hydration, label: "Hydration", onPress: () => navigation.navigate("Hydration") },
    { icon: FLARE_FEATURE_LUCIDE.bowel, label: "Bowel", onPress: () => navigation.navigate("Bowel") },
    { icon: FLARE_FEATURE_LUCIDE.weight, label: "Weight", onPress: () => navigation.navigate("Weight") },
    { icon: FLARE_FEATURE_LUCIDE.output, label: "Fluid out", onPress: () => navigation.navigate("Output") },
    { icon: FLARE_FEATURE_LUCIDE.intake, label: "Food & drink", onPress: () => navigation.navigate("Intake") },
    { icon: FLARE_FEATURE_LUCIDE.trackMeds, label: "Missed meds", onPress: () => navigation.navigate("MedicationTrackingWizard") },
  ];

  return (
    <View style={[styles.screen, { backgroundColor: colors.screen }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 100 },
        ]}
      >
        <ScreenHeader title="Track" />

        <SegmentedTabs tabs={timeTabs} activeValue={timePeriod} onChange={setTimePeriod} />

        <Card>
          <View style={styles.entriesPlaceholder}>
          </View>
        </Card>

        <SectionLabel>Log something</SectionLabel>

        <Card>
          <TileGrid tiles={logTiles} columns={3} />
        </Card>

        <SectionLabel>Recent</SectionLabel>

        <Card noPadding style={{ paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md }}>
          <TrayRow label="Symptoms · Mild" value="9:12 am" onPress={() => navigation.navigate("SymptomHistory")} />
          <TrayRow label="Bowel · Type 4" value="8:40 am" onPress={() => navigation.navigate("Bowel")} />
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.screen,
    paddingTop: 56,
  },
  entriesPlaceholder: {
    height: 120,
  },
});
