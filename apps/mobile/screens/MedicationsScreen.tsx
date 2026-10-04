import { FLARE_CHROME_LUCIDE, FlareLucideIcon, FLARE_FEATURE_LUCIDE } from "../lib/flareLucideIcons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
} from "react-native";
import { showFlareAlert } from "../components/FlareAlertHost";
import { ScrollView } from "../lib/scrollViews";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PrimaryButton, SecondaryButton } from "../components/FlareButton";
import { flareFieldErrorStyle, FlareTextInput } from "../components/FlareInput";
import { Card } from "../components/MidnightLagoonCard";
import { TrayRow } from "../components/MidnightLagoonTray";
import { SectionLabel } from "../components/MidnightLagoonSectionLabel";
import { OptionPickerModal } from "../components/OptionPickerModal";
import { ConfirmModal } from "../components/ConfirmModal";
import { TrackerThumbFab, useTrackerThumbFabLayout } from "../components/TrackerThumbFab";
import { invalidateDashboardSnapshot } from "../lib/dashboardSnapshotCache";
import { useDeferredListLoading } from "../lib/useDeferredListLoading";
import { recordRecentActivityEvent } from "../lib/recentActivityEvents";
import { useLogListSelection } from "../lib/useLogListSelection";
import { MY_MEDS_ICON } from "../lib/medicationFeatureIcons";
import { rescheduleLocalRemindersIfGranted } from "../lib/medicationNotifications";
import {
  emptyMedicationFormState,
  formatMedicationReminderTime,
  MEDICATION_FREQUENCY_PRESETS,
  medicationHasReminder,
  getMedsListExpandedCount,
  medicationListSubtitle,
  medicationPayloadFromForm,
  medicationUpdatePayloadFromForm,
  deleteMedicationsForUser,
  invalidateMedicationsListCache,
  setMedsListExpandedCount,
  type MedicationFormState,
} from "../lib/medicationShared";
import { useMedicationsList } from "../lib/useMedicationsList";
import { snapTimeHmFromDate } from "../lib/bowelMovementShared";
import { TIME_PICKER_MINUTE_INTERVAL, bottomTabBarHeight } from "../lib/layoutConstants";
import { SPACING, TYPOGRAPHY } from "../designTokens";
import { supabase, TABLES } from "../lib/supabase";
import { useFlareColors } from "../theme";

type SessionUser = { id: string };

const FREQUENCY_PICKER_OPTIONS = [...MEDICATION_FREQUENCY_PRESETS, "Custom frequency…"] as const;
const LOAD_MORE_BATCH = 15;

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

