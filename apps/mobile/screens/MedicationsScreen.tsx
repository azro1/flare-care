import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  InteractionManager,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PrimaryButton, SecondaryButton } from "../components/FlareButton";
import { flareFieldErrorStyle, FlareTextInput } from "../components/FlareInput";
import { FlareScreenSectionTitle } from "../components/FlareScreenSectionTitle";
import {
  LogHistoryCard,
  LogHistoryList,
  LogHistoryListLoading,
  logHistoryCardStyles,
  logHistoryListStyles,
} from "../components/LogHistoryList";
import { OptionPickerModal } from "../components/OptionPickerModal";
import { invalidateDashboardSnapshot } from "../lib/dashboardSnapshotCache";
import { MY_MEDS_MCI_ICON } from "../lib/medicationFeatureIcons";
import { rescheduleMedicationNotificationsForUser } from "../lib/medicationNotifications";
import {
  emptyMedicationFormState,
  fetchMedicationsForUser,
  getMedicationsListCache,
  medicationsListCacheKey,
  MEDICATION_FREQUENCY_PRESETS,
  medicationListSubtitle,
  medicationHasReminder,
  medicationPayloadFromForm,
  medicationUpdatePayloadFromForm,
  formatMedicationReminderTime,
  type MedicationFormState,
  type MedicationRow,
} from "../lib/medicationShared";
import { snapTimeHmFromDate } from "../lib/bowelMovementShared";
import {
  FLARE_FONT_FAMILY,
  FLARE_FONT_SIZE,
  FLARE_LINE_HEIGHT,
  SCREEN_EDGE_PADDING,
  SECTION_TITLE_MARGIN_BOTTOM,
  TIME_PICKER_MINUTE_INTERVAL,
  bottomTabBarHeight,
} from "../lib/layoutConstants";
import { supabase, TABLES } from "../lib/supabase";
import { useFlareColors } from "../theme";

type SessionUser = { id: string };

const FREQUENCY_PICKER_OPTIONS = [
  ...MEDICATION_FREQUENCY_PRESETS,
  "Custom frequency…",
] as const;

