import { FLARE_CHROME_LUCIDE, FlareLucideIcon } from "../lib/flareLucideIcons";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import React, { useCallback, useLayoutEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { showFlareAlert } from "../components/FlareAlertHost";
import { ScrollView } from "../lib/scrollViews";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ConfirmModal } from "../components/ConfirmModal";
import {
  LogDetailAddedHeader,
  LogDetailFieldGroup,
  LogDetailNotesCard,
  LogDetailSectionCard,
  logDetailStyles,
} from "../components/LogDetailLayout";
import { invalidateDashboardSnapshot } from "../lib/dashboardSnapshotCache";
import { formatAddedAtHeader } from "../lib/logDisplay";
import { recordRecentActivityEvent } from "../lib/recentActivityEvents";
import { formatUkDate } from "../lib/formatUkDate";
import { FLARE_FONT_FAMILY, FLARE_FONT_SIZE } from "../lib/layoutConstants";
import {
  formatWellbeingScaleDisplay,
  formatWellbeingYesNoDisplay,
} from "../lib/wellbeingWizardShared";
import {
  invalidateWellbeingListCache,
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
      <FlareLucideIcon icon={FLARE_CHROME_LUCIDE.edit} size={22} color={c.textMuted} />
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
      <FlareLucideIcon icon={FLARE_CHROME_LUCIDE.delete} size={22} color={c.textMuted} />
    </Pressable>
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
      <View style={[styles.centered, { backgroundColor: c.screen, paddingBottom: bottomPad }]}>
        <ActivityIndicator color={c.primary} />
        <Text style={[styles.muted, { color: c.textMuted }]}>Loading…</Text>
      </View>
    );
  }

  if (!row) {
    return (
      <ScrollView style={[logDetailStyles.scroll, { backgroundColor: c.screen }]} contentContainerStyle={{ paddingBottom: bottomPad }}>
        <Text style={[styles.muted, { color: c.textMuted }]}>Could not load this entry.</Text>
      </ScrollView>
    );
  }

  const feelingsFields = [
    { label: "Date", value: formatUkDate(row.date) || "Not set" },
    { label: "Mood", value: formatWellbeingScaleDisplay(asScale(row.mood)) },
    { label: "Energy", value: formatWellbeingScaleDisplay(asScale(row.energy)) },
    { label: "Sleep quality", value: formatWellbeingScaleDisplay(asScale(row.sleep_quality)) },
    { label: "Anxiety", value: formatWellbeingScaleDisplay(asScale(row.anxiety)) },
    { label: "Pain / discomfort", value: formatWellbeingScaleDisplay(asScale(row.pain)) },
    { label: "IBD impact", value: formatWellbeingScaleDisplay(asScale(row.ibd_impact)) },
    { label: "Brain fog", value: formatWellbeingScaleDisplay(asScale(row.brain_fog)) },
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
      <ScrollView
        style={[logDetailStyles.scroll, { backgroundColor: c.screen }]}
        contentContainerStyle={{ paddingBottom: bottomPad }}
        showsVerticalScrollIndicator={false}
      >
        <LogDetailAddedHeader text={formatAddedAtHeader(row.created_at)} />

        <LogDetailSectionCard title="Feelings">
          <LogDetailFieldGroup fields={feelingsFields} />
        </LogDetailSectionCard>

        <LogDetailSectionCard title="Activities">
          <LogDetailFieldGroup fields={activityFields} />
        </LogDetailSectionCard>

        {row.notes?.trim() ? <LogDetailNotesCard notes={row.notes.trim()} /> : null}
      </ScrollView>

      <ConfirmModal
        visible={deleteOpen}
        title="Delete wellbeing entry?"
        message="This action cannot be undone."
        confirmLabel={deleting ? "Deleting…" : "Delete"}
        confirmDestructive
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeleteOpen(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  muted: { fontSize: FLARE_FONT_SIZE.body, fontFamily: FLARE_FONT_FAMILY.regular },
  headerActions: { flexDirection: "row", alignItems: "center" },
  headerIconBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
});
