import { FLARE_CHROME_LUCIDE, FlareLucideIcon } from "../lib/flareLucideIcons";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import React, { useCallback, useLayoutEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { showFlareAlert } from "../components/FlareAlertHost";
import { ScrollView } from "../lib/scrollViews";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ConfirmModal } from "../components/ConfirmModal";
import { Card } from "../components/MidnightLagoonCard";
import { SectionLabel } from "../components/MidnightLagoonSectionLabel";
import { invalidateDashboardSnapshot } from "../lib/dashboardSnapshotCache";
import { formatAddedAtHeader } from "../lib/logDisplay";
import { recordRecentActivityEvent } from "../lib/recentActivityEvents";
import { formatUkDate } from "../lib/formatUkDate";
import { SPACING, TYPOGRAPHY } from "../designTokens";
import { HEADER_ACTION_BTN_WIDTH, HEADER_CHROME_ICON_SIZE } from "../lib/layoutConstants";
import {
  formatWeightKg,
  invalidateWeightListCache,
  quickWeightFormState,
  weightFormFromRow,
  weightPayloadFromForm,
  type WeightFormState,
  type WeightRow,
} from "../lib/weightShared";
import { supabase, TABLES } from "../lib/supabase";
import { useFlareColors } from "../theme";
import { WeightLogSheet } from "./WeightScreen";

type SessionUser = { id: string };

export type WeightLogDetailParams = {
  id: string;
};

function DetailEditHeaderButton({ onPress, disabled }: { onPress: () => void; disabled?: boolean }) {
  const c = useFlareColors();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Edit entry" onPress={onPress} disabled={disabled} hitSlop={10} style={styles.headerIconBtn}>
      <FlareLucideIcon icon={FLARE_CHROME_LUCIDE.edit} size={HEADER_CHROME_ICON_SIZE} color={c.text} />
    </Pressable>
  );
}

function DetailDeleteHeaderButton({ onPress, disabled }: { onPress: () => void; disabled?: boolean }) {
  const c = useFlareColors();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Delete entry" onPress={onPress} disabled={disabled} hitSlop={10} style={styles.headerIconBtn}>
      <FlareLucideIcon icon={FLARE_CHROME_LUCIDE.delete} size={HEADER_CHROME_ICON_SIZE} color={c.text} />
    </Pressable>
  );
}

