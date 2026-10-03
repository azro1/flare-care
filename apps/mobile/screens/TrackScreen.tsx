import React, { useState, useEffect, useCallback } from "react";
import { View, StyleSheet, Modal, Pressable, Text, Platform } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { ScrollView } from "../lib/scrollViews";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useFlareColors } from "../theme";
import { SPACING, TYPOGRAPHY, RADIUS } from "../designTokens";
import { Card } from "../components/MidnightLagoonCard";
import { TrayRow } from "../components/MidnightLagoonTray";
import { ScreenHeader } from "../components/MidnightLagoonScreenHeader";
import { SectionLabel } from "../components/MidnightLagoonSectionLabel";
import { SegmentedTabs } from "../components/MidnightLagoonSegmentedTabs";
import { TileGrid } from "../components/MidnightLagoonTileGrid";
import { PrimaryButton, SecondaryButton } from "../components/FlareButton";
import { FlareLucideIcon, FLARE_FEATURE_LUCIDE, FLARE_CHROME_LUCIDE } from "../lib/flareLucideIcons";
import { supabase, TABLES } from "../lib/supabase";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { formatUkDate } from "../lib/formatUkDate";

type SessionUser = { id: string };

type TrackScreenProps = {
  user: SessionUser;
};

type LogEntry = {
  id: string;
  type: string;
  label: string;
  time: string;
  timestamp: string;
};

type SummaryStats = {
  symptomsCount: number;
  bowelCount: number;
  hydrationTotal: number;
  medicationsCount: number;
};

function getDateRange(period: string, customStart?: Date, customEnd?: Date): { start: Date; end: Date } {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  let start: Date;

  switch (period) {
    case "2weeks":
      start = new Date(end);
      start.setDate(start.getDate() - 14);
      break;
    case "4weeks":
      start = new Date(end);
      start.setDate(start.getDate() - 28);
      break;
    case "3months":
      start = new Date(end);
      start.setMonth(start.getMonth() - 3);
      break;
    case "custom":
      if (customStart && customEnd) {
        start = new Date(customStart.getFullYear(), customStart.getMonth(), customStart.getDate(), 0, 0, 0);
        return {
          start,
          end: new Date(customEnd.getFullYear(), customEnd.getMonth(), customEnd.getDate(), 23, 59, 59),
        };
      }
      start = new Date(end);
      start.setDate(start.getDate() - 14);
      break;
    default:
      start = new Date(end);
      start.setDate(start.getDate() - 14);
  }

  return { start, end };
}

