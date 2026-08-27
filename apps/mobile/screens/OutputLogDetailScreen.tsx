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
  formatOutputMl,
  invalidateOutputListCache,
  outputFormFromRow,
  outputKindLabel,
  outputPayloadFromForm,
  quickOutputFormState,
  type OutputFormState,
  type OutputRow,
} from "../lib/outputShared";
import { supabase, TABLES } from "../lib/supabase";
import { useFlareColors } from "../theme";
import { OutputLogSheet } from "./OutputScreen";

type SessionUser = { id: string };

export type OutputLogDetailParams = {
  id: string;
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

export function OutputLogDetailScreen({ user }: { user: SessionUser }) {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const c = useFlareColors();
  const insets = useSafeAreaInsets();
  const id = String((route.params as OutputLogDetailParams | undefined)?.id ?? "");
  const outputId = parseInt(id, 10);

  const [loading, setLoading] = useState(true);
  const [row, setRow] = useState<OutputRow | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [form, setForm] = useState<OutputFormState>(() => quickOutputFormState());
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const deleteInFlight = useRef(false);

  const load = useCallback(async () => {
    if (!id || Number.isNaN(outputId)) {
      setRow(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from(TABLES.TRACK_OUTPUT)
      .select("*")
      .eq("user_id", user.id)
      .eq("id", outputId)
      .maybeSingle();
    setRow(error || !data ? null : (data as OutputRow));
    setLoading(false);
  }, [id, outputId, user.id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const closeSheet = useCallback(() => {
    setSheetOpen(false);
    setSaveError("");
    setForm(quickOutputFormState());
  }, []);

  const handleEdit = useCallback(() => {
    if (!row) return;
    setForm(outputFormFromRow(row));
    setSaveError("");
    setSheetOpen(true);
  }, [row]);

  const handleSave = useCallback(
    async (values: OutputFormState) => {
      if (!row) return;
      setSaveError("");
      setSaving(true);
      try {
        const payload = outputPayloadFromForm(values);
        const { error } = await supabase
          .from(TABLES.TRACK_OUTPUT)
          .update(payload)
          .eq("id", row.id)
          .eq("user_id", user.id);
        if (error) throw error;
        closeSheet();
        invalidateDashboardSnapshot(user.id);
        invalidateOutputListCache(user.id);
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
      const { error } = await supabase.from(TABLES.TRACK_OUTPUT).delete().eq("id", row.id).eq("user_id", user.id);
      if (error) throw error;
      invalidateDashboardSnapshot(user.id);
      invalidateOutputListCache(user.id);
      if (navigation.canGoBack()) navigation.goBack();
      else navigation.navigate("Output");
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
              { label: "Type", value: outputKindLabel(row.kind) },
              { label: "Date", value: formatUkDate(date) || "Not set" },
              { label: "Time", value: formatUkTimeFromOccurred(row.occurred_at) || "Not set" },
              { label: "Amount", value: formatOutputMl(row.amount_ml) },
              { label: "Notes", value: row.notes?.trim() || "Not set" },
            ]}
          />
        </LogDetailCard>
      </ScrollView>

      <ConfirmModal
        visible={deleteOpen}
        title="Delete output entry"
        message="Are you sure you want to delete this entry? This action cannot be undone."
        confirmLabel={deleting ? "Deleting…" : "Delete"}
        confirmDestructive
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
      />

      <OutputLogSheet
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
