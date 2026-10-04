import { FLARE_CHROME_LUCIDE, FlareLucideIcon } from "../lib/flareLucideIcons";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import React, { useCallback, useLayoutEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { showFlareAlert } from "../components/FlareAlertHost";
import { ScrollView } from "../lib/scrollViews";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Card } from "../components/MidnightLagoonCard";
import { SectionLabel } from "../components/MidnightLagoonSectionLabel";
import { ConfirmModal } from "../components/ConfirmModal";
import { invalidateDashboardSnapshot } from "../lib/dashboardSnapshotCache";
import { formatAddedAtHeader } from "../lib/logDisplay";
import { recordRecentActivityEvent } from "../lib/recentActivityEvents";
import { HEADER_ACTION_BTN_WIDTH, HEADER_CHROME_ICON_SIZE } from "../lib/layoutConstants";
import { SPACING, TYPOGRAPHY } from "../designTokens";
import { formatWellbeingYesNoDisplay } from "../lib/wellbeingWizardShared";
import {
  invalidateWellbeingListCache,
  labelForWellbeingScale,
  SCALE_OPTIONS_ANXIETY,
  SCALE_OPTIONS_BRAIN_FOG,
  SCALE_OPTIONS_ENERGY,
  SCALE_OPTIONS_IBD,
  SCALE_OPTIONS_MOOD,
  SCALE_OPTIONS_PAIN,
  SCALE_OPTIONS_SLEEP,
  type WellbeingRow,
  type WellbeingScale,
} from "../lib/wellbeingShared";
import { supabase, TABLES } from "../lib/supabase";
import { useFlareColors } from "../theme";

type SessionUser = { id: string };

export type WellbeingLogDetailParams = {
  id: string;
};

function DetailEditHeaderButton({ onPress, disabled }: { onPress: () => void; disabled?: boolean }) {
  const c = useFlareColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Edit entry"
      onPress={onPress}
      disabled={disabled}
      hitSlop={10}
      style={styles.headerIconBtn}
    >
      <FlareLucideIcon icon={FLARE_CHROME_LUCIDE.edit} size={HEADER_CHROME_ICON_SIZE} color={c.text} />
    </Pressable>
  );
}

function DetailDeleteHeaderButton({ onPress, disabled }: { onPress: () => void; disabled?: boolean }) {
  const c = useFlareColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Delete entry"
      onPress={onPress}
      disabled={disabled}
      hitSlop={10}
      style={styles.headerIconBtn}
    >
      <FlareLucideIcon icon={FLARE_CHROME_LUCIDE.delete} size={HEADER_CHROME_ICON_SIZE} color={c.text} />
    </Pressable>
  );
}

function DetailSection({ title, fields }: { title: string; fields: { label: string; value: string }[] }) {
  const c = useFlareColors();
  return (
    <Card>
      <SectionLabel style={styles.inCardLabel}>{title}</SectionLabel>
      {fields.map((field, i) => (
        <View key={field.label} style={[styles.fieldRow, i > 0 && styles.fieldRowGap]}>
          <Text style={[styles.fieldLabel, { color: c.textSecondary, fontFamily: TYPOGRAPHY.fontFamily.regular }]}>
            {field.label}
          </Text>
          <Text style={[styles.fieldValue, { color: c.text, fontFamily: TYPOGRAPHY.fontFamily.medium }]}>
            {field.value}
          </Text>
        </View>
      ))}
    </Card>
  );
}

function asScale(value: number | null): WellbeingScale | null {
  return value != null && value >= 1 && value <= 5 ? (value as WellbeingScale) : null;
}

