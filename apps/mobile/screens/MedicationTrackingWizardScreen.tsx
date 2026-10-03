import { FLARE_CHROME_LUCIDE, FlareLucideIcon, FLARE_FEATURE_LUCIDE } from "../lib/flareLucideIcons";
import DateTimePicker from "@react-native-community/datetimepicker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { CommonActions, useNavigation, useRoute } from "@react-navigation/native";
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, BackHandler, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View, type ScrollView as RNScrollView } from "react-native";
import { showFlareAlert } from "../components/FlareAlertHost";
import { ScrollView } from "../lib/scrollViews";
import { OptionPickerModal } from "../components/OptionPickerModal";
import { Card } from "../components/MidnightLagoonCard";
import { Tray, TrayRow } from "../components/MidnightLagoonTray";
import { PrimaryButton, SecondaryButton } from "../components/FlareButton";
import { flareFieldErrorStyle, FlareInputTrigger, FlareTextInput } from "../components/FlareInput";
import { invalidateDashboardSnapshot } from "../lib/dashboardSnapshotCache";
import { formatUkDate } from "../lib/formatUkDate";
import { supabase, TABLES } from "../lib/supabase";
import { medicationWizardTryAdvance } from "../lib/medicationWizardNextStep";
import {
  cleanMedicationForm,
  cleanedMedicationHasNoData,
  createEmptyMedicationForm,
  createEmptyMedicationRow,
  getMedicationReviewEditStep,
  getMedicationReviewSectionLastStep,
  getMedicationWizardPhaseProgress,
  getPreviousMedicationStep,
  insertMedicationTrackingLog,
  MEDICATION_WIZARD_REVIEW_STEP,
  medicationLogRowToForm,
  updateMedicationTrackingLog,
  isDosageRowComplete,
  isMissedRowComplete,
  normalizeDosage,
  TIME_OF_DAY_OPTIONS,
  type MedicationListRow,
  type MedicationTrackingFormData,
  type MedicationReviewSectionId,
  type MedicationWizardHistoryEntry,
} from "../lib/medicationWizardShared";
import { TRACK_MEDICATIONS_ICON } from "../lib/medicationFeatureIcons";
import { SPACING, RADIUS, TYPOGRAPHY } from "../designTokens";
import { useFlareColors } from "../theme";

type SessionUser = { id: string };

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

const MEDICATION_REVIEW_STEP = MEDICATION_WIZARD_REVIEW_STEP;

