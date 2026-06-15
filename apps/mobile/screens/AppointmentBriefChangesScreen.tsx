import { useRoute } from "@react-navigation/native";
import React, { useMemo } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { ScrollView } from "../lib/scrollViews";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { flareFieldErrorStyle } from "../components/FlareInput";
import { LogHistoryCard, LogHistoryList } from "../components/LogHistoryList";
import type { AppointmentBriefRouteParams } from "../lib/appointmentBriefShared";
import { useAppointmentBrief } from "../lib/useAppointmentBrief";
import { SCREEN_EDGE_PADDING } from "../lib/layoutConstants";
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

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: c.screen }]}
      contentContainerStyle={{ paddingBottom: bottomPad }}
      showsVerticalScrollIndicator={false}
    >
      <LogHistoryCard>
        <LogHistoryList
          items={talkingPointItems}
          emptyMessage="No notable changes in this period."
          multilineTitle
          rowTextLayout="default"
        />
      </LogHistoryCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: SCREEN_EDGE_PADDING },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
});