function useBottomTabScrollInset() {
  const insets = useSafeAreaInsets();
  return bottomTabBarHeight(insets.bottom);
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
  const [frequencyPickerOpen, setFrequencyPickerOpen] = useState(false);
  const [customFrequencyEditing, setCustomFrequencyEditing] = useState(false);
  const [timePickerOpen, setTimePickerOpen] = useState(false);
  const [pickerDraftTime, setPickerDraftTime] = useState<Date | null>(null);

  useEffect(() => {
    if (visible) {
      setForm(initialValues);
      setNameError("");
      setCustomFrequencyEditing(
        initialValues.frequencyMode === "custom" && !initialValues.frequency.trim(),
      );
    }
  }, [visible, initialValues]);

  const setField = <K extends keyof MedicationFormState>(key: K, value: MedicationFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSavePress = () => {
    if (!form.name.trim()) {
      setNameError("Medication name is required.");
      return;
    }
    setNameError("");
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
        <KeyboardAvoidingView
          style={[styles.sheetRoot, { backgroundColor: c.screen }]}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={[styles.sheetHeader, { borderBottomColor: c.cardBorder, paddingTop: Math.max(insets.top, 12) }]}>
            <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} hitSlop={12} style={styles.sheetClose}>
              <Ionicons name="close" size={26} color={c.textMuted} />
            </Pressable>
            <Text style={[styles.sheetTitle, { color: c.text }]}>{editingId ? "Edit medication" : "Add medication"}</Text>
            <View style={styles.sheetClose} />
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[styles.sheetScroll, { paddingBottom: insets.bottom + 24 }]}
            showsVerticalScrollIndicator={false}
          >
            <Text style={[styles.sheetLead, { color: c.textMuted }]}>
              Add medications prescribed by your GP or hospital team.
            </Text>

            <FlareScreenSectionTitle compact>Medication name *</FlareScreenSectionTitle>
            <FlareTextInput
              value={form.name}
              onChangeText={(name) => setField("name", name)}
              placeholder="e.g. Mesalazine"
              autoCapitalize="words"
            />
            {nameError ? <Text style={errTextStyle}>{nameError}</Text> : null}

            <FlareScreenSectionTitle compact style={{ marginTop: 16 }}>
              Dosage (mg)
            </FlareScreenSectionTitle>
            <FlareTextInput
              value={form.dosage}
              onChangeText={(dosage) => setField("dosage", dosage.replace(/\D/g, "").slice(0, 5))}
              placeholder="Optional"
              keyboardType="number-pad"
            />

            <FlareScreenSectionTitle compact style={{ marginTop: 16 }}>
              Frequency
            </FlareScreenSectionTitle>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Frequency"
              onPress={() => setFrequencyPickerOpen(true)}
              style={[styles.pickerPill, { backgroundColor: c.surfaceSubtle, borderColor: c.cardBorder }]}
            >
              <Text style={[styles.pickerPillText, { color: form.frequency ? c.text : c.textMuted }]}>
                {form.frequencyMode === "custom" && form.frequency
                  ? form.frequency
                  : form.frequency || "Select frequency"}
              </Text>
              <Ionicons name="chevron-down" size={18} color={c.textMuted} />
            </Pressable>
            {form.frequencyMode === "custom" && customFrequencyEditing ? (
              <FlareTextInput
                value={form.frequency}
                onChangeText={(frequency) => setField("frequency", frequency)}
                onBlur={() => {
                  setForm((prev) => {
                    if (prev.frequency.trim()) setCustomFrequencyEditing(false);
                    return prev;
                  });
                }}
                placeholder="Custom frequency"
                autoFocus
                style={{ marginTop: 8 }}
              />
            ) : null}

            <FlareScreenSectionTitle compact style={{ marginTop: 16 }}>
              Reminder time
            </FlareScreenSectionTitle>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Reminder time"
              onPress={() => {
                setPickerDraftTime(form.timeOfDay ? parseTimeHm(form.timeOfDay) : new Date());
                setTimePickerOpen(true);
              }}
              style={[styles.pickerPill, { backgroundColor: c.surfaceSubtle, borderColor: c.cardBorder }]}
            >
              <Ionicons name="time-outline" size={18} color={c.textSecondary} />
              <Text style={[styles.pickerPillText, { color: form.timeOfDay ? c.text : c.textMuted }]}>
                {form.timeOfDay ? formatMedicationReminderTime(form.timeOfDay) : "Select time"}
              </Text>
            </Pressable>

            <FlareScreenSectionTitle compact style={{ marginTop: 16 }}>
              Notes
            </FlareScreenSectionTitle>
            <FlareTextInput
              multiline
              value={form.notes}
              onChangeText={(notes) => setField("notes", notes)}
              placeholder="Optional"
              style={styles.notesInput}
            />

            {saveError ? <Text style={[errTextStyle, styles.saveError]}>{saveError}</Text> : null}

            <View style={styles.sheetActions}>
              <PrimaryButton title={saving ? "Saving…" : editingId ? "Save changes" : "Save medication"} onPress={handleSavePress} disabled={saving} />
              <SecondaryButton title="Cancel" onPress={onClose} />
            </View>
          </ScrollView>

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
        visible={frequencyPickerOpen}
        options={FREQUENCY_PICKER_OPTIONS}
        onSelect={(value) => {
          setFrequencyPickerOpen(false);
          if (value === "Custom frequency…") {
            setField("frequencyMode", "custom");
            setCustomFrequencyEditing(true);
            if (MEDICATION_FREQUENCY_PRESETS.includes(form.frequency as (typeof MEDICATION_FREQUENCY_PRESETS)[number])) {
              setField("frequency", "");
            }
            return;
          }
          setField("frequencyMode", "preset");
          setCustomFrequencyEditing(false);
          setField("frequency", value);
        }}
        onCancel={() => setFrequencyPickerOpen(false)}
      />
    </>
  );
}

function WriggleReminderBell({ color }: { color: string }) {
  const rotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const wriggle = Animated.sequence([
      Animated.timing(rotate, { toValue: 1, duration: 90, useNativeDriver: true }),
      Animated.timing(rotate, { toValue: -1, duration: 90, useNativeDriver: true }),
      Animated.timing(rotate, { toValue: 0.65, duration: 75, useNativeDriver: true }),
      Animated.timing(rotate, { toValue: -0.65, duration: 75, useNativeDriver: true }),
      Animated.timing(rotate, { toValue: 0, duration: 70, useNativeDriver: true }),
    ]);
    const loop = Animated.loop(Animated.sequence([wriggle, Animated.delay(2600)]));
    loop.start();
    return () => loop.stop();
  }, [rotate]);

  const wiggle = rotate.interpolate({
    inputRange: [-1, 1],
    outputRange: ["-16deg", "16deg"],
  });

  return (
    <Animated.View style={{ transform: [{ rotate: wiggle }] }}>
      <Ionicons
        name="notifications"
        size={16}
        color={color}
        accessibilityElementsHidden
        importantForAccessibility="no"
        accessibilityIgnoresInvertColors
      />
    </Animated.View>
  );
}

async function maybeRescheduleReminders(userId: string) {
  try {
    await rescheduleMedicationNotificationsForUser(userId);
  } catch {
    // non-fatal
  }
}