export function TrackScreen({ user }: TrackScreenProps) {
  const navigation = useNavigation<any>();
  const colors = useFlareColors();
  const insets = useSafeAreaInsets();

  const [timePeriod, setTimePeriod] = useState("2weeks");
  const [customRangeOpen, setCustomRangeOpen] = useState(false);
  const [customStartDate, setCustomStartDate] = useState(new Date());
  const [customEndDate, setCustomEndDate] = useState(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [recentLogs, setRecentLogs] = useState<LogEntry[]>([]);
  const [stats, setStats] = useState<SummaryStats>({
    symptomsCount: 0,
    bowelCount: 0,
    hydrationTotal: 0,
    medicationsCount: 0,
  });

  const loadTrackData = useCallback(async () => {
    try {
      const { start, end } = getDateRange(timePeriod, customStartDate, customEndDate);
      const startIso = start.toISOString();
      const endIso = end.toISOString();

      // Fetch summary stats
      const [symptomsRes, bowelRes, hydrationRes, medsRes] = await Promise.all([
        supabase
          .from(TABLES.LOG_SYMPTOMS)
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .gte("added_at", startIso)
          .lte("added_at", endIso),
        supabase
          .from(TABLES.BOWEL_MOVEMENTS)
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .gte("added_at", startIso)
          .lte("added_at", endIso),
        supabase
          .from(TABLES.DAILY_HYDRATION)
          .select("amount_ml")
          .eq("user_id", user.id)
          .gte("added_at", startIso)
          .lte("added_at", endIso),
        supabase
          .from(TABLES.LOG_MEDICATIONS)
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .gte("added_at", startIso)
          .lte("added_at", endIso),
      ]);

      const hydrationSum = (hydrationRes.data || []).reduce((sum, row) => sum + (row.amount_ml || 0), 0);

      setStats({
        symptomsCount: symptomsRes.count || 0,
        bowelCount: bowelRes.count || 0,
        hydrationTotal: hydrationSum,
        medicationsCount: medsRes.count || 0,
      });

      // Fetch recent logs (last 10)
      const recentEnd = new Date().toISOString();
      const recentStart = new Date();
      recentStart.setDate(recentStart.getDate() - 7);

      const [symptomsLogs, bowelLogs, hydrationLogs] = await Promise.all([
        supabase
          .from(TABLES.LOG_SYMPTOMS)
          .select("id, added_at, severity")
          .eq("user_id", user.id)
          .gte("added_at", recentStart.toISOString())
          .lte("added_at", recentEnd)
          .order("added_at", { ascending: false })
          .limit(5),
        supabase
          .from(TABLES.BOWEL_MOVEMENTS)
          .select("id, added_at, bristol_type")
          .eq("user_id", user.id)
          .gte("added_at", recentStart.toISOString())
          .lte("added_at", recentEnd)
          .order("added_at", { ascending: false })
          .limit(5),
        supabase
          .from(TABLES.DAILY_HYDRATION)
          .select("id, added_at, amount_ml")
          .eq("user_id", user.id)
          .gte("added_at", recentStart.toISOString())
          .lte("added_at", recentEnd)
          .order("added_at", { ascending: false })
          .limit(5),
      ]);

      const allLogs: LogEntry[] = [];

      (symptomsLogs.data || []).forEach((log) => {
        const time = new Date(log.added_at);
        allLogs.push({
          id: `symptom-${log.id}`,
          type: "symptom",
          label: `Symptoms · ${log.severity || "Mild"}`,
          time: time.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
          timestamp: log.added_at,
        });
      });

      (bowelLogs.data || []).forEach((log) => {
        const time = new Date(log.added_at);
        allLogs.push({
          id: `bowel-${log.id}`,
          type: "bowel",
          label: `Bowel · Type ${log.bristol_type || "4"}`,
          time: time.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
          timestamp: log.added_at,
        });
      });

      (hydrationLogs.data || []).forEach((log) => {
        const time = new Date(log.added_at);
        allLogs.push({
          id: `hydration-${log.id}`,
          type: "hydration",
          label: `Hydration · ${log.amount_ml || 0}ml`,
          time: time.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
          timestamp: log.added_at,
        });
      });

      allLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setRecentLogs(allLogs.slice(0, 10));
    } catch (error) {
      console.error("Failed to load track data:", error);
    }
  }, [timePeriod, customStartDate, customEndDate, user.id]);

  useEffect(() => {
    void loadTrackData();
  }, [loadTrackData]);

  useFocusEffect(
    useCallback(() => {
      void loadTrackData();
    }, [loadTrackData]),
  );

  const timeTabs = [
    { label: "2 weeks", value: "2weeks" },
    { label: "4 weeks", value: "4weeks" },
    { label: "3 months", value: "3months" },
    { label: "Custom", value: "custom" },
  ];

  const handleTabChange = (value: string) => {
    if (value === "custom") {
      setCustomRangeOpen(true);
      return;
    }
    setTimePeriod(value);
  };

  const handleApplyCustomRange = () => {
    const daysDiff = Math.ceil((customEndDate.getTime() - customStartDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff > 365) {
      return;
    }
    if (customStartDate > customEndDate) {
      return;
    }
    setTimePeriod("custom");
    setCustomRangeOpen(false);
    void loadTrackData();
  };

  const handleCancelCustomRange = () => {
    setCustomRangeOpen(false);
  };

  const formatDateShort = (date: Date) => {
    return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  };

  const logTiles = [
    { icon: FLARE_FEATURE_LUCIDE.symptoms, label: "Symptoms", onPress: () => navigation.navigate("SymptomLogWizard") },
    { icon: FLARE_FEATURE_LUCIDE.wellbeing, label: "Wellbeing", onPress: () => navigation.navigate("WellbeingWizard") },
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
        <SegmentedTabs tabs={timeTabs} activeValue={timePeriod} onChange={handleTabChange} />

        <Card>
          <SectionLabel style={{ marginTop: 0 }}>Summary</SectionLabel>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: colors.text, fontFamily: TYPOGRAPHY.fontFamily.bold }]}>
                {stats.symptomsCount}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary, fontFamily: TYPOGRAPHY.fontFamily.regular }]}>
                Symptoms
              </Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: colors.text, fontFamily: TYPOGRAPHY.fontFamily.bold }]}>
                {stats.bowelCount}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary, fontFamily: TYPOGRAPHY.fontFamily.regular }]}>
                Bowel
              </Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: colors.text, fontFamily: TYPOGRAPHY.fontFamily.bold }]}>
                {Math.round(stats.hydrationTotal / 1000)}L
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary, fontFamily: TYPOGRAPHY.fontFamily.regular }]}>
                Hydration
              </Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: colors.text, fontFamily: TYPOGRAPHY.fontFamily.bold }]}>
                {stats.medicationsCount}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary, fontFamily: TYPOGRAPHY.fontFamily.regular }]}>
                Medications
              </Text>
            </View>
          </View>
        </Card>

        <Card>
          <View style={styles.chartPlaceholder}>
            <FlareLucideIcon icon={FLARE_CHROME_LUCIDE.briefcase} size={32} color={colors.textMuted} />
            <Text style={[styles.chartText, { color: colors.textMuted, fontFamily: TYPOGRAPHY.fontFamily.regular }]}>
              Chart visualization
            </Text>
          </View>
        </Card>

        <SectionLabel>Log something</SectionLabel>

        <Card>
          <TileGrid tiles={logTiles} columns={3} />
        </Card>

        {recentLogs.length > 0 && (
          <>
            <SectionLabel>Recent</SectionLabel>
            <Card noPadding style={{ paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md }}>
              {recentLogs.map((log) => (
                <TrayRow
                  key={log.id}
                  label={log.label}
                  value={log.time}
                  onPress={() => {
                    if (log.type === "symptom") navigation.navigate("SymptomHistory");
                    else if (log.type === "bowel") navigation.navigate("Bowel");
                    else if (log.type === "hydration") navigation.navigate("Hydration");
                  }}
                />
              ))}
            </Card>
          </>
        )}
      </ScrollView>

      <Modal visible={customRangeOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleCancelCustomRange}>
        <View style={[styles.modalRoot, { backgroundColor: colors.screen }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.cardBorder }]}>
            <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={handleCancelCustomRange} style={styles.modalClose}>
              <FlareLucideIcon icon={FLARE_CHROME_LUCIDE.close} size={20} color={colors.textSecondary} />
            </Pressable>
            <Text style={[styles.modalTitle, { color: colors.text, fontFamily: TYPOGRAPHY.fontFamily.semibold }]}>Custom Date Range</Text>
            <View style={{ width: 44 }} />
          </View>

          <ScrollView style={styles.modalScroll}>
            <Text style={[styles.rangeHint, { color: colors.textSecondary, fontFamily: TYPOGRAPHY.fontFamily.regular }]}>
              Select a date range up to 1 year.
            </Text>

            <View style={styles.dateField}>
              <Text style={[styles.dateLabel, { color: colors.text, fontFamily: TYPOGRAPHY.fontFamily.medium }]}>Start date</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => setShowStartPicker(true)}
                style={[styles.datePill, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
              >
                <FlareLucideIcon icon={FLARE_CHROME_LUCIDE.calendar} size={18} color={colors.textSecondary} />
                <Text style={[styles.datePillText, { color: colors.text, fontFamily: TYPOGRAPHY.fontFamily.regular }]}>
                  {formatDateShort(customStartDate)}
                </Text>
              </Pressable>
            </View>

            <View style={styles.dateField}>
              <Text style={[styles.dateLabel, { color: colors.text, fontFamily: TYPOGRAPHY.fontFamily.medium }]}>End date</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => setShowEndPicker(true)}
                style={[styles.datePill, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
              >
                <FlareLucideIcon icon={FLARE_CHROME_LUCIDE.calendar} size={18} color={colors.textSecondary} />
                <Text style={[styles.datePillText, { color: colors.text, fontFamily: TYPOGRAPHY.fontFamily.regular }]}>
                  {formatDateShort(customEndDate)}
                </Text>
              </Pressable>
            </View>

            <View style={styles.modalActions}>
              <PrimaryButton title="Apply" onPress={handleApplyCustomRange} />
              <SecondaryButton title="Cancel" onPress={handleCancelCustomRange} />
            </View>
          </ScrollView>

          {showStartPicker && (
            <DateTimePicker
              value={customStartDate}
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={(event, selectedDate) => {
                setShowStartPicker(Platform.OS === "ios");
                if (selectedDate) setCustomStartDate(selectedDate);
              }}
            />
          )}

          {showEndPicker && (
            <DateTimePicker
              value={customEndDate}
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={(event, selectedDate) => {
                setShowEndPicker(Platform.OS === "ios");
                if (selectedDate) setCustomEndDate(selectedDate);
              }}
            />
          )}
        </View>
      </Modal>
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
  },
  historyButtonText: {
    fontSize: TYPOGRAPHY.fontSize.cardTitle,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.md,
    marginTop: SPACING.sm,
  },
  statCard: {
    flex: 1,
    minWidth: "45%",
    alignItems: "center",
    paddingVertical: SPACING.lg,
  },
  statValue: {
    fontSize: TYPOGRAPHY.fontSize.stat,
    marginBottom: SPACING.xs,
  },
  statLabel: {
    fontSize: TYPOGRAPHY.fontSize.sm,
  },
  chartPlaceholder: {
    height: 180,
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.sm,
  },
  chartText: {
    fontSize: TYPOGRAPHY.fontSize.md,
  },
  modalRoot: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
  },
  modalClose: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: {
    fontSize: TYPOGRAPHY.fontSize.cardTitle,
  },
  modalScroll: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
  },
  rangeHint: {
    fontSize: TYPOGRAPHY.fontSize.md,
    marginBottom: SPACING.lg,
  },
  dateField: {
    gap: SPACING.xs,
    marginBottom: SPACING.md,
  },
  dateLabel: {
    fontSize: TYPOGRAPHY.fontSize.md,
  },
  datePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    minHeight: 42,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.button,
    borderWidth: 1,
  },
  datePillText: {
    flex: 1,
    fontSize: TYPOGRAPHY.fontSize.md,
  },
  modalActions: {
    marginTop: SPACING.lg,
    gap: SPACING.md,
  },
});
