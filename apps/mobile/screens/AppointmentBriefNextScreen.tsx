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
import { reminderLabelFromMinutes } from "../lib/appointmentShared";
import { formatUkDate } from "../lib/formatUkDate";
import { useAppointmentBrief } from "../lib/useAppointmentBrief";
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

  const apt = brief.nextAppointment;

  return (
    <View style={[styles.screen, { backgroundColor: c.screen }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPad }]}
        showsVerticalScrollIndicator={false}
      >
        <SectionLabel text="Next Appointment" />
        {apt ? (
          <Card>
            <View style={styles.fieldList}>
              <View style={styles.fieldRow}>
                <Text style={[styles.fieldLabel, { color: c.text, fontFamily: TYPOGRAPHY.fontFamily.regular }]}>Date</Text>
                <Text style={[styles.fieldValue, { color: c.textSecondary, fontFamily: TYPOGRAPHY.fontFamily.regular }]}>
                  {formatUkDate(apt.date) || "Not set"}
                </Text>
              </View>
              <View style={styles.fieldRow}>
                <Text style={[styles.fieldLabel, { color: c.text, fontFamily: TYPOGRAPHY.fontFamily.regular }]}>Time</Text>
                <Text style={[styles.fieldValue, { color: c.textSecondary, fontFamily: TYPOGRAPHY.fontFamily.regular }]}>
                  {apt.time?.trim() || "Not set"}
                </Text>
              </View>
              <View style={styles.fieldRow}>
                <Text style={[styles.fieldLabel, { color: c.text, fontFamily: TYPOGRAPHY.fontFamily.regular }]}>Type</Text>
                <Text style={[styles.fieldValue, { color: c.textSecondary, fontFamily: TYPOGRAPHY.fontFamily.regular }]}>
                  {apt.type?.trim() || "Not set"}
                </Text>
              </View>
              <View style={styles.fieldRow}>
                <Text style={[styles.fieldLabel, { color: c.text, fontFamily: TYPOGRAPHY.fontFamily.regular }]}>Clinician</Text>
                <Text style={[styles.fieldValue, { color: c.textSecondary, fontFamily: TYPOGRAPHY.fontFamily.regular }]}>
                  {apt.clinician_name?.trim() || "Not set"}
                </Text>
              </View>
              <View style={styles.fieldRow}>
                <Text style={[styles.fieldLabel, { color: c.text, fontFamily: TYPOGRAPHY.fontFamily.regular }]}>Location</Text>
                <Text style={[styles.fieldValue, { color: c.textSecondary, fontFamily: TYPOGRAPHY.fontFamily.regular }]}>
                  {apt.location?.trim() || "Not set"}
                </Text>
              </View>
              <View style={styles.fieldRow}>
                <Text style={[styles.fieldLabel, { color: c.text, fontFamily: TYPOGRAPHY.fontFamily.regular }]}>Reminder</Text>
                <Text style={[styles.fieldValue, { color: c.textSecondary, fontFamily: TYPOGRAPHY.fontFamily.regular }]}>
                  {reminderLabelFromMinutes(apt.reminder_minutes_before)}
                </Text>
              </View>
            </View>
          </Card>
        ) : (
          <Card>
            <Text style={[styles.noDataText, { color: c.textSecondary, fontFamily: TYPOGRAPHY.fontFamily.regular }]}>
              No upcoming appointment found.
            </Text>
          </Card>
        )}
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
    alignItems: "center",
  },
  fieldLabel: {
    fontSize: TYPOGRAPHY.fontSize.md,
  },
  fieldValue: {
    fontSize: TYPOGRAPHY.fontSize.md,
  },
  noDataText: {
    fontSize: TYPOGRAPHY.fontSize.md,
  },
});
