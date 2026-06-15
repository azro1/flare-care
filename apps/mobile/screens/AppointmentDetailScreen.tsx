import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import React, { useCallback, useLayoutEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { ScrollView } from "../lib/scrollViews";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ConfirmModal } from "../components/ConfirmModal";
import { LogDetailAddedHeader, LogDetailCard, LogDetailFieldGroup, logDetailStyles } from "../components/LogDetailLayout";
import { flareCardSectionStyles } from "../components/FlareScreenSectionTitle";
import { invalidateDashboardSnapshot } from "../lib/dashboardSnapshotCache";
import { formatAddedAtHeader } from "../lib/logDisplay";
import { formatUkDate } from "../lib/formatUkDate";
import { rescheduleAppointmentNotificationsForUser } from "../lib/medicationNotifications";
import { FLARE_FONT_FAMILY, FLARE_FONT_SIZE } from "../lib/layoutConstants";
import { invalidateAllAppointmentCaches } from "../lib/appointmentCaches";
import {
  appointmentFormFromRow,
  appointmentPayloadFromForm,
  quickAppointmentFormState,
  reminderLabelFromMinutes,
  type AppointmentFormState,
  type AppointmentRow,
} from "../lib/appointmentShared";
import { supabase, TABLES } from "../lib/supabase";
import { useFlareColors } from "../theme";
import { AppointmentSheet } from "./AppointmentsScreen";

type SessionUser = { id: string };

export type AppointmentDetailParams = {
  id: string;
};

function DetailEditHeaderButton({ onPress, disabled }: { onPress: () => void; disabled?: boolean }) {
  const c = useFlareColors();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Edit appointment" onPress={onPress} disabled={disabled} hitSlop={10} style={styles.headerIconBtn}>
      <Ionicons name="create-outline" size={22} color={c.textMuted} accessibilityIgnoresInvertColors />
    </Pressable>
  );
}

function DetailDeleteHeaderButton({ onPress, disabled }: { onPress: () => void; disabled?: boolean }) {
  const c = useFlareColors();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Delete appointment" onPress={onPress} disabled={disabled} hitSlop={10} style={styles.headerIconBtn}>
      <MaterialCommunityIcons name="trash-can-outline" size={22} color={c.textMuted} accessibilityIgnoresInvertColors />
    </Pressable>
  );
}

export function AppointmentDetailScreen({ user }: { user: SessionUser }) {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const c = useFlareColors();
  const insets = useSafeAreaInsets();
  const id = String((route.params as AppointmentDetailParams | undefined)?.id ?? "");
  const aptId = parseInt(id, 10);

  const [loading, setLoading] = useState(true);
  const [row, setRow] = useState<AppointmentRow | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [form, setForm] = useState<AppointmentFormState>(() => quickAppointmentFormState());
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const deleteInFlight = useRef(false);

  const load = useCallback(async () => {
    if (!id || Number.isNaN(aptId)) {
      setRow(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from(TABLES.APPOINTMENTS)
      .select("*")
      .eq("user_id", user.id)
      .eq("id", aptId)
      .maybeSingle();
    setRow(error || !data ? null : (data as AppointmentRow));
    setLoading(false);
  }, [aptId, id, user.id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const closeSheet = useCallback(() => {
    setSheetOpen(false);
    setSaveError("");
    setForm(quickAppointmentFormState());
  }, []);

  const handleEdit = useCallback(() => {
    if (!row) return;
    setForm(appointmentFormFromRow(row));
    setSaveError("");
    setSheetOpen(true);
  }, [row]);

  const handleSave = useCallback(
    async (values: AppointmentFormState) => {
      if (!row) return;
      setSaveError("");
      setSaving(true);
      try {
        const payload = appointmentPayloadFromForm(values, true);
        const { error } = await supabase
          .from(TABLES.APPOINTMENTS)
          .update(payload)
          .eq("id", row.id)
          .eq("user_id", user.id);
        if (error) throw error;
        closeSheet();
        invalidateDashboardSnapshot(user.id);
        invalidateAllAppointmentCaches(user.id);
        await load();
        try {
          await rescheduleAppointmentNotificationsForUser(user.id);
        } catch {
          // non-fatal
        }
      } catch (err: unknown) {
        setSaveError(err instanceof Error ? err.message : "Could not save this appointment.");
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
      const { error } = await supabase.from(TABLES.APPOINTMENTS).delete().eq("id", row.id).eq("user_id", user.id);
      if (error) throw error;
      invalidateDashboardSnapshot(user.id);
      invalidateAllAppointmentCaches(user.id);
      try {
        await rescheduleAppointmentNotificationsForUser(user.id);
      } catch {
        // non-fatal
      }
      if (navigation.canGoBack()) navigation.goBack();
      else navigation.navigate("Appointments");
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
      <ScrollView style={[logDetailStyles.scroll, { backgroundColor: c.screen }]} contentContainerStyle={{ paddingBottom: bottomPad }}>
        <Text style={[styles.muted, { color: c.textMuted }]}>Could not load this appointment.</Text>
      </ScrollView>
    );
  }

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
              { label: "Date", value: formatUkDate(row.date) || "Not set" },
              { label: "Time", value: row.time?.trim() || "Not set" },
              { label: "Type", value: row.type?.trim() || "Not set" },
              { label: "Clinician", value: row.clinician_name?.trim() || "Not set" },
              { label: "Location", value: row.location?.trim() || "Not set" },
              { label: "Reminder", value: reminderLabelFromMinutes(row.reminder_minutes_before) },
              { label: "Notes", value: row.notes?.trim() || "Not set" },
            ]}
          />
        </LogDetailCard>
      </ScrollView>

      <ConfirmModal
        visible={deleteOpen}
        title="Delete appointment?"
        message="This appointment will be removed. Are you sure you want to delete it?"
        confirmLabel={deleting ? "Deleting…" : "Delete"}
        confirmDestructive
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
      />

      <AppointmentSheet
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
  headerBtnRow: { flexDirection: "row", alignItems: "center" },
  headerIconBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
});
