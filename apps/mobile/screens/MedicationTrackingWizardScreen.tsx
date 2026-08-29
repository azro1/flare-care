import { FlareLucideIcon } from "../lib/flareLucideIcons";
import DateTimePicker from "@react-native-community/datetimepicker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { CommonActions, useNavigation, useRoute } from "@react-navigation/native";
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
    BackHandler,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { showFlareAlert } from "../components/FlareAlertHost";
import { ScrollView } from "../lib/scrollViews";
import { OptionPickerModal } from "../components/OptionPickerModal";
import { WizardReviewMedicationSection } from "../components/symptomReviewLayout";
import { EntryPrimaryButton, PrimaryButton, SecondaryButton } from "../components/FlareButton";
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
import { useFlareColors } from "../theme";
import {
  FULL_WIDTH_CTA_EDGE_PADDING,
  HELP_NAV_LINK_BELOW_ACTIONS_MARGIN_TOP,
  HELP_NAV_LINK_LABEL,
  HELP_NAV_LINK_PRESS,
  LANDING_CTA_SIDE_PAD,
  QUESTIONNAIRE_STEP_FOOTER,
  QUESTIONNAIRE_STEP_OPTION_LIST,
  QUESTIONNAIRE_STEP_RADIO_ROW,
  QUESTIONNAIRE_STEP_SCROLL,
  QUESTIONNAIRE_STEP_SCROLL_BOTTOM,
  QUESTIONNAIRE_STEP_TITLE,
} from "../lib/layoutConstants";

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
  /** Spinner/dialog value only — do not write to form until user confirms (avoids defaulting to today). */
  const [pickerDraftDate, setPickerDraftDate] = useState<Date | null>(null);
  const [editingReviewSection, setEditingReviewSection] = useState<MedicationReviewSectionId | null>(null);

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
      const { data, error } = await supabase
        .from(TABLES.LOG_MEDICATIONS)
        .select("*")
        .eq("user_id", user.id)
        .eq("id", editId)
        .maybeSingle();
      if (cancelled) return;
      if (error || !data) {
        showFlareAlert("Could not load entry", "This medication log could not be opened for editing.");
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
      showFlareAlert(
        "No tracking data entered",
        "You must add at least one medication in order to log this entry.",
      );
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
    // Don't return to landing (step 0) — exit the wizard like Log Symptoms.
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
        showFlareAlert(
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
      showFlareAlert(
        "No tracking data entered",
        "You must add at least one medication in order to log this entry.",
      );
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
        showFlareAlert("Saved", "Your medication log was updated.");
      } else {
        navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: "Dashboard" }] }));
        showFlareAlert("Saved", "Your medication tracking log was saved. To view, tap Logs.");
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Unknown error";
      showFlareAlert("Could not save", message);
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
              <View style={styles.listMedNameDoseRow}>
                <FlareTextInput
                  fieldIcon="pill"
                  placeholder=""
                  value={item.medication}
                  onChangeText={(t) => updateListRow(kind, i, "medication", t)}
                  style={styles.listMedNameInput}
                />
                {withDosage ? (
                  <FlareTextInput
                    trailingLabel="mg"
                    placeholder=""
                    keyboardType="number-pad"
                    value={item.dosage ?? ""}
                    maxLength={5}
                    onChangeText={(t) => updateListRow(kind, i, "dosage", t)}
                    style={styles.listMedDoseInput}
                    accessibilityLabel="Dose in milligrams"
                  />
                ) : null}
              </View>
              <FlareInputTrigger pickerIcon="date" onPress={() => openDatePicker(kind, i)}>
                <Text style={{ color: item.date ? c.text : c.textMuted }}>
                  {item.date ? formatUkDate(item.date) : ""}
                </Text>
              </FlareInputTrigger>
              <FlareInputTrigger pickerIcon="time" onPress={() => openTimePicker(kind, i)}>
                <Text style={{ color: item.timeOfDay ? c.text : c.textMuted }}>
                  {item.timeOfDay || ""}
                </Text>
              </FlareInputTrigger>
            {list.length > 1 ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Remove medication"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                onPress={() => removeListRow(kind, i)}
                style={styles.removeItemLink}
              >
                <Text style={{ color: c.textMuted, fontFamily: "Inter_600SemiBold" }}>Remove</Text>
              </Pressable>
            ) : null}
          </View>
        ))}
        <Pressable
          accessibilityRole="button"
          disabled={!canAdd}
          onPress={() => canAdd && addListRow(kind)}
          hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
          style={styles.addMedLink}
        >
          <Text style={{ color: c.primary, fontFamily: "Inter_700Bold", opacity: canAdd ? 1 : 0.45 }}>
            Add medication
          </Text>
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

  if (loadingEdit) {
    return (
      <View style={[styles.centered, { backgroundColor: c.screen }]}>
        <ActivityIndicator color={c.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.screen }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={styles.wizardShell}>
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
              <FlareLucideIcon icon={TRACK_MEDICATIONS_ICON} size={28} color={c.primary} />
            </View>
            <Text style={[styles.landingTitle, { color: c.text }]}>Track Medications</Text>
            <Text style={[styles.landingSub, { color: c.textMuted }]}>
              Capture medication events that could be important to your IBD care.
            </Text>
            <View style={styles.landingCta}>
              <EntryPrimaryButton title="Start now" onPress={startWizard} noTopMargin />
            </View>
          </View>
        ) : null}

        {currentStep === 1
          ? renderYesNo("missedMedications", "Did you miss any medications?")
          : null}
        {currentStep === 2 ? renderMedicationList("missed", "Please list any medications you missed below", false, "missedMedicationsList") : null}
        {currentStep === 3 ? renderYesNo("nsaidUsage", "Did you take any NSAIDs recently?") : null}
        {currentStep === 4 ? renderMedicationList("nsaid", "Please list any NSAIDs you have taken recently", true, "nsaidList") : null}
        {currentStep === 5 ? renderYesNo("antibioticUsage", "Did you take any antibiotics recently?") : null}
        {currentStep === 6 ? renderMedicationList("antibiotic", "Please list any antibiotics you have taken recently", true, "antibioticList") : null}

        {currentStep === 7 ? (
          <View>
            <WizardReviewMedicationSection
              title="Missed Medications"
              items={cleanedForReview.missedMedicationsList}
              showDosage={false}
              onEdit={() => openReviewEdit("missed")}
            />
            <WizardReviewMedicationSection
              title="NSAIDs Taken"
              items={cleanedForReview.nsaidList}
              showDosage
              onEdit={() => openReviewEdit("nsaid")}
            />
            <WizardReviewMedicationSection
              title="Antibiotics Taken"
              items={cleanedForReview.antibioticList}
              showDosage
              onEdit={() => openReviewEdit("antibiotic")}
            />
          </View>
        ) : null}

        {currentStep > 0 ? (
          <View
            style={[
              styles.footerBtns,
              currentStep === MEDICATION_REVIEW_STEP && !editingReviewSection && styles.footerBtnsReview,
            ]}
          >
            {editingReviewSection ? (
              <>
                <PrimaryButton title="Back to review" onPress={returnToReview} />
                {currentStep < getMedicationReviewSectionLastStep(editingReviewSection, form) ? (
                  <SecondaryButton title="Next" onPress={applyAdvance} />
                ) : null}
              </>
            ) : currentStep < MEDICATION_REVIEW_STEP ? (
              <PrimaryButton title="Next" onPress={applyAdvance} />
            ) : (
              <PrimaryButton
                title={submitting ? "Saving…" : editId ? "Save changes" : "Submit"}
                onPress={submit}
                disabled={submitting || !reviewHasData}
              />
            )}
            {currentStep > 1 && !editingReviewSection && currentStep !== MEDICATION_REVIEW_STEP ? (
              <SecondaryButton title="Previous step" onPress={goBackInternal} />
            ) : null}
          </View>
        ) : null}

        {currentStep === 3 ? (
          <Pressable
            accessibilityRole="link"
            accessibilityLabel="What are NSAIDs — open Help"
            onPress={() => navigation.navigate("AccountHelp", { expandSection: "nsaids" })}
            style={({ pressed }) => [
              HELP_NAV_LINK_PRESS,
              styles.helpLinkBelowActions,
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text style={[HELP_NAV_LINK_LABEL, { color: c.text }]}>What are NSAIDs?</Text>
          </Pressable>
        ) : null}
      </ScrollView>
      </View>

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
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  wizardShell: { flex: 1 },
  scrollPad: { paddingTop: 16, paddingBottom: QUESTIONNAIRE_STEP_SCROLL_BOTTOM },
  scrollPadLanding: { flexGrow: 1, paddingHorizontal: FULL_WIDTH_CTA_EDGE_PADDING },
  scrollPadWizardSteps: { ...QUESTIONNAIRE_STEP_SCROLL },
  landing: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 8,
    paddingBottom: 36,
    width: "100%",
  },
  landingIconPanel: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 32,
  },
  landingTitle: {
    fontFamily: "Inter_800ExtraBold",
    fontSize: 22,
    lineHeight: 28,
    marginBottom: 20,
    textAlign: "center",
    letterSpacing: -0.4,
    maxWidth: 360,
    width: "100%",
  },
  landingSub: {
    fontSize: 17,
    lineHeight: 26,
    textAlign: "center",
    marginBottom: 0,
    paddingHorizontal: 4,
    maxWidth: 360,
    width: "100%",
  },
  landingCta: { width: "100%", paddingHorizontal: LANDING_CTA_SIDE_PAD, marginTop: 28 },
  phaseLine: { fontSize: 13, marginBottom: 12, fontFamily: "Inter_500Medium" },
  h3: { ...QUESTIONNAIRE_STEP_TITLE },
  rowGap: { ...QUESTIONNAIRE_STEP_OPTION_LIST },
  radioRow: { ...QUESTIONNAIRE_STEP_RADIO_ROW },
  radioOuter: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  radioInner: { width: 12, height: 12, borderRadius: 6 },
  helpLinkBelowActions: {
    marginTop: HELP_NAV_LINK_BELOW_ACTIONS_MARGIN_TOP,
  },
  listEntryWrap: { marginBottom: 12 },
  listEntryWrapFirst: { paddingTop: 0 },
  removeItemLink: { marginTop: 6, alignSelf: "flex-end" },
  addMedLink: { marginTop: 8, marginBottom: 8, alignSelf: "flex-start" },
  listMedNameDoseRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  listMedNameInput: { flex: 1, minWidth: 0, marginTop: 0 },
  listMedDoseInput: { width: 104, marginTop: 0, flexShrink: 0 },
  footerBtns: { ...QUESTIONNAIRE_STEP_FOOTER },
  footerBtnsReview: { marginTop: 0 },
});