export function WeightLogDetailScreen({ user }: { user: SessionUser }) {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const c = useFlareColors();
  const insets = useSafeAreaInsets();
  const id = String((route.params as WeightLogDetailParams | undefined)?.id ?? "");
  const weightId = parseInt(id, 10);

  const [loading, setLoading] = useState(true);
  const [row, setRow] = useState<WeightRow | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [form, setForm] = useState<WeightFormState>(() => quickWeightFormState());
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const deleteInFlight = useRef(false);

  const load = useCallback(async () => {
    if (!id || Number.isNaN(weightId)) {
      setRow(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from(TABLES.TRACK_WEIGHT)
      .select("*")
      .eq("user_id", user.id)
      .eq("id", weightId)
      .maybeSingle();
    setRow(error || !data ? null : (data as WeightRow));
    setLoading(false);
  }, [id, user.id, weightId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const closeSheet = useCallback(() => {
    setSheetOpen(false);
    setSaveError("");
    setForm(quickWeightFormState());
  }, []);

  const handleEdit = useCallback(() => {
    if (!row) return;
    setForm(weightFormFromRow(row));
    setSaveError("");
    setSheetOpen(true);
  }, [row]);

  const handleSave = useCallback(
    async (values: WeightFormState) => {
      if (!row) return;
      setSaveError("");
      setSaving(true);
      try {
        const payload = weightPayloadFromForm(values);
        const { error } = await supabase
          .from(TABLES.TRACK_WEIGHT)
          .update(payload)
          .eq("id", row.id)
          .eq("user_id", user.id);
        if (error) throw error;
        await recordRecentActivityEvent(user.id, "weight-updated");
        closeSheet();
        invalidateDashboardSnapshot(user.id);
        invalidateWeightListCache(user.id);
        await load();
      } catch (err: unknown) {
        setSaveError(err instanceof Error ? err.message : "Could not save this entry.");
      } finally {
        setSaving(false);
      }
    },
    [closeSheet, load, row, user.id],
  );

  const handleDelete = useCallback(async () => {
    if (deleteInFlight.current || !row) return;
    deleteInFlight.current = true;
    setDeleting(true);
    setDeleteOpen(false);
    try {
      const { error } = await supabase.from(TABLES.TRACK_WEIGHT).delete().eq("id", row.id).eq("user_id", user.id);
      if (error) throw error;
      await recordRecentActivityEvent(user.id, "weight-deleted");
      invalidateDashboardSnapshot(user.id);
      invalidateWeightListCache(user.id);
      if (navigation.canGoBack()) navigation.goBack();
      else navigation.navigate("Weight");
    } catch (err: unknown) {
      showFlareAlert("Could not delete", err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setDeleting(false);
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
        <View style={styles.headerEditDeleteRow}>
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
  const notes = row?.notes?.trim() ?? "";

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: c.screen, paddingBottom: bottomPad }]}>
        <ActivityIndicator size="small" color={c.primary} />
        <Text style={[styles.mutedText, { color: c.textSecondary, fontFamily: TYPOGRAPHY.fontFamily.regular }]}>Loading…</Text>
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

  return (
    <>
      <View style={[styles.screen, { backgroundColor: c.screen }]}>
        <ScrollView style={styles.scroll} contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPad }]}>
          <Text style={[styles.addedHeader, { color: c.textSecondary, fontFamily: TYPOGRAPHY.fontFamily.regular }]}>
            {formatAddedAtHeader(row.created_at)}
          </Text>

          <Card>
            <View style={styles.fieldList}>
              <View style={styles.fieldRow}>
                <Text style={[styles.fieldLabel, { color: c.textSecondary, fontFamily: TYPOGRAPHY.fontFamily.regular }]}>Date</Text>
                <Text style={[styles.fieldValue, { color: c.text, fontFamily: TYPOGRAPHY.fontFamily.medium }]}>
                  {formatUkDate(row.date) || "Not set"}
                </Text>
              </View>
              <View style={styles.fieldRow}>
                <Text style={[styles.fieldLabel, { color: c.textSecondary, fontFamily: TYPOGRAPHY.fontFamily.regular }]}>Weight</Text>
                <Text style={[styles.fieldValue, { color: c.text, fontFamily: TYPOGRAPHY.fontFamily.medium }]}>
                  {formatWeightKg(row.value_kg)}
                </Text>
              </View>
            </View>
          </Card>

          {notes ? (
            <>
              <SectionLabel>Notes</SectionLabel>
              <Card>
                <Text style={[styles.notesText, { color: c.text, fontFamily: TYPOGRAPHY.fontFamily.regular }]}>
                  {notes}
                </Text>
              </Card>
            </>
          ) : null}
        </ScrollView>
      </View>

      <ConfirmModal
        visible={deleteOpen}
        title="Delete weight entry"
        message="Are you sure you want to delete this entry? This action cannot be undone."
        confirmLabel={deleting ? "Deleting…" : "Delete"}
        confirmDanger
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
      />

      <WeightLogSheet visible={sheetOpen} editingId={row.id} initialValues={form} saving={saving} saveError={saveError} onClose={closeSheet} onSave={handleSave} />
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
  notesText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    lineHeight: 22,
  },
  headerEditDeleteRow: { flexDirection: "row", alignItems: "center", gap: 2 },
  headerIconBtn: { width: HEADER_ACTION_BTN_WIDTH, height: 44, alignItems: "center", justifyContent: "center" },
});