export function WellbeingLogDetailScreen({ user }: { user: SessionUser }) {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const c = useFlareColors();
  const insets = useSafeAreaInsets();
  const id = String((route.params as WellbeingLogDetailParams | undefined)?.id ?? "");
  const wellbeingId = parseInt(id, 10);

  const [loading, setLoading] = useState(true);
  const [row, setRow] = useState<WellbeingRow | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const deleteInFlight = useRef(false);

  const load = useCallback(async () => {
    if (!id || Number.isNaN(wellbeingId)) {
      setRow(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from(TABLES.DAILY_WELLBEING)
      .select("*")
      .eq("user_id", user.id)
      .eq("id", wellbeingId)
      .maybeSingle();
    setRow(error || !data ? null : (data as WellbeingRow));
    setLoading(false);
  }, [id, user.id, wellbeingId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const handleEdit = useCallback(() => {
    if (!row) return;
    navigation.navigate("WellbeingWizard", { editId: String(row.id) });
  }, [navigation, row]);

  const handleDelete = useCallback(async () => {
    if (!row || deleteInFlight.current) return;
    deleteInFlight.current = true;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from(TABLES.DAILY_WELLBEING)
        .delete()
        .eq("id", row.id)
        .eq("user_id", user.id);
      if (error) throw error;
      await recordRecentActivityEvent(user.id, "wellbeing-deleted");
      invalidateDashboardSnapshot(user.id);
      invalidateWellbeingListCache(user.id);
      navigation.goBack();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Could not delete this entry.";
      showFlareAlert("Could not delete", message);
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
      deleteInFlight.current = false;
    }
  }, [navigation, row, user.id]);

  useLayoutEffect(() => {
    if (loading || !row) {
      navigation.setOptions({ headerRight: undefined });
      return;
    }
    navigation.setOptions({
      headerRight: () => (
        <View style={styles.headerActions}>
          <DetailEditHeaderButton onPress={handleEdit} disabled={deleting} />
          <DetailDeleteHeaderButton onPress={() => setDeleteOpen(true)} disabled={deleting} />
        </View>
      ),
    });
    return () => {
      navigation.setOptions({ headerRight: undefined });
    };
  }, [deleting, handleEdit, loading, navigation, row]);

  const bottomPad = Math.max(insets.bottom, 16) + 24;

  if (loading) {
    return (
      <View style={[styles.screen, { backgroundColor: c.screen }]}>
        <View style={styles.centered}>
          <ActivityIndicator color={c.primary} />
          <Text style={[styles.mutedText, { color: c.textMuted, fontFamily: TYPOGRAPHY.fontFamily.regular }]}>
            Loading…
          </Text>
        </View>
      </View>
    );
  }

  if (!row) {
    return (
      <View style={[styles.screen, { backgroundColor: c.screen }]}>
        <ScrollView style={styles.scroll} contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPad }]}>
          <Text style={[styles.mutedText, { color: c.textSecondary, fontFamily: TYPOGRAPHY.fontFamily.regular }]}>
            Could not load this entry.
          </Text>
        </ScrollView>
      </View>
    );
  }

  const feelingsFields = [
    { label: "Mood", value: labelForWellbeingScale(SCALE_OPTIONS_MOOD, asScale(row.mood)) },
    { label: "Energy", value: labelForWellbeingScale(SCALE_OPTIONS_ENERGY, asScale(row.energy)) },
    { label: "Sleep quality", value: labelForWellbeingScale(SCALE_OPTIONS_SLEEP, asScale(row.sleep_quality)) },
    { label: "Anxiety", value: labelForWellbeingScale(SCALE_OPTIONS_ANXIETY, asScale(row.anxiety)) },
  ];

  const ibdFields = [
    { label: "Pain / discomfort", value: labelForWellbeingScale(SCALE_OPTIONS_PAIN, asScale(row.pain)) },
    { label: "IBD impact", value: labelForWellbeingScale(SCALE_OPTIONS_IBD, asScale(row.ibd_impact)) },
    { label: "Brain fog", value: labelForWellbeingScale(SCALE_OPTIONS_BRAIN_FOG, asScale(row.brain_fog)) },
  ];

  const activityFields = [
    {
      label: "Exercised",
      value: formatWellbeingYesNoDisplay(row.exercised, row.exercise_minutes),
    },
    { label: "Social interaction", value: formatWellbeingYesNoDisplay(row.social_connection) },
    { label: "Time outdoors", value: formatWellbeingYesNoDisplay(row.time_outdoors) },
  ];

  return (
    <>
      <View style={[styles.screen, { backgroundColor: c.screen }]}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPad }]}
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.addedHeader, { color: c.textSecondary, fontFamily: TYPOGRAPHY.fontFamily.regular }]}>
            {formatAddedAtHeader(row.created_at)}
          </Text>

          <DetailSection title="Feelings" fields={feelingsFields} />
          <DetailSection title="IBD" fields={ibdFields} />
          <DetailSection title="Activities" fields={activityFields} />

          {row.notes?.trim() ? (
            <Card>
              <SectionLabel style={styles.inCardLabel}>Notes</SectionLabel>
              <Text style={[styles.notesText, { color: c.text, fontFamily: TYPOGRAPHY.fontFamily.regular }]}>
                {`\u201C${row.notes.trim()}\u201D`}
              </Text>
            </Card>
          ) : null}
        </ScrollView>
      </View>

      <ConfirmModal
        visible={deleteOpen}
        title="Delete wellbeing entry?"
        message="This action cannot be undone."
        confirmLabel={deleting ? "Deleting…" : "Delete"}
        confirmDanger
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeleteOpen(false)}
      />
    </>
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
    gap: SPACING.md,
  },
  mutedText: {
    fontSize: TYPOGRAPHY.fontSize.md,
  },
  addedHeader: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    marginBottom: SPACING.lg,
  },
  inCardLabel: {
    marginTop: 0,
    marginBottom: SPACING.md,
    marginHorizontal: 0,
    letterSpacing: 0.8,
  },
  fieldRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: SPACING.md,
  },
  fieldRowGap: {
    marginTop: SPACING.md,
  },
  fieldLabel: {
    fontSize: TYPOGRAPHY.fontSize.md,
    flex: 1,
  },
  fieldValue: {
    fontSize: TYPOGRAPHY.fontSize.md,
    textAlign: "right",
    flex: 1,
  },
  notesText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    lineHeight: 22,
    fontStyle: "italic",
  },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 2 },
  headerIconBtn: { width: HEADER_ACTION_BTN_WIDTH, height: 44, alignItems: "center", justifyContent: "center" },
});