export function MedicationTrackingWizardScreen({ user }: { user: SessionUser }) {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const editId = String((route.params as { editId?: string } | undefined)?.editId ?? "");
  const c = useFlareColors();
  const errTextStyle = flareFieldErrorStyle(c, "wizard");
  const { height: windowHeight } = useWindowDimensions();
  const [currentStep, setCurrentStep] = useState(0);
  const [form, setForm] = useState<MedicationTrackingFormData>(() => createEmptyMedicationForm());
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [history, setHistory] = useState<MedicationWizardHistoryEntry[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(Boolean(editId));
  const [datePicker, setDatePicker] = useState<DatePickerTarget>(null);
  const [timePicker, setTimePicker] = useState<TimePickerTarget>(null);
  const [pickerDraftDate, setPickerDraftDate] = useState<Date | null>(null);
  const [editingReviewSection, setEditingReviewSection] = useState<MedicationReviewSectionId | null>(null);
  const scrollRef = useRef<RNScrollView>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [currentStep]);

  useEffect(() => {
    return () => {
      void clearMedicationWizardStorage(user.id);
    };
  }, [user.id]);

  useEffect(() => {
    if (!editId) return;
    let cancelled = false;
    (async () => {
      setLoadingEdit(true);
      const { data, error } = await supabase.from(TABLES.LOG_MEDICATIONS).select("*").eq("user_id", user.id).eq("id", editId).maybeSingle();
      if (cancelled) return;
      if (error || !data) {
        showFlareAlert({ message: "Could not load entry", duration: 3000 });
        navigation.goBack();
        return;
      }
      setForm(medicationLogRowToForm(data as Record<string, unknown>));
      setCurrentStep(MEDICATION_REVIEW_STEP);
      setHistory([]);
      setLoadingEdit(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [editId, navigation, user.id]);

  const phase = useMemo(() => getMedicationWizardPhaseProgress(currentStep, form), [currentStep, form]);
  const cleanedForReview = useMemo(() => cleanMedicationForm(form), [form]);
  const reviewHasData = !cleanedMedicationHasNoData(cleanedForReview);

  const returnToReview = useCallback(() => {
    if (cleanedMedicationHasNoData(cleanMedicationForm(form))) {
      showFlareAlert({ message: "No tracking data entered", duration: 3000 });
      return;
    }
    setCurrentStep(MEDICATION_REVIEW_STEP);
    setEditingReviewSection(null);
    setFieldErrors({});
    setDatePicker(null);
    setPickerDraftDate(null);
    setTimePicker(null);
  }, [form]);

  const openReviewEdit = useCallback((section: MedicationReviewSectionId) => {
    setEditingReviewSection(section);
    setCurrentStep(getMedicationReviewEditStep(section));
    setFieldErrors({});
    setDatePicker(null);
    setPickerDraftDate(null);
    setTimePicker(null);
  }, []);

  const goBackInternal = useCallback(() => {
    if (currentStep === MEDICATION_REVIEW_STEP && !editingReviewSection) {
      navigation.goBack();
      return true;
    }
    if (editingReviewSection) {
      const entryStep = getMedicationReviewEditStep(editingReviewSection);
      if (currentStep === entryStep) {
        returnToReview();
        return true;
      }
      const previousStep = getPreviousMedicationStep(currentStep, form);
      if (previousStep != null && previousStep >= entryStep) {
        setCurrentStep(previousStep);
        setFieldErrors({});
        setDatePicker(null);
        setPickerDraftDate(null);
        setTimePicker(null);
        return true;
      }
      returnToReview();
      return true;
    }
    const prev = history[history.length - 1];
    if (prev) {
      if (prev.step <= 0) {
        navigation.goBack();
        return true;
      }
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
    if (previousStep != null && previousStep > 0) {
      setCurrentStep(previousStep);
      setFieldErrors({});
      setDatePicker(null);
      setPickerDraftDate(null);
      setTimePicker(null);
      return true;
    }
    navigation.goBack();
    return true;
  }, [currentStep, editingReviewSection, form, history, navigation, returnToReview]);

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", goBackInternal);
    return () => sub.remove();
  }, [goBackInternal]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: currentStep === MEDICATION_REVIEW_STEP && !editingReviewSection ? "Review" : "",
    });
  }, [navigation, currentStep, editingReviewSection]);

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
        showFlareAlert({ message: "No tracking data entered", duration: 3000 });
        return;
      }
      setFieldErrors(res.fieldErrors);
      return;
    }
    setFieldErrors({});
    if (editingReviewSection) {
      const sectionLast = getMedicationReviewSectionLastStep(editingReviewSection, form);
      if (res.nextStep > sectionLast) {
        returnToReview();
        return;
      }
      setCurrentStep(res.nextStep);
      return;
    }
    if (res.nextStep === MEDICATION_REVIEW_STEP) {
      setEditingReviewSection(null);
    }
    setHistory((h) => [...h, { step: currentStep, form: cloneForm(form) }]);
    setCurrentStep(res.nextStep);
  }, [currentStep, editingReviewSection, form, returnToReview]);

  const startWizard = () => {
    setHistory([{ step: 0, form: cloneForm(form) }]);
    setCurrentStep(1);
  };

  const submit = async () => {
    const cleaned = cleanMedicationForm(form);
    if (cleanedMedicationHasNoData(cleaned)) {
      showFlareAlert({ message: "No tracking data entered", duration: 3000 });
      return;
    }
    setSubmitting(true);
    try {
      if (editId) {
        await updateMedicationTrackingLog(user.id, editId, cleaned);
      } else {
        await insertMedicationTrackingLog(user.id, cleaned);
      }
      await clearMedicationWizardStorage(user.id);
      invalidateDashboardSnapshot(user.id);
      if (editId) {
        navigation.goBack();
        showFlareAlert({ message: "Saved", duration: 2000 });
      } else {
        navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: "Dashboard" }] }));
        showFlareAlert({ message: "Saved", duration: 2000 });
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Unknown error";
      showFlareAlert({ message, duration: 3000 });
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
    const errKey = kind === "missed" ? "missedMedicationsList" : kind === "nsaid" ? "nsaidList" : "antibioticList";
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

  const renderYesNo = (field: "missedMedications" | "nsaidUsage" | "antibioticUsage", title: string) => (
    <View>
      <Text style={[styles.stepTitle, { color: c.text, fontFamily: TYPOGRAPHY.fontFamily.semibold }]}>{title}</Text>
      <View style={styles.optionList}>
        <Pressable style={styles.radioRow} onPress={() => setYesNo(field, true)}>
          <View style={[styles.radioOuter, { borderColor: c.border }]}>
            {form[field] === true ? <View style={[styles.radioInner, { backgroundColor: c.primary }]} /> : null}
          </View>
          <Text style={[styles.radioLabel, { color: c.text, fontFamily: TYPOGRAPHY.fontFamily.regular }]}>Yes</Text>
        </Pressable>
        <Pressable style={styles.radioRow} onPress={() => setYesNo(field, false)}>
          <View style={[styles.radioOuter, { borderColor: c.border }]}>
            {form[field] === false ? <View style={[styles.radioInner, { backgroundColor: c.primary }]} /> : null}
          </View>
          <Text style={[styles.radioLabel, { color: c.text, fontFamily: TYPOGRAPHY.fontFamily.regular }]}>No</Text>
        </Pressable>
      </View>
      {fieldErrors[field] ? <Text style={errTextStyle}>{fieldErrors[field]}</Text> : null}
    </View>
  );

  const renderMedicationList = (kind: ListKind, title: string, withDosage: boolean, errKey: string) => {
    const key = listKey(kind);
    const list = form[key];
    const last = list[list.length - 1];
    const canAdd = withDosage ? isDosageRowComplete(last) : isMissedRowComplete(last);

    return (
      <View>
        <Text style={[styles.stepTitle, { color: c.text, fontFamily: TYPOGRAPHY.fontFamily.semibold }]}>{title}</Text>
        {list.map((item, i) => (
          <View key={i} style={styles.listEntry}>
            <View style={styles.medNameDoseRow}>
              <FlareTextInput fieldIcon="pill" placeholder="" value={item.medication} onChangeText={(t) => updateListRow(kind, i, "medication", t)} style={styles.medNameInput} />
              {withDosage ? <FlareTextInput trailingLabel="mg" placeholder="" keyboardType="number-pad" value={item.dosage ?? ""} maxLength={5} onChangeText={(t) => updateListRow(kind, i, "dosage", t)} style={styles.medDoseInput} accessibilityLabel="Dose in milligrams" /> : null}
            </View>
            <FlareInputTrigger pickerIcon="date" onPress={() => openDatePicker(kind, i)}>
              <Text style={[styles.triggerText, { color: item.date ? c.text : c.textSecondary, fontFamily: TYPOGRAPHY.fontFamily.regular }]}>{item.date ? formatUkDate(item.date) : ""}</Text>
            </FlareInputTrigger>
            <FlareInputTrigger pickerIcon="time" onPress={() => openTimePicker(kind, i)}>
              <Text style={[styles.triggerText, { color: item.timeOfDay ? c.text : c.textSecondary, fontFamily: TYPOGRAPHY.fontFamily.regular }]}>{item.timeOfDay || ""}</Text>
            </FlareInputTrigger>
            {list.length > 1 ? (
              <Pressable accessibilityRole="button" accessibilityLabel="Remove medication" hitSlop={8} onPress={() => removeListRow(kind, i)} style={styles.removeLink}>
                <Text style={[styles.removeLinkText, { color: c.textSecondary, fontFamily: TYPOGRAPHY.fontFamily.semibold }]}>Remove</Text>
              </Pressable>
            ) : null}
          </View>
        ))}
        <Pressable accessibilityRole="button" disabled={!canAdd} onPress={() => canAdd && addListRow(kind)} hitSlop={10} style={styles.addLink}>
          <Text style={[styles.addLinkText, { color: c.primary, fontFamily: TYPOGRAPHY.fontFamily.bold, opacity: canAdd ? 1 : 0.45 }]}>Add medication</Text>
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
            {Platform.OS === "ios" ? <PrimaryButton label="Done" onPress={commitPickerDate} /> : null}
          </>
        ) : null}
      </View>
    );
  };

  if (loadingEdit) {
    return (
      <View style={[styles.centered, { backgroundColor: c.screen }]}>
        <ActivityIndicator color={c.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={[styles.screen, { backgroundColor: c.screen }]} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView ref={scrollRef} contentContainerStyle={[styles.scrollContent, currentStep === 0 && styles.scrollContentLanding]} keyboardShouldPersistTaps="handled">
        {currentStep > 0 && phase.sectionTotal > 0 ? (
          <Text style={[styles.phaseLine, { color: c.textSecondary, fontFamily: TYPOGRAPHY.fontFamily.medium }]}>
            Section {phase.sectionStep}/{phase.sectionTotal}: {phase.currentPhaseLabel}
          </Text>
        ) : null}

        {currentStep === 0 ? (
          <View style={[styles.landing, { minHeight: Math.max(windowHeight * 0.58, 420) }]}>
            <View style={[styles.landingIconPanel, { backgroundColor: c.card }]}>
              <FlareLucideIcon icon={TRACK_MEDICATIONS_ICON} size={28} color={c.primary} />
            </View>
            <Text style={[styles.landingTitle, { color: c.text, fontFamily: TYPOGRAPHY.fontFamily.bold }]}>Track Medications</Text>
            <Text style={[styles.landingSub, { color: c.textSecondary, fontFamily: TYPOGRAPHY.fontFamily.regular }]}>Capture medication events that could be important to your IBD care.</Text>
            <View style={styles.landingCta}>
              <PrimaryButton label="Start now" onPress={startWizard} />
            </View>
          </View>
        ) : null}

        {currentStep === 1 ? renderYesNo("missedMedications", "Did you miss any medications?") : null}
        {currentStep === 2 ? renderMedicationList("missed", "Please list any medications you missed below", false, "missedMedicationsList") : null}
        {currentStep === 3 ? renderYesNo("nsaidUsage", "Did you take any NSAIDs recently?") : null}
        {currentStep === 4 ? renderMedicationList("nsaid", "Please list any NSAIDs you have taken recently", true, "nsaidList") : null}
        {currentStep === 5 ? renderYesNo("antibioticUsage", "Did you take any antibiotics recently?") : null}
        {currentStep === 6 ? renderMedicationList("antibiotic", "Please list any antibiotics you have taken recently", true, "antibioticList") : null}

        {currentStep === 7 ? (
          <Card>
            <View style={styles.reviewSections}>
              {cleanedForReview.missedMedicationsList.length > 0 ? (
                <View>
                  <Text style={[styles.reviewSectionTitle, { color: c.text, fontFamily: TYPOGRAPHY.fontFamily.semibold }]}>Missed Medications</Text>
                  <Tray>
                    {cleanedForReview.missedMedicationsList.map((item, idx) => (
                      <TrayRow key={idx} icon={FLARE_FEATURE_LUCIDE.meds} label={item.medication} sublabel={`${formatUkDate(item.date)} at ${item.timeOfDay}`} />
                    ))}
                  </Tray>
                  <Pressable onPress={() => openReviewEdit("missed")}>
                    <Text style={[styles.editLink, { color: c.primary, fontFamily: TYPOGRAPHY.fontFamily.semibold }]}>Edit</Text>
                  </Pressable>
                </View>
              ) : null}
              {cleanedForReview.nsaidList.length > 0 ? (
                <View>
                  <Text style={[styles.reviewSectionTitle, { color: c.text, fontFamily: TYPOGRAPHY.fontFamily.semibold }]}>NSAIDs Taken</Text>
                  <Tray>
                    {cleanedForReview.nsaidList.map((item, idx) => (
                      <TrayRow key={idx} icon={FLARE_FEATURE_LUCIDE.meds} label={`${item.medication} ${item.dosage}mg`} sublabel={`${formatUkDate(item.date)} at ${item.timeOfDay}`} />
                    ))}
                  </Tray>
                  <Pressable onPress={() => openReviewEdit("nsaid")}>
                    <Text style={[styles.editLink, { color: c.primary, fontFamily: TYPOGRAPHY.fontFamily.semibold }]}>Edit</Text>
                  </Pressable>
                </View>
              ) : null}
              {cleanedForReview.antibioticList.length > 0 ? (
                <View>
                  <Text style={[styles.reviewSectionTitle, { color: c.text, fontFamily: TYPOGRAPHY.fontFamily.semibold }]}>Antibiotics Taken</Text>
                  <Tray>
                    {cleanedForReview.antibioticList.map((item, idx) => (
                      <TrayRow key={idx} icon={FLARE_FEATURE_LUCIDE.meds} label={`${item.medication} ${item.dosage}mg`} sublabel={`${formatUkDate(item.date)} at ${item.timeOfDay}`} />
                    ))}
                  </Tray>
                  <Pressable onPress={() => openReviewEdit("antibiotic")}>
                    <Text style={[styles.editLink, { color: c.primary, fontFamily: TYPOGRAPHY.fontFamily.semibold }]}>Edit</Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
            <View style={styles.reviewSubmit}>
              <PrimaryButton label={submitting ? "Saving…" : editId ? "Save changes" : "Submit"} onPress={submit} disabled={submitting || !reviewHasData} />
            </View>
          </Card>
        ) : null}

        {currentStep > 0 && !(currentStep === MEDICATION_REVIEW_STEP && !editingReviewSection) ? (
          <View style={styles.footerBtns}>
            {editingReviewSection ? (
              <>
                <PrimaryButton label="Back to review" onPress={returnToReview} />
                {currentStep < getMedicationReviewSectionLastStep(editingReviewSection, form) ? <SecondaryButton label="Next" onPress={applyAdvance} /> : null}
              </>
            ) : (
              <PrimaryButton label="Next" onPress={applyAdvance} />
            )}
            {currentStep > 1 && !editingReviewSection ? <SecondaryButton label="Prev" onPress={goBackInternal} /> : null}
          </View>
        ) : null}

        {currentStep === 3 ? (
          <Pressable accessibilityRole="link" accessibilityLabel="What are NSAIDs" onPress={() => navigation.navigate("AccountHelp", { expandSection: "nsaids" })} style={({ pressed }) => [styles.helpLink, pressed && { opacity: 0.7 }]}>
            <Text style={[styles.helpLinkText, { color: c.text, fontFamily: TYPOGRAPHY.fontFamily.regular }]}>What are NSAIDs?</Text>
          </Pressable>
        ) : null}
      </ScrollView>

      <OptionPickerModal visible={timePicker != null} options={TIME_OF_DAY_OPTIONS} selectedOption={timePicker ? form[listKey(timePicker.list)][timePicker.index]?.timeOfDay ?? "" : ""} onSelect={selectTimeOfDay} onClose={closeTimePicker} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scrollContent: {
    paddingHorizontal: SPACING.screen,
    paddingTop: SPACING.lg,
    paddingBottom: 100,
  },
  scrollContentLanding: {
    flexGrow: 1,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  phaseLine: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    marginBottom: SPACING.md,
  },
  landing: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: SPACING.xl,
  },
  landingIconPanel: {
    width: 56,
    height: 56,
    borderRadius: RADIUS.card,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.xl,
  },
  landingTitle: {
    fontSize: TYPOGRAPHY.fontSize.xxl,
    lineHeight: 28,
    marginBottom: SPACING.lg,
    textAlign: "center",
    letterSpacing: -0.4,
    maxWidth: 360,
  },
  landingSub: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    lineHeight: 26,
    textAlign: "center",
    marginBottom: SPACING.xl,
    maxWidth: 360,
  },
  landingCta: {
    width: "100%",
    maxWidth: 360,
  },
  stepTitle: {
    fontSize: TYPOGRAPHY.fontSize.cardTitle,
    marginBottom: SPACING.md,
  },
  optionList: {
    gap: SPACING.md,
  },
  radioRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  radioLabel: {
    fontSize: TYPOGRAPHY.fontSize.md,
  },
  listEntry: {
    marginBottom: SPACING.md,
  },
  medNameDoseRow: {
    flexDirection: "row",
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  medNameInput: {
    flex: 1,
    marginTop: 0,
  },
  medDoseInput: {
    width: 100,
    marginTop: 0,
  },
  triggerText: {
    fontSize: TYPOGRAPHY.fontSize.md,
  },
  removeLink: {
    marginTop: SPACING.xs,
    alignSelf: "flex-end",
  },
  removeLinkText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
  },
  addLink: {
    marginTop: SPACING.sm,
    alignSelf: "flex-start",
  },
  addLinkText: {
    fontSize: TYPOGRAPHY.fontSize.md,
  },
  reviewSections: {
    gap: SPACING.lg,
  },
  reviewSectionTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    marginBottom: SPACING.sm,
  },
  editLink: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    marginTop: SPACING.xs,
  },
  reviewSubmit: {
    marginTop: SPACING.lg,
  },
  footerBtns: {
    marginTop: SPACING.lg,
    gap: SPACING.md,
  },
  helpLink: {
    marginTop: SPACING.lg,
  },
  helpLinkText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    textDecorationLine: "underline",
  },
});