export function MedicationSheet({
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
  initialValues: MedicationFormState;
  saving: boolean;
  saveError: string;
  onClose: () => void;
  onSave: (values: MedicationFormState) => void;
}) {
  const c = useFlareColors();
  const insets = useSafeAreaInsets();
  const errTextStyle = flareFieldErrorStyle(c, "input");
  const [form, setForm] = useState<MedicationFormState>(initialValues);
  const [nameError, setNameError] = useState("");
  const [dosageError, setDosageError] = useState("");
  const [frequencyPickerOpen, setFrequencyPickerOpen] = useState(false);
  const [customFrequencyEditing, setCustomFrequencyEditing] = useState(false);
  const [timePickerOpen, setTimePickerOpen] = useState(false);
  const [pickerDraftTime, setPickerDraftTime] = useState<Date | null>(null);

  useEffect(() => {
    if (visible) {
      setForm(initialValues);
      setNameError("");
      setDosageError("");
      setCustomFrequencyEditing(initialValues.frequencyMode === "custom" && !initialValues.frequency.trim());
    }
  }, [visible, initialValues]);

  const setField = <K extends keyof MedicationFormState>(key: K, value: MedicationFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSavePress = () => {
    const nameMissing = !form.name.trim();
    const dosageMissing = !form.dosage.trim();
    setNameError(nameMissing ? "Medication name is required." : "");
    setDosageError(dosageMissing ? "Dosage is required." : "");
    if (nameMissing || dosageMissing) return;
    onSave(form);
  };

  const handleTimePickerChange = (event: { type?: string }, d?: Date) => {
    if (Platform.OS === "android") {
      setTimePickerOpen(false);
      setPickerDraftTime(null);
      if (isAndroidPickerDismissed(event)) return;
      if (event.type === "set" && d) setField("timeOfDay", snapTimeHmFromDate(d));
      return;
    }
    setTimePickerOpen(false);
    setPickerDraftTime(null);
    if (event.type === "dismissed") return;
    if (d) setField("timeOfDay", snapTimeHmFromDate(d));
  };

  return (
    <>
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
        <KeyboardAvoidingView style={[styles.sheetRoot, { backgroundColor: c.screen }]} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={[styles.sheetHeader, { borderBottomColor: c.cardBorder, paddingTop: Math.max(insets.top, 12) }]}>
            <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} hitSlop={12} style={styles.sheetClose}>
              <FlareLucideIcon icon={FLARE_CHROME_LUCIDE.close} size={26} color={c.textSecondary} />
            </Pressable>
            <Text style={[styles.sheetTitle, { color: c.text, fontFamily: TYPOGRAPHY.fontFamily.semibold }]}>
              {editingId ? "Edit medication" : "Add medication"}
            </Text>
            <View style={styles.sheetClose} />
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.sheetScroll, { paddingBottom: insets.bottom + 24 }]} showsVerticalScrollIndicator={false}>
            <SectionLabel>Medication *</SectionLabel>
            <View style={styles.nameDoseRow}>
              <FlareTextInput
                value={form.name}
                onChangeText={(name) => setField("name", name)}
                placeholder="e.g. Mesalazine"
                autoCapitalize="words"
                style={styles.nameInput}
              />
              <FlareTextInput
                trailingLabel="mg"
                value={form.dosage}
                onChangeText={(dosage) => {
                  setDosageError("");
                  setField("dosage", dosage.replace(/\D/g, "").slice(0, 5));
                }}
                placeholder=""
                keyboardType="number-pad"
                maxLength={5}
                style={styles.doseInput}
                accessibilityLabel="Dose in milligrams"
              />
            </View>
            {nameError ? <Text style={errTextStyle}>{nameError}</Text> : null}
            {dosageError ? <Text style={errTextStyle}>{dosageError}</Text> : null}

            <SectionLabel>How often</SectionLabel>
            <Pressable
              accessibilityRole="button"
              onPress={() => setFrequencyPickerOpen(true)}
              style={[styles.frequencyPick, { backgroundColor: c.inputBg, borderColor: c.inputBorder }]}
            >
              <Text style={[styles.frequencyPickLabel, { color: c.text, fontFamily: TYPOGRAPHY.fontFamily.regular }]}>
                {form.frequencyMode === "preset" ? form.frequency : "Custom frequency…"}
              </Text>
              <FlareLucideIcon icon={FLARE_CHROME_LUCIDE.down} size={18} color={c.textSecondary} />
            </Pressable>

            {customFrequencyEditing ? (
              <FlareTextInput
                value={form.frequency}
                onChangeText={(frequency) => setField("frequency", frequency)}
                placeholder="e.g. Every other day"
                autoCapitalize="sentences"
              />
            ) : null}

            <SectionLabel>Reminder</SectionLabel>
            <View style={styles.reminderRow}>
              <Text style={[styles.reminderLabel, { color: c.text, fontFamily: TYPOGRAPHY.fontFamily.regular }]}>Daily reminder</Text>
              <Pressable
                accessibilityRole="switch"
                accessibilityState={{ checked: form.timeOfDay.trim() !== "" && form.timeOfDay !== "as-needed" }}
                onPress={() => {
                  const currentlyEnabled = form.timeOfDay.trim() !== "" && form.timeOfDay !== "as-needed";
                  setField("timeOfDay", currentlyEnabled ? "" : "09:00");
                }}
                style={[
                  styles.switch,
                  (form.timeOfDay.trim() !== "" && form.timeOfDay !== "as-needed")
                    ? { backgroundColor: c.primary }
                    : { backgroundColor: c.inputBorder }
                ]}
              >
                <View
                  style={[
                    styles.switchThumb,
                    {
                      backgroundColor: c.white,
                      transform: [{ translateX: (form.timeOfDay.trim() !== "" && form.timeOfDay !== "as-needed") ? 20 : 0 }]
                    }
                  ]}
                />
              </Pressable>
            </View>

            {form.timeOfDay.trim() !== "" && form.timeOfDay !== "as-needed" ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setPickerDraftTime(parseTimeHm(form.timeOfDay));
                  setTimePickerOpen(true);
                }}
                style={[styles.timePick, { backgroundColor: c.inputBg, borderColor: c.inputBorder }]}
              >
                <Text style={[styles.timePickLabel, { color: c.text, fontFamily: TYPOGRAPHY.fontFamily.regular }]}>{form.timeOfDay}</Text>
                <FlareLucideIcon icon={FLARE_CHROME_LUCIDE.time} size={18} color={c.textSecondary} />
              </Pressable>
            ) : null}

            {saveError ? (
              <Text style={[styles.saveError, { color: c.danger, fontFamily: TYPOGRAPHY.fontFamily.regular }]}>{saveError}</Text>
            ) : null}

            <View style={styles.sheetActions}>
              <PrimaryButton title={saving ? "Saving..." : "Save"} onPress={handleSavePress} disabled={saving} />
              <SecondaryButton title="Cancel" onPress={onClose} disabled={saving} />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {timePickerOpen && pickerDraftTime ? (
        Platform.OS === "ios" ? (
          <Modal visible transparent animationType="slide" onRequestClose={() => setTimePickerOpen(false)}>
            <Pressable style={styles.timePickerBackdrop} onPress={() => setTimePickerOpen(false)}>
              <View style={[styles.timePickerModal, { backgroundColor: c.card }]}>
                <DateTimePicker
                  value={pickerDraftTime}
                  mode="time"
                  display="spinner"
                  minuteInterval={TIME_PICKER_MINUTE_INTERVAL}
                  onChange={handleTimePickerChange}
                  themeVariant={c.isDark ? "dark" : "light"}
                />
              </View>
            </Pressable>
          </Modal>
        ) : (
          <DateTimePicker
            value={pickerDraftTime}
            mode="time"
            minuteInterval={TIME_PICKER_MINUTE_INTERVAL}
            onChange={handleTimePickerChange}
          />
        )
      ) : null}

      <OptionPickerModal
        visible={frequencyPickerOpen}
        options={FREQUENCY_PICKER_OPTIONS}
        onSelect={(opt) => {
          if (opt === "Custom frequency…") {
            setField("frequencyMode", "custom");
            setCustomFrequencyEditing(true);
          } else {
            setField("frequencyMode", "preset");
            setField("frequency", opt);
            setCustomFrequencyEditing(false);
          }
          setFrequencyPickerOpen(false);
        }}
        onCancel={() => setFrequencyPickerOpen(false)}
      />
    </>
  );
}

