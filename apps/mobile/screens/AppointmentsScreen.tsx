import { FLARE_CHROME_LUCIDE, FlareLucideIcon } from "../lib/flareLucideIcons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useNavigation } from "@react-navigation/native";
import React, { useCallback, useLayoutEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { ScrollView } from "../lib/scrollViews";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PrimaryButton, SecondaryButton } from "../components/FlareButton";
import { flareFieldErrorStyle, FlareTextInput } from "../components/FlareInput";
import { SectionLabel } from "../components/MidnightLagoonSectionLabel";
import { SegmentedTabs } from "../components/MidnightLagoonSegmentedTabs";
import { ScreenHeader } from "../components/MidnightLagoonScreenHeader";
import { InfoHintButton } from "../components/InfoHintButton";
import { OptionPickerModal } from "../components/OptionPickerModal";
import { TrackerThumbFab, useTrackerThumbFabLayout } from "../components/TrackerThumbFab";
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
import { TIME_PICKER_MINUTE_INTERVAL } from "../lib/layoutConstants";
import { SPACING, RADIUS, TYPOGRAPHY } from "../designTokens";
import { supabase, TABLES } from "../lib/supabase";
import { useFlareColors } from "../theme";
import { AppointmentBriefContent } from "./AppointmentBriefContent";
import { AppointmentsListPane } from "./AppointmentsListPane";
import { AppointmentQuestionsPane } from "./AppointmentQuestionsPane";
import { APPOINTMENT_QUESTIONS_HINT } from "../lib/appointmentQuestionsShared";

type SessionUser = { id: string };

const APPOINTMENTS_HUB_TABS = [
  { label: "Appointments", value: "appointments" },
  { label: "Questions", value: "questions" },
  { label: "Summary", value: "summary" },
] as const;

const APPOINTMENTS_HUB_HINT = "Add your appointments and choose when you want to be reminded.";
const APPOINTMENT_SUMMARY_HINT = "Generate a health summary from your records for your next appointment. Choose a suggested period or select your own dates.";

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
  } catch {}
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
        <KeyboardAvoidingView style={[styles.sheetRoot, { backgroundColor: c.screen }]} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={[styles.sheetHeader, { borderBottomColor: c.cardBorder, paddingTop: Math.max(insets.top, 12) }]}>
            <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} hitSlop={12} style={styles.sheetClose}>
              <FlareLucideIcon icon={FLARE_CHROME_LUCIDE.close} size={26} color={c.textSecondary} />
            </Pressable>
            <Text style={[styles.sheetTitle, { color: c.text, fontFamily: TYPOGRAPHY.fontFamily.semibold }]}>
              {editingId ? "Edit appointment" : "Add appointment"}
            </Text>
            <View style={styles.sheetClose} />
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.sheetScroll, { paddingBottom: insets.bottom + 24 }]} showsVerticalScrollIndicator={false}>
            <View style={styles.whenRow}>
              <View style={styles.whenCol}>
                <SectionLabel>Date *</SectionLabel>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Date"
                  onPress={() => {
                    setTimePickerOpen(false);
                    setPickerDraftDate(form.date ? parseYmd(form.date) : new Date());
                    setDatePickerOpen(true);
                  }}
                  style={[styles.whenPill, { backgroundColor: c.inputBg, borderColor: c.inputBorder }]}
                >
                  <FlareLucideIcon icon={FLARE_CHROME_LUCIDE.calendar} size={18} color={c.textSecondary} />
                  <Text style={[styles.whenPillText, { color: form.date ? c.text : c.textSecondary, fontFamily: TYPOGRAPHY.fontFamily.regular }]}>
                    {form.date ? formatUkDate(form.date) : ""}
                  </Text>
                </Pressable>
              </View>
              <View style={styles.whenCol}>
                <SectionLabel>Time *</SectionLabel>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Time"
                  onPress={() => {
                    setDatePickerOpen(false);
                    setPickerDraftTime(form.time ? parseTimeHm(form.time) : new Date());
                    setTimePickerOpen(true);
                  }}
                  style={[styles.whenPill, { backgroundColor: c.inputBg, borderColor: c.inputBorder }]}
                >
                  <FlareLucideIcon icon={FLARE_CHROME_LUCIDE.time} size={18} color={c.textSecondary} />
                  <Text style={[styles.whenPillText, { color: form.time ? c.text : c.textSecondary, fontFamily: TYPOGRAPHY.fontFamily.regular }]}>
                    {form.time || ""}
                  </Text>
                </Pressable>
              </View>
            </View>

            <SectionLabel>Type of appointment *</SectionLabel>
            <FlareTextInput value={form.type} onChangeText={(type) => setField("type", type)} placeholder="e.g. GP, Surgical, MRI, Endoscopy" />

            <SectionLabel>Name of clinician</SectionLabel>
            <FlareTextInput value={form.clinicianName} onChangeText={(clinicianName) => setField("clinicianName", clinicianName)} placeholder="e.g. Dr Smith" />

            <SectionLabel>Location *</SectionLabel>
            <FlareTextInput value={form.location} onChangeText={(location) => setField("location", location)} placeholder="e.g. St Mary's Hospital" />

            <SectionLabel>Notes</SectionLabel>
            <FlareTextInput multiline value={form.notes} onChangeText={(notes) => setField("notes", notes)} placeholder="e.g. Bring medications, list any questions you have" style={styles.notesInput} />

            <SectionLabel>Remind me</SectionLabel>
            <Pressable accessibilityRole="button" accessibilityLabel="Reminder" onPress={() => setReminderPickerOpen(true)} style={[styles.whenPill, { backgroundColor: c.inputBg, borderColor: c.inputBorder }]}>
              <FlareLucideIcon icon={FLARE_CHROME_LUCIDE.notifications} size={18} color={c.textSecondary} />
              <Text style={[styles.whenPillText, { color: c.text, fontFamily: TYPOGRAPHY.fontFamily.regular }]}>{reminderLabel}</Text>
              <FlareLucideIcon icon={FLARE_CHROME_LUCIDE.down} size={18} color={c.textSecondary} />
            </Pressable>

            {fieldError ? <Text style={[errTextStyle, styles.fieldError]}>{fieldError}</Text> : null}
            {saveError ? <Text style={[errTextStyle, styles.fieldError]}>{saveError}</Text> : null}

            <View style={styles.sheetActions}>
              <PrimaryButton label={saving ? "Saving…" : "Save"} onPress={handleSavePress} disabled={saving} />
              <SecondaryButton label="Cancel" onPress={onClose} />
            </View>
          </ScrollView>

          {datePickerOpen && pickerDraftDate ? <DateTimePicker value={pickerDraftDate} mode="date" display="default" minimumDate={editingId ? undefined : new Date()} onChange={handleDatePickerChange} /> : null}

          {timePickerOpen && pickerDraftTime ? <DateTimePicker value={pickerDraftTime} mode="time" display="default" minuteInterval={TIME_PICKER_MINUTE_INTERVAL} onChange={handleTimePickerChange} /> : null}
        </KeyboardAvoidingView>
      </Modal>

      <OptionPickerModal
        visible={reminderPickerOpen}
        options={APPOINTMENT_REMINDER_PICKER_LABELS}
        selectedOption={reminderLabel}
        onSelect={(label) => {
          setField("reminderMinutesBefore", reminderMinutesFromPickerLabel(label));
          setReminderPickerOpen(false);
        }}
        onClose={() => setReminderPickerOpen(false)}
      />
    </>
  );
}

