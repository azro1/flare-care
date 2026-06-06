import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import React, { useCallback, useLayoutEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ConfirmModal } from "../components/ConfirmModal";
import { PrimaryButton, SecondaryButton } from "../components/FlareButton";
import { LogDetailAddedHeader, LogDetailCard, LogDetailFieldGroup } from "../components/LogDetailLayout";
import { invalidateDashboardSnapshot } from "../lib/dashboardSnapshotCache";
import { formatAddedAtHeader } from "../lib/logDisplay";
import {
  deleteMedicationForUser,
  invalidateMedicationsListCache,
  emptyMedicationFormState,
  fetchTakenMedicationIdsForToday,
  formatMedicationReminderTime,
  medicationFormFromRow,
  normalizeFrequencyPreset,
  medicationUpdatePayloadFromForm,
  toggleMedicationTakenToday,
  type MedicationFormState,
  type MedicationRow,
} from "../lib/medicationShared";
import { rescheduleMedicationNotificationsForUser } from "../lib/medicationNotifications";
import { FLARE_FONT_FAMILY, FLARE_FONT_SIZE, SCREEN_EDGE_PADDING } from "../lib/layoutConstants";
import { supabase, TABLES } from "../lib/supabase";
import { useFlareColors } from "../theme";
import { MedicationSheet } from "./MedicationsScreen";

type SessionUser = { id: string };

export type MedicationDetailParams = {
  id: string;
};

function DetailEditHeaderButton({ onPress, disabled }: { onPress: () => void; disabled?: boolean }) {
  const c = useFlareColors();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Edit medication" onPress={onPress} disabled={disabled} hitSlop={10} style={styles.headerIconBtn}>
      <Ionicons name="create-outline" size={22} color={c.textMuted} accessibilityIgnoresInvertColors />
    </Pressable>
  );
}

function DetailDeleteHeaderButton({ onPress, disabled }: { onPress: () => void; disabled?: boolean }) {
  const c = useFlareColors();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Delete medication" onPress={onPress} disabled={disabled} hitSlop={10} style={styles.headerIconBtn}>
      <MaterialCommunityIcons name="trash-can-outline" size={22} color={c.textMuted} accessibilityIgnoresInvertColors />
    </Pressable>
  );
}