export function MedicationsScreen({ user }: { user: SessionUser }) {
  const c = useFlareColors();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const tabBarClearance = bottomTabBarHeight(insets.bottom);
  const { scrollBottomPad } = useTrackerThumbFabLayout(tabBarClearance);

  const { meds: medications, loading: dataLoading, load } = useMedicationsList(user.id);
  const listLoading = useDeferredListLoading(dataLoading);
  const error = "";

  const [sheetVisible, setSheetVisible] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [sheetInitial, setSheetInitial] = useState<MedicationFormState>(emptyMedicationFormState());
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const medIds = medications.map((m) => String(m.id));
  const selection = useLogListSelection({
    routeName: "My Meds",
    itemIds: medIds,
    navigation,
    headerTitle: "My Meds",
  });

  const [expandedCount, setExpandedCount] = useState(() => getMedsListExpandedCount(user.id));

  useFocusEffect(
    useCallback(() => {
      setExpandedCount(getMedsListExpandedCount(user.id));
      return () => {};
    }, [user.id]),
  );

  const activeMeds = useMemo(() => medications, [medications]);

  const visibleCount = useMemo(() => {
    if (activeMeds.length === 0) return LOAD_MORE_BATCH;
    if (activeMeds.length <= LOAD_MORE_BATCH) return activeMeds.length;
    return Math.min(expandedCount, activeMeds.length);
  }, [expandedCount, activeMeds.length]);

  const visibleMeds = useMemo(() => activeMeds.slice(0, visibleCount), [activeMeds, visibleCount]);
  const hasMore = activeMeds.length > visibleCount;

  const loadMore = useCallback(() => {
    const newCount = Math.min(expandedCount + LOAD_MORE_BATCH, activeMeds.length);
    setExpandedCount(newCount);
    setMedsListExpandedCount(user.id, newCount);
  }, [expandedCount, activeMeds.length, user.id]);

  const openAddSheet = useCallback(() => {
    setEditingId(null);
    setSheetInitial(emptyMedicationFormState());
    setSaveError("");
    setSheetVisible(true);
  }, []);

  const openEditSheet = useCallback((id: number) => {
    const med = medications.find((m) => m.id === id);
    if (!med) return;
    setEditingId(id);
    setSheetInitial({
      name: med.name,
      dosage: med.dosage ?? "",
      frequencyMode: "preset",
      frequency: med.frequency ?? "Once daily",
      timeOfDay: med.time_of_day ?? "08:00",
      notes: med.notes ?? "",
    });
    setSaveError("");
    setSheetVisible(true);
  }, [medications]);

  const handleSheetSave = useCallback(
    async (values: MedicationFormState) => {
      setSaving(true);
      setSaveError("");
      try {
        if (editingId) {
          const payload = medicationUpdatePayloadFromForm(values);
          const { error: updateError } = await supabase
            .from(TABLES.MEDICATIONS)
            .update(payload)
            .eq("id", editingId)
            .eq("user_id", user.id);
          if (updateError) throw updateError;
        } else {
          const payload = medicationPayloadFromForm(values, user.id);
          const { error: insertError } = await supabase.from(TABLES.MEDICATIONS).insert(payload);
          if (insertError) throw insertError;
        }
        invalidateMedicationsListCache(user.id);
        invalidateDashboardSnapshot(user.id);
        await rescheduleLocalRemindersIfGranted(user.id);
        void load();
        setSheetVisible(false);
      } catch (err: any) {
        setSaveError(err?.message ?? "Save failed.");
      } finally {
        setSaving(false);
      }
    },
    [editingId, load, user.id],
  );

  const handleMarkTaken = useCallback(
    async (id: number) => {
      const today = new Date().toISOString().split("T")[0];
      try {
        const { error: insertError } = await supabase
          .from(TABLES.MEDICATION_TAKEN)
          .insert({ user_id: user.id, medication_id: id, taken_date: today });
        if (insertError) throw insertError;
        invalidateDashboardSnapshot(user.id);
        showFlareAlert("Marked as taken today");
      } catch (err: any) {
        showFlareAlert(err?.message ?? "Failed to mark as taken");
      }
    },
    [user.id],
  );

  const handleDeleteSelected = useCallback(() => {
    void selection.runBulkDelete(async (ids) => {
      await deleteMedicationsForUser(user.id, ids.map((id) => Number.parseInt(id, 10)));
      invalidateDashboardSnapshot(user.id);
      await load();
    });
  }, [selection, user.id, load]);

  return (
    <View style={[styles.screen, { backgroundColor: c.screen }]}>
      <ScrollView style={styles.scroll} contentContainerStyle={[styles.scrollContent, { paddingBottom: scrollBottomPad }]}>
        {listLoading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="small" color={c.primary} />
          </View>
        ) : error ? (
          <Card>
            <Text style={[styles.errorText, { color: c.textSecondary, fontFamily: TYPOGRAPHY.fontFamily.regular }]}>
              {error}
            </Text>
          </Card>
        ) : activeMeds.length === 0 ? (
          <Card>
            <Text style={[styles.emptyText, { color: c.textSecondary, fontFamily: TYPOGRAPHY.fontFamily.regular }]}>
              No medications added yet.
            </Text>
          </Card>
        ) : (
          <>
            <Card noPadding style={{ paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md }}>
              {visibleMeds.map((med) => (
                <TrayRow
                  key={med.id}
                  icon={FLARE_FEATURE_LUCIDE.meds}
                  label={`${med.name}${med.dosage ? ` ${med.dosage}` : ""}`}
                  sublabel={medicationListSubtitle(med)}
                  showChevron
                  onPress={() => navigation.navigate("MedicationDetail", { medicationId: med.id })}
                />
              ))}
            </Card>

            {hasMore ? (
              <Pressable
                accessibilityRole="button"
                onPress={loadMore}
                style={({ pressed }) => [styles.loadMore, pressed && { opacity: 0.7 }]}
              >
                <Text style={[styles.loadMoreText, { color: c.primary, fontFamily: TYPOGRAPHY.fontFamily.medium }]}>
                  load more
                </Text>
              </Pressable>
            ) : null}
          </>
        )}
      </ScrollView>

      <TrackerThumbFab
        accessibilityLabel="Add medication"
        onPress={openAddSheet}
        tabBarClearance={tabBarClearance}
      />

      <MedicationSheet
        visible={sheetVisible}
        editingId={editingId}
        initialValues={sheetInitial}
        saving={saving}
        saveError={saveError}
        onClose={() => setSheetVisible(false)}
        onSave={handleSheetSave}
      />

      <ConfirmModal
        visible={selection.bulkDeleteOpen}
        title="Delete medications"
        message={`Delete ${selection.selectedIds.size} medication${selection.selectedIds.size === 1 ? "" : "s"}?`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        confirmDanger
        onConfirm={handleDeleteSelected}
        onCancel={() => selection.setBulkDeleteOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: SPACING.screen,
    paddingTop: SPACING.lg,
  },
  loadingWrap: {
    paddingVertical: 24,
    alignItems: "center",
  },
  errorText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    textAlign: "center",
  },
  emptyText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    textAlign: "center",
  },
  loadMore: {
    paddingVertical: SPACING.md,
    alignItems: "center",
  },
  loadMoreText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
  },
  sheetRoot: {
    flex: 1,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
  },
  sheetClose: {
    width: 34,
    height: 34,
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
  nameDoseRow: {
    flexDirection: "row",
    gap: SPACING.md,
  },
  nameInput: {
    flex: 1,
  },
  doseInput: {
    width: 100,
  },
  frequencyPick: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: SPACING.md,
  },
  frequencyPickLabel: {
    fontSize: TYPOGRAPHY.fontSize.md,
  },
  reminderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: SPACING.md,
  },
  reminderLabel: {
    fontSize: TYPOGRAPHY.fontSize.md,
  },
  switch: {
    width: 48,
    height: 28,
    borderRadius: 14,
    padding: 2,
    justifyContent: "center",
  },
  switchThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  timePick: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: SPACING.md,
  },
  timePickLabel: {
    fontSize: TYPOGRAPHY.fontSize.md,
  },
  saveError: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    marginTop: SPACING.md,
    textAlign: "center",
  },
  sheetActions: {
    marginTop: SPACING.xl,
    gap: SPACING.md,
  },
  timePickerBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  timePickerModal: {
    borderTopLeftRadius: SPACING.lg,
    borderTopRightRadius: SPACING.lg,
    padding: SPACING.lg,
  },
});