export function MedicationsScreen({ user }: { user: SessionUser }) {
  const c = useFlareColors();
  const navigation = useNavigation<any>();
  const bottomScrollInset = useBottomTabScrollInset();
  const [meds, setMeds] = useState<MedicationRow[]>(() => getMedicationsListCache(user.id) ?? []);
  const medsRef = useRef<MedicationRow[]>(getMedicationsListCache(user.id) ?? []);
  const medsListKeyRef = useRef(medicationsListCacheKey(medsRef.current));
  const [loading, setLoading] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<MedicationFormState>(() => emptyMedicationFormState());
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const applyMeds = useCallback((rows: MedicationRow[]) => {
    const nextKey = medicationsListCacheKey(rows);
    if (nextKey === medsListKeyRef.current) return;
    medsListKeyRef.current = nextKey;
    setMeds(rows);
  }, []);

  const load = useCallback(async () => {
    const hasCache = getMedicationsListCache(user.id) !== undefined;
    if (!hasCache) setLoading(true);
    try {
      const rows = await fetchMedicationsForUser(user.id);
      applyMeds(rows);
    } catch (err) {
      console.error("Error loading medications:", err);
      applyMeds([]);
    } finally {
      setLoading(false);
    }
  }, [applyMeds, user.id]);

  useFocusEffect(
    useCallback(() => {
      const cached = getMedicationsListCache(user.id);
      if (cached !== undefined) {
        applyMeds(cached);
        setLoading(false);
      }
      const task = InteractionManager.runAfterInteractions(() => {
        void load();
      });
      return () => task.cancel();
    }, [applyMeds, load, user.id]),
  );

  const closeSheet = useCallback(() => {
    setSheetOpen(false);
    setEditingId(null);
    setSaveError("");
    setForm(emptyMedicationFormState());
  }, []);

  const openAdd = useCallback(() => {
    setForm(emptyMedicationFormState());
    setEditingId(null);
    setSaveError("");
    setSheetOpen(true);
  }, []);

  const handleSave = async (values: MedicationFormState) => {
    setSaveError("");
    setSaving(true);
    try {
      if (editingId) {
        const { error } = await supabase
          .from(TABLES.MEDICATIONS)
          .update(medicationUpdatePayloadFromForm(values))
          .eq("id", editingId)
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from(TABLES.MEDICATIONS).insert([medicationPayloadFromForm(values, user.id)]);
        if (error) throw error;
      }
      closeSheet();
      await load();
      invalidateDashboardSnapshot(user.id);
      await maybeRescheduleReminders(user.id);
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Could not save this medication.");
    } finally {
      setSaving(false);
    }
  };

  const listInitialLoad = loading;
  const listSectionTitle = "Your medications";

  medsRef.current = meds;

  const medById = useCallback((id: string) => meds.find((row) => String(row.id) === id), [meds]);

  const logsSection = (
    <LogHistoryCard style={{ marginBottom: 0 }}>
      <Text style={[logHistoryCardStyles.sectionTitle, { color: c.text }]}>{listSectionTitle}</Text>
      <View style={logHistoryCardStyles.trackerCardBody}>
        {listInitialLoad ? (
          <LogHistoryListLoading />
        ) : meds.length === 0 ? (
          <View style={styles.emptyWrap}>
            <View style={[styles.emptyIcon, { backgroundColor: c.surfaceSubtle }]}>
              <MaterialCommunityIcons name={MY_MEDS_MCI_ICON} size={28} color={c.primary} accessibilityIgnoresInvertColors />
            </View>
            <Text style={[styles.emptyTitle, { color: c.text }]}>Nothing here yet</Text>
            <Text style={[styles.emptySub, { color: c.textMuted }]}>
              Your medications will show here once you add them.
            </Text>
          </View>
        ) : (
          <LogHistoryList
            items={meds.map((row) => {
              const subtitle = medicationListSubtitle(row);
              const reminderLabel = medicationHasReminder(row)
                ? formatMedicationReminderTime(row.time_of_day)
                : null;
              return {
                id: String(row.id),
                title: row.name,
                subtitle: subtitle || undefined,
                accessibilityLabel: reminderLabel
                  ? `${row.name}. ${subtitle}. Reminder at ${reminderLabel}. View details`
                  : subtitle
                    ? `${row.name}. ${subtitle}. View details`
                    : `${row.name}. View details`,
              };
            })}
            renderSubtitle={(item) => {
              const row = medById(item.id);
              if (!row) return null;
              const dosage = row.dosage?.trim();
              const hasReminder = medicationHasReminder(row);
              const timeLabel = hasReminder ? formatMedicationReminderTime(row.time_of_day) : null;
              if (!dosage && !timeLabel) return null;
              const subtitleTextStyle = [logHistoryListStyles.logSecondary, { color: c.textMuted }];
              return (
                <View style={styles.medSubtitleRow}>
                  {dosage ? (
                    <Text style={subtitleTextStyle} numberOfLines={1}>
                      {dosage}
                      {timeLabel ? " · " : ""}
                    </Text>
                  ) : null}
                  {timeLabel ? (
                    <View style={styles.medReminderTimeRow}>
                      <WriggleReminderBell color={c.primary} />
                      <Text style={subtitleTextStyle} numberOfLines={1}>
                        {timeLabel}
                      </Text>
                    </View>
                  ) : null}
                </View>
              );
            }}
            onPressItem={(medId) => navigation.navigate("MedicationDetail", { id: medId })}
          />
        )}
      </View>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel="Having trouble with reminders"
        onPress={() => navigation.navigate("AccountHelp", { expandSection: "notifications" })}
        style={({ pressed }) => [styles.helpLinkPress, pressed && { opacity: 0.7 }]}
      >
        <Text style={[styles.helpLink, { color: c.text }]}>Having trouble?</Text>
      </Pressable>
    </LogHistoryCard>
  );

  return (
    <View style={[styles.screenRoot, { backgroundColor: c.screen }]}>
      <ScrollView
        style={styles.screenScroll}
        contentContainerStyle={{ paddingBottom: bottomScrollInset + 32 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.heroCard, { backgroundColor: c.card }]}>
          <View style={styles.heroTop}>
            <View style={styles.heroIcon}>
              <MaterialCommunityIcons name={MY_MEDS_MCI_ICON} size={28} color={c.primary} accessibilityIgnoresInvertColors />
            </View>
            <View style={styles.heroCopy}>
              <Text style={[styles.heroTitle, { color: c.text }]}>My medications</Text>
            </View>
          </View>
          <Text style={[styles.heroSub, { color: c.textMuted }]}>
            Add your medications and set reminders to stay on track.
          </Text>
          <PrimaryButton title="Add medication" onPress={openAdd} />
        </View>
        {logsSection}
      </ScrollView>

      <MedicationSheet
        visible={sheetOpen}
        editingId={editingId}
        initialValues={form}
        saving={saving}
        saveError={saveError}
        onClose={closeSheet}
        onSave={handleSave}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screenRoot: { flex: 1 },
  screenScroll: { flex: 1, padding: SCREEN_EDGE_PADDING },
  heroCard: { borderRadius: 14, padding: 14, marginBottom: 12 },
  heroTop: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 14 },
  heroIcon: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
  heroCopy: { flex: 1, minWidth: 0, justifyContent: "center" },
  heroTitle: {
    fontSize: FLARE_FONT_SIZE.sectionTitle,
    fontFamily: FLARE_FONT_FAMILY.bold,
    lineHeight: 42,
  },
  heroSub: {
    fontSize: FLARE_FONT_SIZE.body,
    fontFamily: FLARE_FONT_FAMILY.regular,
    lineHeight: FLARE_LINE_HEIGHT.body,
    marginBottom: 14,
  },
  emptyWrap: { alignItems: "center", paddingVertical: 14 },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SECTION_TITLE_MARGIN_BOTTOM,
  },
  emptyTitle: { fontSize: FLARE_FONT_SIZE.navTitle, fontFamily: FLARE_FONT_FAMILY.bold, marginBottom: 6 },
  emptySub: {
    fontSize: FLARE_FONT_SIZE.body,
    fontFamily: FLARE_FONT_FAMILY.regular,
    textAlign: "center",
    lineHeight: FLARE_LINE_HEIGHT.body,
  },
  medSubtitleRow: { flexDirection: "row", alignItems: "center", flexShrink: 1, minWidth: 0 },
  medReminderTimeRow: { flexDirection: "row", alignItems: "center", gap: 4, flexShrink: 1, minWidth: 0 },
  helpLinkPress: { alignSelf: "center", marginTop: 2, paddingVertical: 4 },
  helpLink: {
    fontSize: FLARE_FONT_SIZE.body,
    fontFamily: FLARE_FONT_FAMILY.regular,
    textDecorationLine: "underline",
  },
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
  sheetLead: {
    fontSize: FLARE_FONT_SIZE.body,
    fontFamily: FLARE_FONT_FAMILY.regular,
    lineHeight: FLARE_LINE_HEIGHT.body,
    marginBottom: 20,
  },
  pickerPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginTop: 6,
  },
  pickerPillText: { flex: 1, fontSize: FLARE_FONT_SIZE.body, fontFamily: FLARE_FONT_FAMILY.regular },
  notesInput: { minHeight: 88, textAlignVertical: "top" },
  saveError: { marginTop: 12 },
  sheetActions: { gap: 8, marginTop: 24 },
});