export function AppointmentsScreen({ user }: { user: SessionUser }) {
  const c = useFlareColors();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { fabBottom, fabRight } = useTrackerThumbFabLayout();
  const appointmentsList = useAppointmentsList(user.id);
  const { load } = appointmentsList;
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<AppointmentFormState>(() => quickAppointmentFormState());
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [activeTab, setActiveTab] = useState("appointments");
  const [listSelectionMode, setListSelectionMode] = useState(false);
  const [questionsSelectionMode, setQuestionsSelectionMode] = useState(false);
  const openQuestionAddRef = useRef<() => void>(() => {});
  const anySelectionMode = listSelectionMode || questionsSelectionMode;

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

  const registerOpenQuestionAdd = useCallback((fn: () => void) => {
    openQuestionAddRef.current = fn;
  }, []);

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

  const showFab = (activeTab === "appointments" && !listSelectionMode) || (activeTab === "questions" && !questionsSelectionMode);

  return (
    <>
      <View style={[styles.screen, { backgroundColor: c.screen }]}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: showFab ? fabBottom + 80 : Math.max(insets.bottom, 16) + 24 },
          ]}
        >
          <View style={styles.headerRow}>
            <ScreenHeader title="Appointments" />
            <Pressable accessibilityRole="button" accessibilityLabel="Past Appointments" hitSlop={10} onPress={() => navigation.navigate("AppointmentsPast")}>
              <Text style={[styles.navLabel, { color: c.text, fontFamily: TYPOGRAPHY.fontFamily.regular }]}>Past</Text>
            </Pressable>
          </View>

          <SegmentedTabs tabs={APPOINTMENTS_HUB_TABS} activeValue={activeTab} onChange={setActiveTab} />

          {activeTab === "appointments" && (
            <AppointmentsListPane
              user={user}
              tab="upcoming"
              showFab={false}
              onAddPress={openAdd}
              selectionRouteName="Appointments"
              headerTitle="Appointments"
              list={appointmentsList}
              embedded
              onSelectionModeChange={setListSelectionMode}
              ownsHeader={false}
            />
          )}

          {activeTab === "questions" && (
            <AppointmentQuestionsPane
              user={user}
              embedded
              selectionRouteName="Appointments"
              headerActive={true}
              registerOpenAdd={registerOpenQuestionAdd}
              onSelectionModeChange={setQuestionsSelectionMode}
            />
          )}

          {activeTab === "summary" && <AppointmentBriefContent />}
        </ScrollView>

        {showFab ? (
          <TrackerThumbFab
            accessibilityLabel={activeTab === "questions" ? "Add question" : "Add appointment"}
            onPress={activeTab === "questions" ? () => openQuestionAddRef.current() : openAdd}
            bottom={fabBottom}
            right={fabRight}
          />
        ) : null}
      </View>

      <AppointmentSheet visible={sheetOpen} editingId={editingId} initialValues={form} saving={saving} saveError={saveError} onClose={closeSheet} onSave={handleSave} />
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
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: SPACING.lg,
  },
  navLabel: {
    fontSize: TYPOGRAPHY.fontSize.md,
  },
  sheetRoot: { flex: 1 },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
  },
  sheetClose: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetTitle: {
    fontSize: TYPOGRAPHY.fontSize.cardTitle,
  },
  sheetScroll: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
  },
  whenRow: {
    flexDirection: "row",
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  whenCol: {
    flex: 1,
    gap: SPACING.xs,
  },
  whenPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    minHeight: 42,
    paddingHorizontal: SPACING.md,
    borderRadius: 8,
    borderWidth: 1,
  },
  whenPillText: {
    flex: 1,
    fontSize: TYPOGRAPHY.fontSize.md,
  },
  notesInput: {
    marginTop: 0,
  },
  fieldError: {
    marginTop: SPACING.sm,
  },
  sheetActions: {
    marginTop: SPACING.lg,
    gap: SPACING.md,
  },
});
