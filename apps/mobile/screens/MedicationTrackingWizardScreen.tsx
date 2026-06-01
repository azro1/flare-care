import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { CommonActions, useNavigation } from "@react-navigation/native";
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import {
  Alert,
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { OptionPickerModal } from "../components/OptionPickerModal";
import { SymptomReviewCard, SymptomReviewField, SymptomReviewGrid } from "../components/symptomReviewLayout";
import { PrimaryButton, SecondaryButton } from "../components/FlareButton";
import { flareFieldErrorStyle, FlareInputTrigger, FlareTextInput } from "../components/FlareInput";
import { invalidateDashboardSnapshot } from "../lib/dashboardSnapshotCache";
import { formatUkDate } from "../lib/formatUkDate";
import { medicationWizardTryAdvance } from "../lib/medicationWizardNextStep";
import {
  cleanMedicationForm,
  createEmptyMedicationForm,
  createEmptyMedicationRow,
  getMedicationWizardPhaseProgress,
  getPreviousMedicationStep,
  insertMedicationTrackingLog,
  isDosageRowComplete,
  isMissedRowComplete,
  normalizeDosage,
  TIME_OF_DAY_OPTIONS,
  type MedicationListRow,
  type MedicationTrackingFormData,
  type MedicationWizardHistoryEntry,
} from "../lib/medicationWizardShared";
import { useFlareColors, useFlareTheme } from "../theme";

type SessionUser = { id: string };

/** Cleared on leave/submit — no draft resume (matches web medication track unmount). */
function medicationWizardStorageKeys(userId: string) {
  return [
    `medication-wizard-mobile-step:${userId}`,
    `medication-wizard-mobile-form:${userId}`,
    `medication-wizard-mobile-history:${userId}`,
    `medication-wizard-step:${userId}`,
    `medication-wizard-form:${userId}`,
  ];
}

async function clearMedicationWizardStorage(userId: string) {
  await AsyncStorage.multiRemove(medicationWizardStorageKeys(userId));
}

type ListKind = "missed" | "nsaid" | "antibiotic";
type DatePickerTarget = { list: ListKind; index: number } | null;
type TimePickerTarget = { list: ListKind; index: number } | null;

function cloneForm(f: MedicationTrackingFormData): MedicationTrackingFormData {
  return JSON.parse(JSON.stringify(f)) as MedicationTrackingFormData;
}

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

function isAndroidDatePickerDismissed(event: { type?: string }): boolean {
  return Platform.OS === "android" && event.type === "dismissed";
}

function listKey(kind: ListKind): "missedMedicationsList" | "nsaidList" | "antibioticList" {
  if (kind === "missed") return "missedMedicationsList";
  if (kind === "nsaid") return "nsaidList";
  return "antibioticList";
}

export function MedicationTrackingWizardScreen({ user }: { user: SessionUser }) {
  const navigation = useNavigation<any>();
  const c = useFlareColors();
  const errTextStyle = flareFieldErrorStyle(c, "wizard");
  const { colors } = useFlareTheme();
  const { height: windowHeight } = useWindowDimensions();
  const [currentStep, setCurrentStep] = useState(0);
  const [form, setForm] = useState<MedicationTrackingFormData>(() => createEmptyMedicationForm());
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [history, setHistory] = useState<MedicationWizardHistoryEntry[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [datePicker, setDatePicker] = useState<DatePickerTarget>(null);
  const [timePicker, setTimePicker] = useState<TimePickerTarget>(null);
  /** Spinner/dialog value only — do not write to form until user confirms (avoids defaulting to today). */
  const [pickerDraftDate, setPickerDraftDate] = useState<Date | null>(null);

  useEffect(() => {
    return () => {
      void clearMedicationWizardStorage(user.id);
    };
  }, [user.id]);

  const phase = useMemo(() => getMedicationWizardPhaseProgress(currentStep, form), [currentStep]);

  const canGoToPreviousStep = useMemo(() => {
    if (currentStep <= 0) return false;
    if (history.length > 0) return true;
    return getPreviousMedicationStep(currentStep, form) != null;
  }, [currentStep, form, history.length]);

  const cleanedForReview = useMemo(() => cleanMedicationForm(form), [form]);

  const goBackInternal = useCallback(() => {
    const prev = history[history.length - 1];
    if (prev) {
      setHistory((h) => h.slice(0, -1));
      setCurrentStep(prev.step);
      setForm(prev.form);
      setFieldErrors({});
      setDatePicker(null);
      setPickerDraftDate(null);
      setTimePicker(null);
      return true;
    }
    const previousStep = getPreviousMedicationStep(currentStep, form);
    if (previousStep != null) {
      setCurrentStep(previousStep);
      setFieldErrors({});
      setDatePicker(null);
      setPickerDraftDate(null);
      setTimePicker(null);
      return true;
    }
    navigation.goBack();
    return true;
  }, [history, navigation, currentStep, form]);

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", goBackInternal);
    return () => sub.remove();
  }, [goBackInternal]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: "",
      headerLeft: () => (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={{ top: 10, bottom: 10, left: 8, right: 20 }}
          onPress={() => {
            if (currentStep > 0) goBackInternal();
            else navigation.goBack();
          }}
          style={styles.headerBackButton}
        >
          <Ionicons name="chevron-back" size={24} color={colors.primary} />
        </Pressable>
      ),
    });
  }, [navigation, currentStep, goBackInternal, colors.primary]);

  const resetToLanding = () => {
    setCurrentStep(0);
    setForm(createEmptyMedicationForm());
    setHistory([]);
    setFieldErrors({});
    setDatePicker(null);
    setPickerDraftDate(null);
    setTimePicker(null);
  };

  const openDatePicker = (kind: ListKind, index: number) => {
    const row = form[listKey(kind)][index];
    setPickerDraftDate(row?.date ? parseYmd(row.date) : new Date());
    setDatePicker({ list: kind, index });
  };

  const applyAdvance = useCallback(() => {
    const res = medicationWizardTryAdvance({ currentStep, form });
    if (!res.ok) {
      if (res.noData) {
        Alert.alert(
          "No tracking data entered",
          "You must add at least one medication in order to log this entry.",
          [{ text: "Back to start", onPress: resetToLanding }],
        );
        return;
      }
      setFieldErrors(res.fieldErrors);
      return;
    }
    setFieldErrors({});
    setHistory((h) => [...h, { step: currentStep, form: cloneForm(form) }]);
    setCurrentStep(res.nextStep);
  }, [currentStep, form]);

  const startWizard = () => {
    setHistory([{ step: 0, form: cloneForm(form) }]);
    setCurrentStep(1);
  };

  const submit = async () => {
    const cleaned = cleanMedicationForm(form);
    setSubmitting(true);
    try {
      await insertMedicationTrackingLog(user.id, cleaned);
      await clearMedicationWizardStorage(user.id);
      invalidateDashboardSnapshot(user.id);
      navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: "Dashboard" }] }));
      Alert.alert("Saved", "Your medication tracking entry was saved.");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Unknown error";
      Alert.alert("Could not save", message);
    } finally {
      setSubmitting(false);
    }
  };

  const setYesNo = (field: "missedMedications" | "nsaidUsage" | "antibioticUsage", value: boolean) => {
    setForm((p) => ({ ...p, [field]: value }));
    setFieldErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const openTimePicker = (kind: ListKind, index: number) => {
    setTimePicker({ list: kind, index });
  };

  const closeTimePicker = () => setTimePicker(null);

  const selectTimeOfDay = (value: string) => {
    if (!timePicker) return;
    updateListRow(timePicker.list, timePicker.index, "timeOfDay", value);
    closeTimePicker();
  };

  const updateListRow = (kind: ListKind, index: number, field: keyof MedicationListRow, value: string) => {
    const key = listKey(kind);
    setForm((p) => ({
      ...p,
      [key]: p[key].map((row, j) => {
        if (j !== index) return row;
        if (field === "date") return { ...row, date: value, dateTouched: true };
        if (field === "dosage") return { ...row, dosage: normalizeDosage(value) };
        return { ...row, [field]: value };
      }),
    }));
    const errKey =
      kind === "missed" ? "missedMedicationsList" : kind === "nsaid" ? "nsaidList" : "antibioticList";
    setFieldErrors((prev) => ({ ...prev, [errKey]: "" }));
  };

  const commitPickerDate = () => {
    if (!datePicker || !pickerDraftDate) {
      setDatePicker(null);
      setPickerDraftDate(null);
      return;
    }
    updateListRow(datePicker.list, datePicker.index, "date", toYmd(pickerDraftDate));
    setDatePicker(null);
    setPickerDraftDate(null);
  };

  const addListRow = (kind: ListKind) => {
    const key = listKey(kind);
    const withDosage = kind !== "missed";
    setForm((p) => ({ ...p, [key]: [...p[key], createEmptyMedicationRow(withDosage)] }));
  };

  const removeListRow = (kind: ListKind, index: number) => {
    const key = listKey(kind);
    setForm((p) => {
      const list = p[key];
      if (list.length <= 1) return { ...p, [key]: [createEmptyMedicationRow(kind !== "missed")] };
      return { ...p, [key]: list.filter((_, j) => j !== index) };
    });
  };

  const renderYesNo = (
    field: "missedMedications" | "nsaidUsage" | "antibioticUsage",
    title: string,
  ) => (
    <View>
      <Text style={[styles.h3, { color: c.text }]}>{title}</Text>
      <View style={styles.rowGap}>
        <Pressable style={styles.radioRow} onPress={() => setYesNo(field, true)}>
          <View style={[styles.radioOuter, { borderColor: c.cardBorder }]}>
            {form[field] === true ? <View style={[styles.radioInner, { backgroundColor: c.primary }]} /> : null}
          </View>
          <Text style={{ color: c.text }}>Yes</Text>
        </Pressable>
        <Pressable style={styles.radioRow} onPress={() => setYesNo(field, false)}>
          <View style={[styles.radioOuter, { borderColor: c.cardBorder }]}>
            {form[field] === false ? <View style={[styles.radioInner, { backgroundColor: c.primary }]} /> : null}
          </View>
          <Text style={{ color: c.text }}>No</Text>
        </Pressable>
      </View>
      {fieldErrors[field] ? <Text style={errTextStyle}>{fieldErrors[field]}</Text> : null}
    </View>
  );

  const renderMedicationList = (
    kind: ListKind,
    title: string,
    withDosage: boolean,
    errKey: string,
  ) => {
    const key = listKey(kind);
    const list = form[key];
    const last = list[list.length - 1];
    const canAdd = withDosage ? isDosageRowComplete(last) : isMissedRowComplete(last);

    return (
      <View>
        <Text style={[styles.h3, { color: c.text }]}>{title}</Text>
        {list.map((item, i) => (
          <View key={i} style={[styles.listEntryWrap, i === 0 ? styles.listEntryWrapFirst : null]}>
            <View style={styles.listMedRow}>
              <FlareTextInput
                placeholder="Medication"
                value={item.medication}
                onChangeText={(t) => updateListRow(kind, i, "medication", t)}
                style={{ marginTop: 0, paddingRight: 30 }}
              />
              {list.length > 1 ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Remove medication"
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  onPress={() => removeListRow(kind, i)}
                  style={[styles.listRemoveBtn, { backgroundColor: c.destructiveFill }]}
                >
                  <Ionicons name="close" size={14} color={c.white} />
                </Pressable>
              ) : null}
            </View>
            <FlareInputTrigger pickerIcon="date" onPress={() => openDatePicker(kind, i)}>
              <Text style={{ color: item.date ? c.text : c.textMuted }}>
                {item.date ? formatUkDate(item.date) : "dd/mm/yyyy"}
              </Text>
            </FlareInputTrigger>
            <FlareInputTrigger pickerIcon="time" onPress={() => openTimePicker(kind, i)}>
              <Text style={{ color: item.timeOfDay ? c.text : c.textMuted }}>
                {item.timeOfDay || "Select time of day"}
              </Text>
            </FlareInputTrigger>
            {withDosage ? (
              <FlareTextInput
                placeholder="50mg"
                keyboardType="number-pad"
                value={item.dosage ?? ""}
                maxLength={5}
                onChangeText={(t) => updateListRow(kind, i, "dosage", t)}
              />
            ) : null}
          </View>
        ))}
        <Pressable
          accessibilityRole="button"
          disabled={!canAdd}
          onPress={() => canAdd && addListRow(kind)}
          style={{ marginBottom: 8, alignSelf: "flex-start", opacity: canAdd ? 1 : 0.45 }}
        >
          <Text style={{ color: c.primary, fontFamily: "Inter_700Bold" }}>Add medication</Text>
        </Pressable>
        {fieldErrors[errKey] ? <Text style={errTextStyle}>{fieldErrors[errKey]}</Text> : null}
        {datePicker?.list === kind && datePicker.index >= 0 && pickerDraftDate ? (
          <>
            <DateTimePicker
              value={pickerDraftDate}
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              maximumDate={new Date()}
              onChange={(event, d) => {
                if (Platform.OS === "android") {
                  setDatePicker(null);
                  setPickerDraftDate(null);
                  if (isAndroidDatePickerDismissed(event)) return;
                  if (event.type === "set" && d) {
                    updateListRow(kind, datePicker.index, "date", toYmd(d));
                  }
                  return;
                }
                if (d) setPickerDraftDate(d);
              }}
            />
            {Platform.OS === "ios" ? <PrimaryButton title="Done" onPress={commitPickerDate} /> : null}
          </>
        ) : null}
      </View>
    );
  };

  const renderReviewListSection = (
    title: string,
    items: { medication: string; date: string; timeOfDay: string; dosage?: string }[],
    showDosage: boolean,
  ) => {
    if (!items.length) return null;
    return (
      <SymptomReviewCard title={title}>
        {items.map((item, index) => (
          <View
            key={`${item.medication}-${index}`}
            style={
              index < items.length - 1
                ? {
                    borderBottomWidth: StyleSheet.hairlineWidth,
                    borderBottomColor: c.cardBorder,
                    paddingBottom: 14,
                    marginBottom: 14,
                  }
                : undefined
            }
          >
            <SymptomReviewGrid>
              <SymptomReviewField label="Medication" value={item.medication} />
              {showDosage ? (
                <SymptomReviewField label="Dosage" value={item.dosage || "N/A"} />
              ) : null}
              <SymptomReviewField label="Date" value={item.date ? formatUkDate(item.date) : "N/A"} />
              <SymptomReviewField label="Time of Day" value={item.timeOfDay || "N/A"} />
            </SymptomReviewGrid>
          </View>
        ))}
      </SymptomReviewCard>
    );
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.screen }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollPad,
          currentStep === 0 ? styles.scrollPadLanding : styles.scrollPadWizardSteps,
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {currentStep > 0 && phase.sectionTotal > 0 ? (
          <Text style={[styles.phaseLine, { color: c.textMuted }]}>
            Section {phase.sectionStep}/{phase.sectionTotal}: {phase.currentPhaseLabel}
          </Text>
        ) : null}

        {currentStep === 0 ? (
          <View style={[styles.landing, { minHeight: Math.max(windowHeight * 0.58, 420) }]}>
            <View
              style={[
                styles.landingIconPanel,
                {
                  backgroundColor: c.card,
                  ...Platform.select({
                    ios: {
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: c.isDark ? 0.3 : 0.05,
                      shadowRadius: 2,
                    },
                    android: { elevation: 2 },
                  }),
                },
              ]}
            >
              <MaterialCommunityIcons name="pill" size={28} color={c.primary} />
            </View>
            <Text style={[styles.landingTitle, { color: c.text }]}>Track Medications</Text>
            <Text style={[styles.landingSub, { color: c.textMuted }]}>
              Track your medication adherence to identify patterns and triggers
            </Text>
            <View style={styles.landingCta}>
              <PrimaryButton title="Start now" onPress={startWizard} />
            </View>
          </View>
        ) : null}

        {currentStep === 1
          ? renderYesNo("missedMedications", "Did you miss any prescribed medications recently?")
          : null}
        {currentStep === 2 ? renderMedicationList("missed", "Which medications did you miss?", false, "missedMedicationsList") : null}
        {currentStep === 3
          ? renderYesNo("nsaidUsage", "Did you take any NSAIDs (ibuprofen, naproxen, aspirin) recently?")
          : null}
        {currentStep === 4 ? renderMedicationList("nsaid", "Which NSAIDs did you take?", true, "nsaidList") : null}
        {currentStep === 5 ? renderYesNo("antibioticUsage", "Did you take any antibiotics recently?") : null}
        {currentStep === 6 ? renderMedicationList("antibiotic", "Which antibiotics did you take?", true, "antibioticList") : null}

        {currentStep === 7 ? (
          <View>
            <Text style={[styles.h3, { color: c.text, marginBottom: 16 }]}>Review your entry</Text>
            {renderReviewListSection("Missed Medications", cleanedForReview.missedMedicationsList, false)}
            {renderReviewListSection("NSAIDs Taken", cleanedForReview.nsaidList, true)}
            {renderReviewListSection("Antibiotics Taken", cleanedForReview.antibioticList, true)}
          </View>
        ) : null}

        {currentStep > 0 ? (
          <View style={styles.footerBtns}>
            {currentStep < 7 ? (
              <PrimaryButton title="Next" onPress={applyAdvance} />
            ) : (
              <PrimaryButton title={submitting ? "Saving…" : "Submit"} onPress={submit} disabled={submitting} />
            )}
            {canGoToPreviousStep ? <SecondaryButton title="Previous step" onPress={goBackInternal} /> : null}
          </View>
        ) : null}
      </ScrollView>

      <OptionPickerModal
        visible={timePicker != null}
        options={TIME_OF_DAY_OPTIONS}
        onSelect={selectTimeOfDay}
        onCancel={closeTimePicker}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  headerBackButton: {
    justifyContent: "center",
    alignItems: "flex-start",
    paddingVertical: 8,
    paddingLeft: Platform.OS === "ios" ? 6 : 4,
    paddingRight: 10,
    minHeight: 44,
  },
  scrollPad: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 48 },
  scrollPadLanding: { flexGrow: 1 },
  scrollPadWizardSteps: { paddingTop: 12 },
  landing: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 32,
  },
  landingIconPanel: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  landingTitle: {
    fontFamily: "Inter_800ExtraBold",
    fontSize: 24,
    lineHeight: 30,
    marginBottom: 14,
    textAlign: "center",
    letterSpacing: -0.4,
  },
  landingSub: { fontSize: 16, lineHeight: 24, textAlign: "center", marginBottom: 6, maxWidth: 360, paddingHorizontal: 4 },
  landingCta: { width: "100%", maxWidth: 360, marginTop: 20 },
  phaseLine: { fontSize: 13, marginBottom: 12, fontFamily: "Inter_500Medium" },
  h3: { fontFamily: "Inter_700Bold", fontSize: 20, marginBottom: 12 },
  rowGap: { gap: 14, marginTop: 8 },
  radioRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  radioOuter: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  radioInner: { width: 12, height: 12, borderRadius: 6 },
  listEntryWrap: { marginBottom: 12 },
  listEntryWrapFirst: { paddingTop: 4 },
  listMedRow: { position: "relative", overflow: "visible" },
  listRemoveBtn: {
    position: "absolute",
    top: -7,
    right: -7,
    zIndex: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({ android: { elevation: 4 }, ios: {} }),
  },
  footerBtns: { marginTop: 24, gap: 10 },
});
