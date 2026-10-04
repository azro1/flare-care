import React from "react";
import { View, StyleSheet, Pressable, Text } from "react-native";
import { ScrollView } from "../lib/scrollViews";
import { useNavigation } from "@react-navigation/native";
import { useFlareColors } from "../theme";
import { SPACING, TYPOGRAPHY } from "../designTokens";
import { Card } from "../components/MidnightLagoonCard";
import { ScreenHeader } from "../components/MidnightLagoonScreenHeader";
import { TileGrid } from "../components/MidnightLagoonTileGrid";
import { FLARE_FEATURE_LUCIDE } from "../lib/flareLucideIcons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type SessionUser = { id: string };

type TrackScreenProps = {
  user: SessionUser;
};

export function TrackScreen({ user: _user }: TrackScreenProps) {
  const navigation = useNavigation<any>();
  const colors = useFlareColors();
  const insets = useSafeAreaInsets();

  const logTiles = [
    { icon: FLARE_FEATURE_LUCIDE.symptoms, label: "Symptoms", onPress: () => navigation.navigate("SymptomLogWizard") },
    { icon: FLARE_FEATURE_LUCIDE.wellbeing, label: "Wellbeing", onPress: () => navigation.navigate("WellbeingWizard") },
    { icon: FLARE_FEATURE_LUCIDE.hydration, label: "Hydration", onPress: () => navigation.navigate("Hydration") },
    { icon: FLARE_FEATURE_LUCIDE.bowel, label: "Bowel", onPress: () => navigation.navigate("Bowel") },
    { icon: FLARE_FEATURE_LUCIDE.weight, label: "Weight", onPress: () => navigation.navigate("Weight") },
    { icon: FLARE_FEATURE_LUCIDE.output, label: "Fluid out", onPress: () => navigation.navigate("Output") },
    { icon: FLARE_FEATURE_LUCIDE.intake, label: "Food & drink", onPress: () => navigation.navigate("Intake") },
    { icon: FLARE_FEATURE_LUCIDE.meds, label: "Medications", onPress: () => navigation.navigate("MedicationTrackingWizard") },
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
        <ScreenHeader
          title="Track"
          rightAction={
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="History"
              onPress={() => navigation.navigate("History")}
              hitSlop={8}
              style={styles.historyButton}
            >
              <Text style={[styles.historyButtonText, { color: colors.primary, fontFamily: TYPOGRAPHY.fontFamily.semibold }]}>
                History
              </Text>
            </Pressable>
          }
        />

        <Card>
          <TileGrid tiles={logTiles} columns={3} plain />
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
    paddingTop: SPACING.lg,
  },
  historyButton: {
    paddingTop: SPACING.xs,
    marginRight: SPACING.lg,
  },
  historyButtonText: {
    fontSize: TYPOGRAPHY.fontSize.cardTitle,
  },
});
