import { useRoute } from "@react-navigation/native";
import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { ScrollView } from "../lib/scrollViews";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { flareFieldErrorStyle } from "../components/FlareInput";
import { LogDetailCard, LogDetailFieldGroup } from "../components/LogDetailLayout";
import { flareCardSectionStyles } from "../components/FlareScreenSectionTitle";
import type { AppointmentBriefRouteParams } from "../lib/appointmentBriefShared";
import { reminderLabelFromMinutes } from "../lib/appointmentShared";
import { formatUkDate } from "../lib/formatUkDate";
import { useAppointmentBrief } from "../lib/useAppointmentBrief";
import { SCREEN_EDGE_PADDING } from "../lib/layoutConstants";
import { useFlareColors } from "../theme";

type SessionUser = { id: string };

export function AppointmentBriefNextScreen({ user }: { user: SessionUser }) {
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

  const apt = brief.nextAppointment;

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: c.screen }]}
      contentContainerStyle={{ paddingBottom: bottomPad }}
      showsVerticalScrollIndicator={false}
    >
      <LogDetailCard style={flareCardSectionStyles.container}>
        {apt ? (
          <LogDetailFieldGroup
            fields={[
              { label: "Date", value: formatUkDate(apt.date) || "Not set" },
              { label: "Time", value: apt.time?.trim() || "Not set" },
              { label: "Type", value: apt.type?.trim() || "Not set" },
              { label: "Clinician", value: apt.clinician_name?.trim() || "Not set" },
              { label: "Location", value: apt.location?.trim() || "Not set" },
              { label: "Reminder", value: reminderLabelFromMinutes(apt.reminder_minutes_before) },
            ]}
          />
        ) : (
          <LogDetailFieldGroup fields={[{ label: "Next Appointment", value: "No upcoming appointment found." }]} />
        )}
      </LogDetailCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: SCREEN_EDGE_PADDING },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
});
