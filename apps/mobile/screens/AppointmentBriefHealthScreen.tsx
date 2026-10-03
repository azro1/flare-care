import { useRoute } from "@react-navigation/native";
import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { ScrollView } from "../lib/scrollViews";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Card } from "../components/MidnightLagoonCard";
import { SectionLabel } from "../components/MidnightLagoonSectionLabel";
import { flareFieldErrorStyle } from "../components/FlareInput";
import { SPACING, TYPOGRAPHY } from "../designTokens";
import type { AppointmentBriefRouteParams } from "../lib/appointmentBriefShared";
import { useAppointmentBrief } from "../lib/useAppointmentBrief";
import { useFlareColors } from "../theme";

type SessionUser = { id: string };

function formatAvg(value: number | null, suffix = ""): string {
  if (value == null) return "N/A";
  return `${value.toFixed(1)}${suffix}`;
}

export function AppointmentBriefHealthScreen({ user }: { user: SessionUser }) {
  const c = useFlareColors();
  const insets = useSafeAreaInsets();
  const errTextStyle = flareFieldErrorStyle(c, "input");
  const route = useRoute<any>();
  const params = route.params as AppointmentBriefRouteParams;
  const { brief, loading, error } = useAppointmentBrief(user.id, params);
  const bottomPad = Math.max(insets.bottom, 16) + 24;

  if (loading) {
    return (
      <View style={[styles.screen, { backgroundColor: c.screen }]}>
        <View style={styles.centered}>
          <ActivityIndicator color={c.primary} />
        </View>
      </View>
    );
  }

  if (error || !brief) {
    return (
      <View style={[styles.screen, { backgroundColor: c.screen }]}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPad }]}
        >
          <Text style={errTextStyle}>{error || "Summary not available."}</Text>
        </ScrollView>
      </View>
    );
  }

  const symptomsLine = `${brief.symptoms.currentCount} logs, avg severity ${formatAvg(brief.symptoms.currentAverage, "/10")}${
    brief.symptoms.previousAverage != null ? ` (prev ${formatAvg(brief.symptoms.previousAverage, "/10")})` : ""
  }`;

  const bowelLine = `${brief.bowel.currentCount} logs (${brief.bowel.currentPerWeek}/week), avg Bristol ${formatAvg(brief.bowel.currentBristolAvg)}`;

  const weightLine =
    brief.weight.startWeight != null && brief.weight.endWeight != null
      ? `${brief.weight.startWeight} kg → ${brief.weight.endWeight} kg (${brief.weight.delta != null && brief.weight.delta >= 0 ? "+" : ""}${brief.weight.delta} kg)`
      : "Not enough logs in this period";

  const medsLine =
    brief.medications.missedCurrent === 0
      ? "No missed doses logged in this period"
      : `${brief.medications.missedCurrent} logged`;

  return (
    <View style={[styles.screen, { backgroundColor: c.screen }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPad }]}
        showsVerticalScrollIndicator={false}
      >
        <SectionLabel text="Health Data" />
        <Card>
          <View style={styles.fieldList}>
            <View style={styles.fieldRow}>
              <Text style={[styles.fieldLabel, { color: c.text, fontFamily: TYPOGRAPHY.fontFamily.regular }]}>Symptoms</Text>
              <Text style={[styles.fieldValue, { color: c.textSecondary, fontFamily: TYPOGRAPHY.fontFamily.regular }]}>
                {symptomsLine}
              </Text>
            </View>
            <View style={styles.fieldRow}>
              <Text style={[styles.fieldLabel, { color: c.text, fontFamily: TYPOGRAPHY.fontFamily.regular }]}>Bowel</Text>
              <Text style={[styles.fieldValue, { color: c.textSecondary, fontFamily: TYPOGRAPHY.fontFamily.regular }]}>
                {bowelLine}
              </Text>
            </View>
            <View style={styles.fieldRow}>
              <Text style={[styles.fieldLabel, { color: c.text, fontFamily: TYPOGRAPHY.fontFamily.regular }]}>Weight</Text>
              <Text style={[styles.fieldValue, { color: c.textSecondary, fontFamily: TYPOGRAPHY.fontFamily.regular }]}>
                {weightLine}
              </Text>
            </View>
            <View style={styles.fieldRow}>
              <Text style={[styles.fieldLabel, { color: c.text, fontFamily: TYPOGRAPHY.fontFamily.regular }]}>Missed doses</Text>
              <Text style={[styles.fieldValue, { color: c.textSecondary, fontFamily: TYPOGRAPHY.fontFamily.regular }]}>
                {medsLine}
              </Text>
            </View>
          </View>
        </Card>
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
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  fieldList: {
    gap: SPACING.md,
  },
  fieldRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: SPACING.md,
  },
  fieldLabel: {
    fontSize: TYPOGRAPHY.fontSize.md,
    flexShrink: 0,
  },
  fieldValue: {
    fontSize: TYPOGRAPHY.fontSize.md,
    textAlign: "right",
    flex: 1,
  },
});
