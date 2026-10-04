import React, { useCallback, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScrollView } from "../lib/scrollViews";
import { InfoHintButton } from "../components/InfoHintButton";
import { Card } from "../components/MidnightLagoonCard";
import { SectionLabel } from "../components/MidnightLagoonSectionLabel";
import { TrayRow } from "../components/MidnightLagoonTray";
import { TrendsLoggingGraph } from "../components/TrendsLoggingGraph";
import { SPACING } from "../designTokens";
import {
  ACTIVITY_HINT_ACCESSIBILITY_LABEL,
  ACTIVITY_HINT_MESSAGE,
  ACTIVITY_HINT_TITLE,
} from "../lib/trendsLoggingShared";
import { FLARE_FEATURE_LUCIDE } from "../lib/flareLucideIcons";
import { supabase, TABLES } from "../lib/supabase";
import { useFlareColors } from "../theme";

type SessionUser = { id: string };

type HistoryCounts = {
  symptom: number | null;
  medication: number | null;
  wellbeing: number | null;
};

/** "No entries" / "1 entry" / "12 entries" — matches the Logs browse rows in the old app. */
function entryCountLabel(count: number | null): string {
  if (count === null) return "";
  if (count === 0) return "No entries";
  if (count === 1) return "1 entry";
  return `${count} entries`;
}

async function countRows(table: string, userId: string): Promise<number | null> {
  const { count, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  return error ? null : count ?? 0;
}

export function HistoryScreen({ user }: { user: SessionUser }) {
  const navigation = useNavigation<any>();
  const colors = useFlareColors();
  const insets = useSafeAreaInsets();
  const [focused, setFocused] = useState(true);
  const [counts, setCounts] = useState<HistoryCounts>({ symptom: null, medication: null, wellbeing: null });

  const load = useCallback(async () => {
    const [symptom, medication, wellbeing] = await Promise.all([
      countRows(TABLES.LOG_SYMPTOMS, user.id),
      countRows(TABLES.LOG_MEDICATIONS, user.id),
      countRows(TABLES.DAILY_WELLBEING, user.id),
    ]);
    setCounts({ symptom, medication, wellbeing });
  }, [user.id]);

  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      void load();
      return () => setFocused(false);
    }, [load]),
  );

  const rows = [
    {
      id: "symptom",
      label: "Symptoms",
      icon: FLARE_FEATURE_LUCIDE.symptoms,
      route: "SymptomHistory",
      count: counts.symptom,
    },
    {
      id: "medication",
      label: "Medications",
      icon: FLARE_FEATURE_LUCIDE.meds,
      route: "MedicationTrackingHistory",
      count: counts.medication,
    },
    {
      id: "wellbeing",
      label: "Wellbeing",
      icon: FLARE_FEATURE_LUCIDE.wellbeing,
      route: "Wellbeing",
      count: counts.wellbeing,
    },
  ];

  return (
    <View style={[styles.screen, { backgroundColor: colors.screen }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
      >
        <Card noPadding style={styles.listCard}>
          {rows.map((row) => (
            <TrayRow
              key={row.id}
              icon={row.icon}
              label={row.label}
              value={entryCountLabel(row.count)}
              showChevron
              onPress={() => navigation.navigate(row.route)}
            />
          ))}
        </Card>
        <View style={styles.activityHeading}>
          <SectionLabel style={styles.activityLabel}>Your activity</SectionLabel>
          <InfoHintButton
            title={ACTIVITY_HINT_TITLE}
            message={ACTIVITY_HINT_MESSAGE}
            accessibilityLabel={ACTIVITY_HINT_ACCESSIBILITY_LABEL}
          />
        </View>
        <Card>
          <TrendsLoggingGraph userId={user.id} active={focused} />
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
  listCard: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  activityHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
    marginHorizontal: 2,
  },
  activityLabel: {
    marginTop: 0,
    marginBottom: 0,
    marginHorizontal: 0,
    flex: 1,
  },
});
