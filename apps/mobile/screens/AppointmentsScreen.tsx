import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import React, { useCallback, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { ScrollView } from "../lib/scrollViews";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PrimaryButton, SecondaryButton } from "../components/FlareButton";
import { flareFieldErrorStyle, FlareTextInput, FLARE_INPUT_BORDER_RADIUS } from "../components/FlareInput";
import { FlareScreenSectionTitle } from "../components/FlareScreenSectionTitle";
import { OptionPickerModal } from "../components/OptionPickerModal";
import { STACKED_DETAIL_ROW_EDGE } from "../components/StackedDetailField";
import { invalidateDashboardSnapshot } from "../lib/dashboardSnapshotCache";
import { useAppointmentsList } from "../lib/useAppointmentsList";
import { formatUkDate } from "../lib/formatUkDate";
import { rescheduleAppointmentNotificationsForUser } from "../lib/medicationNotifications";
import { invalidateAllAppointmentCaches } from "../lib/appointmentCaches";
import {
  APPOINTMENT_REMINDER_PICKER_LABELS,
  appointmentPayloadFromForm,
  quickAppointmentFormState,
  reminderLabelFromMinutes,
  reminderMinutesFromPickerLabel,
  validateAppointmentForm,
  type AppointmentFormState,
} from "../lib/appointmentShared";
import {
  FLARE_FONT_FAMILY,
  FLARE_FONT_SIZE,
  NAV_ROW_LABEL,
  SCREEN_EDGE_PADDING,
  TIME_PICKER_MINUTE_INTERVAL,
} from "../lib/layoutConstants";
import { supabase, TABLES } from "../lib/supabase";
import {
  markAppointmentsInstructionDismissed,
  readAppointmentsInstructionDismissed,
  readAppointmentsInstructionEligible,
} from "../lib/appointmentsInstructionTip";
import { useInstructionTip } from "../lib/useInstructionTip";
import { useFlareColors } from "../theme";
import { AppointmentsListPane } from "./AppointmentsListPane";

type SessionUser = { id: string };

function toYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseYmd(s: string): Date {
  const d = new Date(`${s}T12:00:00`);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

function parseTimeHm(s: string): Date {
  if (/^\d{2}:\d{2}$/.test(s)) {
    const d = new Date(`2000-01-01T${s}:00`);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return new Date();
}

function isAndroidPickerDismissed(event: { type?: string }): boolean {
  return Platform.OS === "android" && event.type === "dismissed";
}

function snapTimeHmFromDate(d: Date): string {
  let totalMins = d.getHours() * 60 + d.getMinutes();
  totalMins = Math.round(totalMins / TIME_PICKER_MINUTE_INTERVAL) * TIME_PICKER_MINUTE_INTERVAL;
  if (totalMins >= 24 * 60) totalMins = 24 * 60 - TIME_PICKER_MINUTE_INTERVAL;
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

async function maybeRescheduleAppointmentReminders(userId: string) {
  try {
    await rescheduleAppointmentNotificationsForUser(userId);
  } catch {
    // non-fatal
  }
}

export function AppointmentSheet({
  visible,
  editingId,
  initialValues,
  saving,
  saveError,
  onClose,
  onSave,
}: {
  visible: boolean;
  editingId: number | null;
  initialValues: AppointmentFormState;
  saving: boolean;
  saveError: string;
  onClose: () => void;
  onSave: (values: AppointmentFormState) => void;
}) {
  const c = useFlareColors();
  const insets = useSafeAreaInsets();
  const errTextStyle = flareFieldErrorStyle(c, "input");
  const [form, setForm] = useState<AppointmentFormState>(initialValues);
  const [fieldError, setFieldError] = useState("");
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [pickerDraftDate, setPickerDraftDate] = useState<Date | null>(null);
  const [timePickerOpen, setTimePickerOpen] = useState(false);
  const [pickerDraftTime, setPickerDraftTime] = useState<Date | null>(null);
  const [reminderPickerOpen, setReminderPickerOpen] = useState(false);

  React.useEffect(() => {
    if (visible) {
      setForm(initialValues);
      setFieldError("");
    }
  }, [visible, initialValues]);

  const setField = <K extends keyof AppointmentFormState>(key: K, value: AppointmentFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSavePress = () => {
    const validationError = validateAppointmentForm(form);
    if (validationError) {
      setFieldError(validationError);
      return;
    }
    setFieldError("");
    onSave(form);
  };

  const handleDatePickerChange = (event: { type?: string }, d?: Date) => {
    if (Platform.OS === "android") {
      setDatePickerOpen(false);
      setPickerDraftDate(null);
      if (isAndroidPickerDismissed(event)) return;
      if (event.type === "set" && d) setField("date", toYmd(d));
      return;
    }
    setDatePickerOpen(false);
    setPickerDraftDate(null);
    if (event.type === "dismissed") return;
    if (d) setField("date", toYmd(d));
  };

  const handleTimePickerChange = (event: { type?: string }, d?: Date) => {
    if (Platform.OS === "android") {
      setTimePickerOpen(false);
      setPickerDraftTime(null);
      if (isAndroidPickerDismissed(event)) return;
      if (event.type === "set" && d) setField("time", snapTimeHmFromDate(d));
      return;
    }
    setTimePickerOpen(false);
    setPickerDraftTime(null);
    if (event.type === "dismissed") return;
    if (d) setField("time", snapTimeHmFromDate(d));
  };

  const reminderLabel = reminderLabelFromMinutes(form.reminderMinutesBefore);

  return (
    <>
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
        <KeyboardAvoidingView
          style={[styles.sheetRoot, { backgroundColor: c.screen }]}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View
            style={[
              styles.sheetHeader,
              {
                borderBottomColor: c.cardBorder,
                paddingTop: Math.max(insets.top, 12),
                backgroundColor: c.screen,
                zIndex: 1,
                elevation: 1,
              },
            ]}
          >
            <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} hitSlop={12} style={styles.sheetClose}>
              <Ionicons name="close" size={26} color={c.textMuted} />
            </Pressable>
            <Text style={[styles.sheetTitle, { color: c.text }]}>{editingId ? "Edit appointment" : "Add appointment"}</Text>
            <View style={styles.sheetClose} />
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[styles.sheetScroll, { paddingBottom: insets.bottom + 24 }]}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.whenBlock}>
            <View style={styles.whenRow}>
              <View style={styles.whenCol}>
                <FlareScreenSectionTitle compact>Date *</FlareScreenSectionTitle>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Date"
                  onPress={() => {
                    setTimePickerOpen(false);
                    setPickerDraftDate(form.date ? parseYmd(form.date) : new Date());
                    setDatePickerOpen(true);
                  }}
                  style={[styles.whenPill, { backgroundColor: c.surfaceSubtle, borderColor: c.cardBorder }]}
                >
                  <Ionicons name="calendar-outline" size={18} color={c.textSecondary} />
                  <Text style={[styles.whenPillText, { color: form.date ? c.text : c.textMuted }]}>{form.date ? formatUkDate(form.date) : ""}</Text>
                </Pressable>
              </View>
              <View style={styles.whenCol}>
                <FlareScreenSectionTitle compact>Time *</FlareScreenSectionTitle>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Time"
                  onPress={() => {
                    setDatePickerOpen(false);
                    setPickerDraftTime(form.time ? parseTimeHm(form.time) : new Date());
                    setTimePickerOpen(true);
                  }}
                  style={[styles.whenPill, { backgroundColor: c.surfaceSubtle, borderColor: c.cardBorder }]}
                >
                  <Ionicons name="time-outline" size={18} color={c.textSecondary} />
                  <Text style={[styles.whenPillText, { color: form.time ? c.text : c.textMuted }]}>{form.time || ""}</Text>
                </Pressable>
              </View>
            </View>
            </View>

            <FlareScreenSectionTitle compact style={{ marginTop: 16 }}>
              Type of appointment *
            </FlareScreenSectionTitle>
            <FlareTextInput value={form.type} onChangeText={(type) => setField("type", type)} placeholder="e.g. GP, Surgical, MRI, Endoscopy" />

            <FlareScreenSectionTitle compact style={{ marginTop: 16 }}>
              Name of clinician
            </FlareScreenSectionTitle>
            <FlareTextInput value={form.clinicianName} onChangeText={(clinicianName) => setField("clinicianName", clinicianName)} placeholder="e.g. Dr Smith" />

            <FlareScreenSectionTitle compact style={{ marginTop: 16 }}>
              Location *
            </FlareScreenSectionTitle>
            <FlareTextInput value={form.location} onChangeText={(location) => setField("location", location)} placeholder="e.g. St Mary's Hospital" />

            <FlareScreenSectionTitle compact style={{ marginTop: 16 }}>
              Notes
            </FlareScreenSectionTitle>
            <FlareTextInput
              multiline
              value={form.notes}
              onChangeText={(notes) => setField("notes", notes)}
              placeholder="e.g. Bring medications, list any questions you have"
              style={styles.notesInput}
            />

            <FlareScreenSectionTitle compact style={{ marginTop: 16 }}>
              Remind me
            </FlareScreenSectionTitle>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Reminder"
              onPress={() => setReminderPickerOpen(true)}
              style={[styles.whenPill, { backgroundColor: c.surfaceSubtle, borderColor: c.cardBorder }]}
            >
              <Ionicons name="notifications-outline" size={18} color={c.textSecondary} />
              <Text style={[styles.whenPillText, { color: c.text }]}>{reminderLabel}</Text>
              <Ionicons name="chevron-down" size={18} color={c.textMuted} />
            </Pressable>

            {fieldError ? <Text style={[errTextStyle, styles.fieldError]}>{fieldError}</Text> : null}
            {saveError ? <Text style={[errTextStyle, styles.fieldError]}>{saveError}</Text> : null}

            <View style={styles.sheetActions}>
              <PrimaryButton title={saving ? "Saving…" : "Save"} onPress={handleSavePress} disabled={saving} />
              <SecondaryButton title="Cancel" onPress={onClose} />
            </View>
          </ScrollView>

          {datePickerOpen && pickerDraftDate ? (
            <DateTimePicker
              value={pickerDraftDate}
              mode="date"
              display="default"
              minimumDate={editingId ? undefined : new Date()}
              onChange={handleDatePickerChange}
            />
          ) : null}

          {timePickerOpen && pickerDraftTime ? (
            <DateTimePicker
              value={pickerDraftTime}
              mode="time"
              display="default"
              minuteInterval={TIME_PICKER_MINUTE_INTERVAL}
              onChange={handleTimePickerChange}
            />
          ) : null}
        </KeyboardAvoidingView>
      </Modal>

      <OptionPickerModal
        visible={reminderPickerOpen}
        options={APPOINTMENT_REMINDER_PICKER_LABELS}
        onSelect={(label) => {
          setField("reminderMinutesBefore", reminderMinutesFromPickerLabel(label));
          setReminderPickerOpen(false);
        }}
        onCancel={() => setReminderPickerOpen(false)}
      />
    </>
  );
}

export function AppointmentsScreen({ user }: { user: SessionUser }) {
  const c = useFlareColors();
  const navigation = useNavigation<any>();
  const { visible: showAppointmentsInstruction, dismiss: dismissAppointmentsInstruction } = useInstructionTip(
    user.id,
    readAppointmentsInstructionEligible,
    readAppointmentsInstructionDismissed,
    markAppointmentsInstructionDismissed,
  );
  const appointmentsList = useAppointmentsList(user.id);
  const { load } = appointmentsList;
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<AppointmentFormState>(() => quickAppointmentFormState());
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const closeSheet = useCallback(() => {
    setSheetOpen(false);
    setEditingId(null);
    setSaveError("");
    setForm(quickAppointmentFormState());
  }, []);

  const openAdd = useCallback(() => {
    setForm(quickAppointmentFormState());
    setEditingId(null);
    setSaveError("");
    setSheetOpen(true);
  }, []);

  const renderPastLink = useCallback(
    () => (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Past Appointments"
        hitSlop={10}
        onPress={() => navigation.navigate("AppointmentsPast")}
      >
        <Text style={[NAV_ROW_LABEL, { color: c.text }]}>Past</Text>
      </Pressable>
    ),
    [c.text, navigation],
  );

  const openSummary = useCallback(() => {
    navigation.navigate("AppointmentBrief");
  }, [navigation]);

  const handleSave = async (values: AppointmentFormState) => {
    setSaveError("");
    setSaving(true);
    try {
      const payload = appointmentPayloadFromForm(values, Boolean(editingId));
      if (editingId) {
        const { error } = await supabase.from(TABLES.APPOINTMENTS).update(payload).eq("id", editingId).eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from(TABLES.APPOINTMENTS).insert([{ ...payload, user_id: user.id }]);
        if (error) throw error;
      }
      closeSheet();
      invalidateDashboardSnapshot(user.id);
      invalidateAllAppointmentCaches(user.id);
      await load();
      await maybeRescheduleAppointmentReminders(user.id);
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Could not save this appointment.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <AppointmentsListPane
        user={user}
        tab="upcoming"
        showFab
        onAddPress={openAdd}
        selectionRouteName="Appointments"
        headerTitle="Appointments"
        showInstruction={showAppointmentsInstruction}
        onDismissInstruction={dismissAppointmentsInstruction}
        renderIdleHeaderRight={renderPastLink}
        onSummaryPress={openSummary}
        list={appointmentsList}
      />

      <AppointmentSheet
        visible={sheetOpen}
        editingId={editingId}
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
  sheetRoot: { flex: 1 },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingBottom: SCREEN_EDGE_PADDING,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sheetClose: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  sheetTitle: { fontSize: FLARE_FONT_SIZE.navTitle, fontFamily: FLARE_FONT_FAMILY.bold },
  sheetScroll: { paddingHorizontal: 20, paddingTop: 14 },
  whenBlock: { marginBottom: 4 },
  whenRow: { flexDirection: "row", gap: STACKED_DETAIL_ROW_EDGE },
  whenCol: { flex: 1, gap: 6 },
  whenPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 42,
    paddingHorizontal: 12,
    borderRadius: FLARE_INPUT_BORDER_RADIUS,
    borderWidth: 1,
  },
  whenPillText: { flex: 1, fontSize: FLARE_FONT_SIZE.body, fontFamily: FLARE_FONT_FAMILY.regular },
  notesInput: { marginTop: 0 },
  fieldError: { marginTop: 8, marginBottom: 4 },
  sheetActions: { marginTop: STACKED_DETAIL_ROW_EDGE, gap: 8 },
});