export function MedicationDetailScreen({ user }: { user: SessionUser }) {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const c = useFlareColors();
  const insets = useSafeAreaInsets();
  const id = String((route.params as MedicationDetailParams | undefined)?.id ?? "");
  const medId = parseInt(id, 10);

  const [loading, setLoading] = useState(true);
  const [row, setRow] = useState<MedicationRow | null>(null);
  const [takenToday, setTakenToday] = useState(false);
  const [takenBusy, setTakenBusy] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [form, setForm] = useState<MedicationFormState>(() => emptyMedicationFormState());
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const deleteInFlight = useRef(false);

  const load = useCallback(async () => {
    if (!id || Number.isNaN(medId)) {
      setRow(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const [{ data, error }, takenIds] = await Promise.all([
      supabase.from(TABLES.MEDICATIONS).select("*").eq("user_id", user.id).eq("id", medId).maybeSingle(),
      fetchTakenMedicationIdsForToday(user.id),
    ]);
    setRow(error || !data ? null : (data as MedicationRow));
    setTakenToday(takenIds.includes(String(medId)));
    setLoading(false);
  }, [id, medId, user.id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const closeSheet = useCallback(() => {
    setSheetOpen(false);
    setSaveError("");
  }, []);

  const handleEdit = useCallback(() => {
    if (!row) return;
    setForm(medicationFormFromRow(row));
    setSaveError("");
    setSheetOpen(true);
  }, [row]);

  const handleSave = useCallback(
    async (values: MedicationFormState) => {
      if (!row) return;
      setSaveError("");
      setSaving(true);
      try {
        const { error } = await supabase
          .from(TABLES.MEDICATIONS)
          .update(medicationUpdatePayloadFromForm(values))
          .eq("id", row.id)
          .eq("user_id", user.id);
        if (error) throw error;
        closeSheet();
        invalidateDashboardSnapshot(user.id);
        invalidateMedicationsListCache(user.id);
        await load();
        try {
          await rescheduleMedicationNotificationsForUser(user.id);
        } catch {
          // non-fatal
        }
      } catch (err: unknown) {
        setSaveError(err instanceof Error ? err.message : "Could not save this medication.");
      } finally {
        setSaving(false);
      }
    },
    [closeSheet, load, row, user.id],
  );

  const handleToggleTaken = useCallback(async () => {
    if (!row || takenBusy) return;
    const wasTaken = takenToday;
    setTakenToday(!wasTaken);
    setTakenBusy(true);
    try {
      await toggleMedicationTakenToday(user.id, row.id, wasTaken);
      invalidateDashboardSnapshot(user.id);
    } catch (err: unknown) {
      setTakenToday(wasTaken);
      Alert.alert("Could not update", err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setTakenBusy(false);
    }
  }, [row, takenBusy, takenToday, user.id]);

  const handleDelete = useCallback(async () => {
    if (deleteInFlight.current || !row) return;
    deleteInFlight.current = true;
    setDeleting(true);
    setDeleteOpen(false);
    try {
      await deleteMedicationForUser(user.id, row.id);
      invalidateDashboardSnapshot(user.id);
      invalidateMedicationsListCache(user.id);
      try {
        await rescheduleMedicationNotificationsForUser(user.id);
      } catch {
        // non-fatal
      }
      if (navigation.canGoBack()) navigation.goBack();
      else navigation.navigate("Meds");
    } catch (err: unknown) {
      Alert.alert("Could not delete", err instanceof Error ? err.message : "Something went wrong.");
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
        <View style={styles.headerBtnRow}>
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
      <ScrollView style={[styles.screen, { backgroundColor: c.screen }]} contentContainerStyle={{ paddingBottom: bottomPad }}>
        <Text style={[styles.muted, { color: c.textMuted }]}>Could not load this medication.</Text>
      </ScrollView>
    );
  }

  return (
    <>
      <ScrollView
        style={[styles.screen, { backgroundColor: c.screen }]}
        contentContainerStyle={{ paddingBottom: bottomPad }}
        showsVerticalScrollIndicator={false}
      >
        <LogDetailAddedHeader text={formatAddedAtHeader(row.created_at)} />

        <LogDetailCard>
          <LogDetailFieldGroup
            fields={[
              { label: "Medication", value: row.name },
              { label: "Dosage", value: row.dosage?.trim() || "Not set" },
              { label: "Frequency", value: normalizeFrequencyPreset(row.frequency) || "Not set" },
              { label: "Reminder time", value: formatMedicationReminderTime(row.time_of_day) },
              { label: "Notes", value: row.notes?.trim() || "Not set" },
            ]}
          />
        </LogDetailCard>

        <View style={styles.takenActions}>
          {takenToday ? (
            <PrimaryButton
              title="Taken today"
              onPress={handleToggleTaken}
              disabled={takenBusy}
              leftIcon={<Ionicons name="checkmark" size={18} color={c.white} accessibilityIgnoresInvertColors />}
            />
          ) : (
            <SecondaryButton
              title="Mark as taken today"
              onPress={handleToggleTaken}
              disabled={takenBusy}
              borderless
            />
          )}
        </View>
      </ScrollView>

      <ConfirmModal
        visible={deleteOpen}
        title="Delete medication"
        message="Are you sure you want to delete this medication? This cannot be undone."
        confirmLabel={deleting ? "Deleting…" : "Delete"}
        confirmDestructive
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
      />

      <MedicationSheet
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
  screen: { flex: 1, padding: SCREEN_EDGE_PADDING },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  muted: { fontSize: FLARE_FONT_SIZE.body, fontFamily: FLARE_FONT_FAMILY.regular },
  headerBtnRow: { flexDirection: "row", alignItems: "center" },
  headerIconBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  takenActions: { marginTop: 4 },
});
