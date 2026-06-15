import { useRoute } from "@react-navigation/native";
import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { ScrollView } from "../lib/scrollViews";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { flareFieldErrorStyle } from "../components/FlareInput";
import { LogDetailCard, LogDetailFieldGroup } from "../components/LogDetailLayout";
import { flareCardSectionStyles } from "../components/FlareScreenSectionTitle";
import type { AppointmentBriefRouteParams } from "../lib/appointmentBriefShared";
import { useAppointmentBrief } from "../lib/useAppointmentBrief";
import { SCREEN_EDGE_PADDING } from "../lib/layoutConstants";
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
      <View style={[styles.centered, { backgroundColor: c.screen }]}>
        <ActivityIndicator color={c.primary} />
      </View>
    );
  }

  if (error || !brief) {
    return (
      <View style={[styles.centered, { backgroundColor: c.screen, padding: SCREEN_EDGE_PADDING }]}>
        <Text style={errTextStyle}>{error || "Summary not available."}</Text>
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
    <ScrollView
      style={[styles.screen, { backgroundColor: c.screen }]}
      contentContainerStyle={{ paddingBottom: bottomPad }}
      showsVerticalScrollIndicator={false}
    >
      <LogDetailCard style={flareCardSectionStyles.container}>
        <LogDetailFieldGroup
          fields={[
            { label: "Symptoms", value: symptomsLine },
            { label: "Bowel", value: bowelLine },
            { label: "Weight", value: weightLine },
            { label: "Missed doses", value: medsLine },
          ]}
        />
      </LogDetailCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: SCREEN_EDGE_PADDING },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
});
