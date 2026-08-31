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
  LogDetailCard,
  LogDetailFieldGroup,
  logDetailStyles,
} from "../components/LogDetailLayout";
import { flareCardSectionStyles } from "../components/FlareScreenSectionTitle";
import { invalidateDashboardSnapshot } from "../lib/dashboardSnapshotCache";
import { formatAddedAtHeader } from "../lib/logDisplay";
import { formatUkDate } from "../lib/formatUkDate";
import { formatUkTimeFromOccurred, occurredAtToFormParts } from "../lib/bowelMovementShared";
import { FLARE_FONT_FAMILY, FLARE_FONT_SIZE } from "../lib/layoutConstants";
import {
  formatIntakeMl,
  intakeFormFromRow,
  intakeKindLabel,
  intakePayloadFromForm,
  invalidateIntakeListCache,
  quickIntakeFormState,
  type IntakeFormState,
  type IntakeRow,
} from "../lib/intakeShared";
import { supabase, TABLES } from "../lib/supabase";
import { useFlareColors } from "../theme";
import { IntakeLogSheet } from "./IntakeScreen";

type SessionUser = { id: string };

export type IntakeLogDetailParams = {
  id: string;
  kind?: string;
};

function DetailEditHeaderButton({ onPress, disabled }: { onPress: () => void; disabled?: boolean }) {
  const c = useFlareColors();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Edit entry" onPress={onPress} disabled={disabled} hitSlop={10} style={styles.headerIconBtn}>
      <FlareLucideIcon icon={FLARE_CHROME_LUCIDE.edit} size={22} color={c.textMuted} />
    </Pressable>
  );
}

function DetailDeleteHeaderButton({ onPress, disabled }: { onPress: () => void; disabled?: boolean }) {
  const c = useFlareColors();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Delete entry" onPress={onPress} disabled={disabled} hitSlop={10} style={styles.headerIconBtn}>
      <FlareLucideIcon icon={FLARE_CHROME_LUCIDE.delete} size={22} color={c.textMuted} />
    </Pressable>
  );
}

export function IntakeLogDetailScreen({ user }: { user: SessionUser }) {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const c = useFlareColors();
  const insets = useSafeAreaInsets();
  const id = String((route.params as IntakeLogDetailParams | undefined)?.id ?? "");
  const paramKind = String((route.params as IntakeLogDetailParams | undefined)?.kind ?? "");
  const intakeId = parseInt(id, 10);

  const [loading, setLoading] = useState(true);
  const [row, setRow] = useState<IntakeRow | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [form, setForm] = useState<IntakeFormState>(() => quickIntakeFormState());
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const deleteInFlight = useRef(false);

  const load = useCallback(async () => {
    if (!id || Number.isNaN(intakeId)) {
      setRow(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from(TABLES.TRACK_INTAKE)
      .select("*")
      .eq("user_id", user.id)
      .eq("id", intakeId)
      .maybeSingle();
    setRow(error || !data ? null : (data as IntakeRow));
    setLoading(false);
  }, [id, intakeId, user.id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const closeSheet = useCallback(() => {
    setSheetOpen(false);
    setSaveError("");
    setForm(quickIntakeFormState());
  }, []);

  const handleEdit = useCallback(() => {
    if (!row) return;
    setForm(intakeFormFromRow(row));
    setSaveError("");
    setSheetOpen(true);
  }, [row]);

  const handleSave = useCallback(
    async (values: IntakeFormState) => {
      if (!row) return;
      setSaveError("");
      setSaving(true);
      try {
        const payload = intakePayloadFromForm(values);
        const { error } = await supabase
          .from(TABLES.TRACK_INTAKE)
          .update(payload)
          .eq("id", row.id)
          .eq("user_id", user.id);
        if (error) throw error;
        closeSheet();
        invalidateDashboardSnapshot(user.id);
        invalidateIntakeListCache(user.id);
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
      const { error } = await supabase.from(TABLES.TRACK_INTAKE).delete().eq("id", row.id).eq("user_id", user.id);
      if (error) throw error;
      invalidateDashboardSnapshot(user.id);
      invalidateIntakeListCache(user.id);
      if (navigation.canGoBack()) navigation.goBack();
      else navigation.navigate("Intake");
    } catch (err: unknown) {
      showFlareAlert("Could not delete", err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setDeleting(false);
      deleteInFlight.current = false;
    }
  }, [navigation, row, user.id]);

  useLayoutEffect(() => {
    const headerTitle = intakeKindLabel(row?.kind ?? paramKind) || "Food & Drink";
    if (loading || !row) {
      navigation.setOptions({ headerTitle, headerRight: undefined });
      return;
    }
    navigation.setOptions({
      headerTitle,
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
  }, [deleting, handleEdit, loading, navigation, paramKind, row]);

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

  const { date } = occurredAtToFormParts(row.occurred_at);
  const amountLabel = formatIntakeMl(row.amount_ml);

  return (
    <>
      <ScrollView
        style={[logDetailStyles.scroll, { backgroundColor: c.screen }]}
        contentContainerStyle={{ paddingBottom: bottomPad }}
        showsVerticalScrollIndicator={false}
      >
        <LogDetailAddedHeader text={formatAddedAtHeader(row.created_at)} />

        <LogDetailCard style={flareCardSectionStyles.container}>
          <LogDetailFieldGroup
            fields={[
              { label: "Type", value: intakeKindLabel(row.kind) },
              { label: "Date", value: formatUkDate(date) || "Not set" },
              { label: "Time", value: formatUkTimeFromOccurred(row.occurred_at) || "Not set" },
              { label: "Item", value: row.body?.trim() || "Not set" },
              ...(amountLabel ? [{ label: "Amount", value: amountLabel }] : []),
              { label: "Notes", value: row.notes?.trim() || "Not set" },
            ]}
          />
        </LogDetailCard>
      </ScrollView>

      <ConfirmModal
        visible={deleteOpen}
        title="Delete entry"
        message="Are you sure you want to delete this entry? This action cannot be undone."
        confirmLabel={deleting ? "Deleting…" : "Delete"}
        confirmDestructive
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
      />

      <IntakeLogSheet
        visible={sheetOpen}
        editingId={row.id}
        initialValues={form}
        saving={saving}
        saveError={saveError}
        onClose={closeSheet}
        onSave={handleSave}
      />
    </>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  muted: { fontSize: FLARE_FONT_SIZE.body, fontFamily: FLARE_FONT_FAMILY.regular },
  headerEditDeleteRow: { flexDirection: "row", alignItems: "center" },
  headerIconBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
});
