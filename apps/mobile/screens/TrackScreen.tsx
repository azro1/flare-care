import React, { useState } from "react";
import { View, StyleSheet, Modal, Pressable, Text, Platform } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { ScrollView } from "../lib/scrollViews";
import { useNavigation } from "@react-navigation/native";
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
  const [customRangeOpen, setCustomRangeOpen] = useState(false);
  const [customStartDate, setCustomStartDate] = useState(new Date());
  const [customEndDate, setCustomEndDate] = useState(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

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

        <SegmentedTabs tabs={timeTabs} activeValue={timePeriod} onChange={handleTabChange} />

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

      <Modal visible={customRangeOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleCancelCustomRange}>
        <View style={[styles.modalRoot, { backgroundColor: colors.screen }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.divider }]}>
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
                style={[styles.datePill, { backgroundColor: colors.card, borderColor: colors.border }]}
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
                style={[styles.datePill, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <FlareLucideIcon icon={FLARE_CHROME_LUCIDE.calendar} size={18} color={colors.textSecondary} />
                <Text style={[styles.datePillText, { color: colors.text, fontFamily: TYPOGRAPHY.fontFamily.regular }]}>
                  {formatDateShort(customEndDate)}
                </Text>
              </Pressable>
            </View>

            <View style={styles.modalActions}>
              <PrimaryButton label="Apply" onPress={handleApplyCustomRange} />
              <SecondaryButton label="Cancel" onPress={handleCancelCustomRange} />
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
  entriesPlaceholder: {
    height: 120,
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
    borderRadius: RADIUS.md,
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
