import { useRoute } from "@react-navigation/native";
import React, { useMemo } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { ScrollView } from "../lib/scrollViews";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Card } from "../components/MidnightLagoonCard";
import { TrayRow } from "../components/MidnightLagoonTray";
import { SectionLabel } from "../components/MidnightLagoonSectionLabel";
import { flareFieldErrorStyle } from "../components/FlareInput";
import { SPACING, TYPOGRAPHY } from "../designTokens";
import { FLARE_FEATURE_LUCIDE } from "../lib/flareLucideIcons";
import type { AppointmentBriefRouteParams } from "../lib/appointmentBriefShared";
import { useAppointmentBrief } from "../lib/useAppointmentBrief";
import { useFlareColors } from "../theme";

type SessionUser = { id: string };

export function AppointmentBriefChangesScreen({ user }: { user: SessionUser }) {
  const c = useFlareColors();
  const insets = useSafeAreaInsets();
  const errTextStyle = flareFieldErrorStyle(c, "input");
  const route = useRoute<any>();
  const params = route.params as AppointmentBriefRouteParams;
  const { brief, loading, error } = useAppointmentBrief(user.id, params);
  const bottomPad = Math.max(insets.bottom, 16) + 24;

  const talkingPointItems = useMemo(
    () =>
      brief?.talkingPoints.map((point, index) => ({
        id: `point-${index}`,
        title: point,
        accessibilityLabel: point,
      })) ?? [],
    [brief?.talkingPoints],
  );

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

  return (
    <View style={[styles.screen, { backgroundColor: c.screen }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPad }]}
        showsVerticalScrollIndicator={false}
      >
        <SectionLabel text="Notable Changes" />
        {talkingPointItems.length === 0 ? (
          <Card>
            <Text style={[styles.emptyText, { color: c.textSecondary, fontFamily: TYPOGRAPHY.fontFamily.regular }]}>
              No notable changes in this period.
            </Text>
          </Card>
        ) : (
          <Card noPadding style={{ paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md }}>
            {talkingPointItems.map((item, index) => (
              <View key={item.id} style={[styles.pointRow, index < talkingPointItems.length - 1 && styles.pointRowBorder, { borderBottomColor: c.cardBorder }]}>
                <Text style={[styles.pointText, { color: c.text, fontFamily: TYPOGRAPHY.fontFamily.regular }]}>
                  {item.title}
                </Text>
              </View>
            ))}
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
  emptyText: {
    fontSize: TYPOGRAPHY.fontSize.md,
  },
  pointRow: {
    paddingVertical: SPACING.md,
  },
  pointRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  pointText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    lineHeight: 22,
  },
});
