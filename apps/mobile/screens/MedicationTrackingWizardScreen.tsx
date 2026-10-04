import { FLARE_CHROME_LUCIDE, FlareLucideIcon } from "../lib/flareLucideIcons";
import { PenLine } from "lucide-react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { CommonActions, useNavigation, useRoute } from "@react-navigation/native";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, BackHandler, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View, type ScrollView as RNScrollView } from "react-native";
import { showFlareAlert } from "../components/FlareAlertHost";
import { ScrollView } from "../lib/scrollViews";
import { OptionPickerModal } from "../components/OptionPickerModal";
import { Card } from "../components/MidnightLagoonCard";
import { SectionLabel } from "../components/MidnightLagoonSectionLabel";
import { OptionChip } from "../components/OptionChip";
import { WizardProgressBar } from "../components/WizardProgressBar";
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
  normalizeDosage,
  TIME_OF_DAY_OPTIONS,
  type MedicationListRow,
  type MedicationTrackingFormData,
  type MedicationReviewSectionId,
  type MedicationWizardHistoryEntry,
} from "../lib/medicationWizardShared";
import { TRACK_MEDICATIONS_ICON } from "../lib/medicationFeatureIcons";
import { RADIUS, SPACING, TYPOGRAPHY } from "../designTokens";
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

function ReviewSectionCard({
  title,
  onEdit,
  children,
}: {
  title: string;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  const c = useFlareColors();
  return (
    <Card>
      <View style={styles.reviewCardHeader}>
        <View style={styles.reviewInCardLabelWrap}>
          <SectionLabel style={styles.reviewInCardLabel}>{title}</SectionLabel>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Edit ${title}`}
          onPress={onEdit}
          hitSlop={10}
          style={[styles.reviewEditBtn, { backgroundColor: c.surfaceSubtle }]}
        >
          <FlareLucideIcon icon={PenLine} size={16} color={c.primary} />
        </Pressable>
      </View>
      {children}
    </Card>
  );
}

function ReviewFieldRows({ fields }: { fields: { label: string; value: string }[] }) {
  const c = useFlareColors();
  return (
    <>
      {fields.map((field, i) => (
        <View key={`${field.label}-${i}`} style={[styles.reviewFieldRow, i > 0 && styles.reviewFieldRowGap]}>
          <Text style={[styles.reviewFieldLabel, { color: c.textSecondary, fontFamily: TYPOGRAPHY.fontFamily.regular }]}>{field.label}</Text>
          <Text style={[styles.reviewFieldValue, { color: c.text, fontFamily: TYPOGRAPHY.fontFamily.medium }]}>{field.value}</Text>
        </View>
      ))}
    </>
  );
}

export function MedicationTrackingWizardScreen({ user }: { user: SessionUser }) {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const editId = String((route.params as { editId?: string } | undefined)?.editId ?? "");
  const c = useFlareColors();
  const errTextStyle = flareFieldErrorStyle(c, "wizard");
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
  const advancingRef = useRef(false);

  useEffect(() => {
    advancingRef.current = false;
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
        showFlareAlert("Could not load entry");
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

  const returnToReview = useCallback((source: MedicationTrackingFormData = form) => {
    if (cleanedMedicationHasNoData(cleanMedicationForm(source))) {
      setForm(source);
      showFlareAlert("No tracking data entered");
      return false;
    }
    setForm(source);
    setCurrentStep(MEDICATION_REVIEW_STEP);
    setEditingReviewSection(null);
    setFieldErrors({});
    setDatePicker(null);
    setPickerDraftDate(null);
    setTimePicker(null);
    return true;
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

  const advanceFrom = useCallback(
    (source: MedicationTrackingFormData) => {
      if (advancingRef.current) return;
      const res = medicationWizardTryAdvance({ currentStep, form: source });
      if (!res.ok) {
        setForm(source);
        advancingRef.current = false;
        if (res.noData) {
          showFlareAlert("No tracking data entered");
          return;
        }
        setFieldErrors(res.fieldErrors);
        return;
      }
      setForm(source);
      setFieldErrors({});
      advancingRef.current = true;
      if (editingReviewSection) {
        const sectionLast = getMedicationReviewSectionLastStep(editingReviewSection, source);
        if (res.nextStep > sectionLast) {
          const returned = returnToReview(source);
          if (!returned) advancingRef.current = false;
          return;
        }
        setCurrentStep(res.nextStep);
        return;
      }
      if (res.nextStep === MEDICATION_REVIEW_STEP) {
        setEditingReviewSection(null);
      }
      setHistory((h) => [...h, { step: currentStep, form: cloneForm(source) }]);
      setCurrentStep(res.nextStep);
    },
    [currentStep, editingReviewSection, returnToReview],
  );

  const applyAdvance = useCallback(() => {
    advanceFrom(form);
  }, [advanceFrom, form]);

  /** Yes or No is the whole answer, so the step moves on. Back restores it and does not advance again. */
  const chooseYesNo = useCallback(
    (field: "missedMedications" | "nsaidUsage" | "antibioticUsage", value: boolean) => {
      advanceFrom({ ...form, [field]: value });
    },
    [advanceFrom, form],
  );

  const startWizard = () => {
    setHistory([{ step: 0, form: cloneForm(form) }]);
    setCurrentStep(1);
  };

  const submit = async () => {
    const cleaned = cleanMedicationForm(form);
    if (cleanedMedicationHasNoData(cleaned)) {
      showFlareAlert("No tracking data entered");
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
        showFlareAlert("Saved");
      } else {
        navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: "Today" }] }));
        showFlareAlert("Saved", "To view, see History in Track");
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Unknown error";
      showFlareAlert(message);
    } finally {
      setSubmitting(false);
    }
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
    <View style={styles.stepContent}>
      <Text style={[styles.stepTitle, { color: c.text, fontFamily: TYPOGRAPHY.fontFamily.semibold }]}>{title}</Text>
      <View style={styles.optionChipRow}>
        <OptionChip label="Yes" selected={form[field] === true} onPress={() => chooseYesNo(field, true)} />
        <OptionChip label="No" selected={form[field] === false} onPress={() => chooseYesNo(field, false)} />
      </View>
      {fieldErrors[field] ? <Text style={errTextStyle}>{fieldErrors[field]}</Text> : null}
    </View>
  );

  const renderMedicationList = (kind: ListKind, title: string, withDosage: boolean, errKey: string) => {
    const key = listKey(kind);
    const list = form[key];

    return (
      <View style={styles.stepContent}>
        <Text style={[styles.stepTitle, { color: c.text, fontFamily: TYPOGRAPHY.fontFamily.semibold }]}>{title}</Text>
        <Card noPadding style={{ paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md }}>
          {list.map((item, i) => (
            <View key={i} style={[styles.mealFoodRow, i > 0 && styles.mealFoodRowBorder, { borderTopColor: c.cardBorder }]}>
              <View style={styles.mealRowContent}>
                <View style={styles.mealRowTop}>
                  <FlareTextInput
                    placeholder="Medication"
                    value={item.medication}
                    onChangeText={(t) => updateListRow(kind, i, "medication", t)}
                    style={styles.mealNameInput}
                  />
                  {withDosage ? (
                    <FlareTextInput
                      placeholder="mg"
                      keyboardType="number-pad"
                      value={item.dosage ?? ""}
                      maxLength={5}
                      onChangeText={(t) => updateListRow(kind, i, "dosage", t)}
                      style={styles.mealAmountInputSmall}
                      accessibilityLabel="Dose in milligrams"
                    />
                  ) : (
                    <FlareInputTrigger onPress={() => openDatePicker(kind, i)} style={styles.mealAmountInputSmall}>
                      <Text style={[styles.triggerText, { color: item.date ? c.text : c.textMuted, fontFamily: TYPOGRAPHY.fontFamily.regular }]}>
                        {item.date ? formatUkDate(item.date) : "Date"}
                      </Text>
                    </FlareInputTrigger>
                  )}
                </View>
                {withDosage ? (
                  <FlareInputTrigger onPress={() => openDatePicker(kind, i)} style={styles.dateField}>
                    <Text style={[styles.triggerText, { color: item.date ? c.text : c.textMuted, fontFamily: TYPOGRAPHY.fontFamily.regular }]}>
                      {item.date ? formatUkDate(item.date) : "Date"}
                    </Text>
                  </FlareInputTrigger>
                ) : null}
                <View style={styles.portionChips}>
                  {TIME_OF_DAY_OPTIONS.map((label) => (
                    <OptionChip
                      key={label}
                      label={label}
                      selected={item.timeOfDay === label}
                      onPress={() => updateListRow(kind, i, "timeOfDay", label)}
                    />
                  ))}
                </View>
              </View>
              {list.length > 1 ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Remove medication"
                  hitSlop={10}
                  onPress={() => removeListRow(kind, i)}
                >
                  <FlareLucideIcon icon={FLARE_CHROME_LUCIDE.delete} size={20} color={c.textMuted} />
                </Pressable>
              ) : null}
            </View>
          ))}
        </Card>
        <Pressable
          accessibilityRole="button"
          onPress={() => addListRow(kind)}
          style={[styles.addFoodButton, { borderColor: c.inputBorder }]}
        >
          <FlareLucideIcon icon={FLARE_CHROME_LUCIDE.add} size={16} color={c.primary} />
          <Text style={[styles.addFoodText, { color: c.primary, fontFamily: TYPOGRAPHY.fontFamily.semibold }]}>Add medication</Text>
        </Pressable>
        {fieldErrors[errKey] ? <Text style={errTextStyle}>{fieldErrors[errKey]}</Text> : null}
        {datePicker?.list === kind && datePicker.index >= 0 && pickerDraftDate ? (
          <>
            <DateTimePicker
              value={pickerDraftDate}
              mode="date"
              display="spinner"
              textColor={c.text}
              themeVariant={c.isDark ? "dark" : "light"}
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
    <KeyboardAvoidingView style={[styles.screen, { backgroundColor: c.screen }]} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[
          styles.scrollContent,
          currentStep === 0 && styles.scrollContentLanding,
          currentStep === MEDICATION_REVIEW_STEP && styles.scrollContentReview,
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {currentStep > 0 && currentStep !== MEDICATION_REVIEW_STEP && phase.phaseNames.length > 0 ? (
          <View style={styles.progressWrap}>
            <Text style={[styles.progressLabel, { color: c.textMuted, fontFamily: TYPOGRAPHY.fontFamily.regular }]}>
              {phase.currentPhaseLabel} • {Math.max(0, phase.phaseNames.indexOf(phase.currentPhaseLabel)) + 1}/{phase.phaseNames.length}
            </Text>
            <WizardProgressBar
              current={Math.max(0, phase.phaseNames.indexOf(phase.currentPhaseLabel)) + 1}
              total={phase.phaseNames.length}
            />
          </View>
        ) : null}

        {currentStep === 0 ? (
          <View style={styles.landing}>
            <Card style={styles.landingCard}>
              <View style={styles.landingIconWrap}>
                <FlareLucideIcon icon={TRACK_MEDICATIONS_ICON} size={48} color={c.primary} />
              </View>
              <Text style={[styles.landingTitle, { color: c.text, fontFamily: TYPOGRAPHY.fontFamily.bold }]}>Track Medications</Text>
              <Text style={[styles.landingDesc, { color: c.textSecondary, fontFamily: TYPOGRAPHY.fontFamily.regular }]}>
                Capture medication events that could be important to your IBD care.
              </Text>
              <PrimaryButton title="Start now" onPress={startWizard} />
            </Card>
          </View>
        ) : null}

        {currentStep === 1 ? renderYesNo("missedMedications", "Did you miss any medications?") : null}
        {currentStep === 2 ? renderMedicationList("missed", "Please list any medications you missed below", false, "missedMedicationsList") : null}
        {currentStep === 3 ? renderYesNo("nsaidUsage", "Did you take any NSAIDs recently?") : null}
        {currentStep === 4 ? renderMedicationList("nsaid", "Please list any NSAIDs you have taken recently", true, "nsaidList") : null}
        {currentStep === 5 ? renderYesNo("antibioticUsage", "Did you take any antibiotics recently?") : null}
        {currentStep === 6 ? renderMedicationList("antibiotic", "Please list any antibiotics you have taken recently", true, "antibioticList") : null}

        {currentStep === 7 ? (
          <View style={styles.reviewContent}>
            <Text style={[styles.reviewPageTitle, { color: c.text, fontFamily: TYPOGRAPHY.fontFamily.bold }]}>Review your log</Text>
            <Text style={[styles.reviewPageSubtitle, { color: c.textSecondary, fontFamily: TYPOGRAPHY.fontFamily.regular }]}>
              Check everything looks right before saving.
            </Text>
            <View style={styles.reviewSections}>
            {cleanedForReview.missedMedicationsList.length > 0 ? (
              <ReviewSectionCard title="Missed medications" onEdit={() => openReviewEdit("missed")}>
                {cleanedForReview.missedMedicationsList.map((item, idx) => (
                  <View key={idx} style={idx > 0 ? styles.reviewItemGap : undefined}>
                    <ReviewFieldRows
                      fields={[
                        { label: "Medication", value: item.medication },
                        { label: "Date", value: item.date ? formatUkDate(item.date) : "Not set" },
                        { label: "Time", value: item.timeOfDay || "Not set" },
                      ]}
                    />
                  </View>
                ))}
              </ReviewSectionCard>
            ) : null}
            {cleanedForReview.nsaidList.length > 0 ? (
              <ReviewSectionCard title="NSAIDs" onEdit={() => openReviewEdit("nsaid")}>
                {cleanedForReview.nsaidList.map((item, idx) => (
                  <View key={idx} style={idx > 0 ? styles.reviewItemGap : undefined}>
                    <ReviewFieldRows
                      fields={[
                        { label: "Medication", value: item.medication },
                        { label: "Dose", value: item.dosage || "Not set" },
                        { label: "Date", value: item.date ? formatUkDate(item.date) : "Not set" },
                        { label: "Time", value: item.timeOfDay || "Not set" },
                      ]}
                    />
                  </View>
                ))}
              </ReviewSectionCard>
            ) : null}
            {cleanedForReview.antibioticList.length > 0 ? (
              <ReviewSectionCard title="Antibiotics" onEdit={() => openReviewEdit("antibiotic")}>
                {cleanedForReview.antibioticList.map((item, idx) => (
                  <View key={idx} style={idx > 0 ? styles.reviewItemGap : undefined}>
                    <ReviewFieldRows
                      fields={[
                        { label: "Medication", value: item.medication },
                        { label: "Dose", value: item.dosage || "Not set" },
                        { label: "Date", value: item.date ? formatUkDate(item.date) : "Not set" },
                        { label: "Time", value: item.timeOfDay || "Not set" },
                      ]}
                    />
                  </View>
                ))}
              </ReviewSectionCard>
            ) : null}
            </View>
          </View>
        ) : null}

        {currentStep === 3 ? (
          <Pressable accessibilityRole="link" accessibilityLabel="What are NSAIDs" onPress={() => navigation.navigate("AccountHelp", { expandSection: "nsaids" })} style={({ pressed }) => [styles.helpLink, pressed && { opacity: 0.7 }]}>
            <Text style={[styles.helpLinkText, { color: c.text, fontFamily: TYPOGRAPHY.fontFamily.regular }]}>What are NSAIDs?</Text>
          </Pressable>
        ) : null}
      </ScrollView>

      {currentStep > 0 && !(currentStep === MEDICATION_REVIEW_STEP && !editingReviewSection) ? (
        <View style={[styles.footer, { backgroundColor: c.screen, borderTopColor: c.cardBorder }]}>
          <SecondaryButton title="Back" onPress={goBackInternal} />
          {currentStep !== 1 && currentStep !== 3 && currentStep !== 5 && (!editingReviewSection || currentStep < getMedicationReviewSectionLastStep(editingReviewSection, form)) ? (
            <PrimaryButton title="Next" onPress={applyAdvance} />
          ) : null}
        </View>
      ) : null}

      {currentStep === MEDICATION_REVIEW_STEP && !editingReviewSection ? (
        <View style={[styles.fixedFooter, { backgroundColor: c.screen, borderTopColor: c.cardBorder }]}>
          <PrimaryButton title={submitting ? "Saving..." : "Save log"} onPress={submit} disabled={submitting || !reviewHasData} />
        </View>
      ) : null}

      <OptionPickerModal visible={timePicker != null} options={TIME_OF_DAY_OPTIONS} onSelect={selectTimeOfDay} onCancel={closeTimePicker} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scrollContent: {
    paddingHorizontal: SPACING.screen,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.lg * 2,
  },
  scrollContentLanding: {
    paddingTop: 0,
    paddingBottom: SPACING.xl,
  },
  scrollContentReview: {
    paddingBottom: SPACING.lg * 2,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  progressWrap: {
    marginBottom: SPACING.xl,
    gap: SPACING.sm,
  },
  progressLabel: {
    fontSize: TYPOGRAPHY.fontSize.sm,
  },
  landing: {
    flex: 1,
    justifyContent: "center",
    paddingVertical: SPACING.xl * 2,
  },
  landingCard: {
    alignItems: "center",
    gap: SPACING.lg,
    paddingBottom: SPACING.lg * 2,
  },
  landingIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.md,
  },
  landingTitle: {
    fontSize: TYPOGRAPHY.fontSize.screenTitle,
    textAlign: "center",
  },
  landingDesc: {
    fontSize: TYPOGRAPHY.fontSize.md,
    textAlign: "center",
    lineHeight: 22,
  },
  stepContent: {
    gap: SPACING.lg,
  },
  stepTitle: {
    fontSize: TYPOGRAPHY.fontSize.cardTitle,
    lineHeight: 24,
  },
  optionChipRow: {
    flexDirection: "row",
    gap: SPACING.md,
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
  mealFoodRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: SPACING.md,
    gap: SPACING.md,
  },
  mealFoodRowBorder: {
    borderTopWidth: 1,
  },
  mealRowContent: {
    flex: 1,
    gap: SPACING.md,
  },
  mealRowTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: SPACING.sm,
  },
  mealNameInput: {
    flex: 1,
  },
  mealAmountInputSmall: {
    minWidth: 80,
    marginTop: 0,
  },
  dateField: {
    marginTop: 0,
  },
  portionChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.xs,
  },
  triggerText: {
    fontSize: TYPOGRAPHY.fontSize.md,
  },
  addFoodButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.xs,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.button,
    borderWidth: 1.5,
    borderStyle: "dashed",
    alignSelf: "flex-start",
  },
  addFoodText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
  },
  reviewContent: {
    gap: 0,
  },
  reviewPageTitle: {
    fontSize: TYPOGRAPHY.fontSize.screenTitle,
    lineHeight: 30,
    marginBottom: SPACING.xs,
  },
  reviewPageSubtitle: {
    fontSize: TYPOGRAPHY.fontSize.md,
    lineHeight: 20,
    marginBottom: SPACING.sm,
  },
  reviewSections: {
    marginTop: SPACING.md,
  },
  reviewCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  reviewInCardLabelWrap: {
    flex: 1,
    minWidth: 0,
  },
  reviewInCardLabel: {
    marginTop: 0,
    marginBottom: 0,
    marginHorizontal: 0,
    letterSpacing: 0.8,
  },
  reviewEditBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  reviewFieldRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: SPACING.md,
  },
  reviewFieldRowGap: {
    marginTop: SPACING.md,
  },
  reviewFieldLabel: {
    fontSize: TYPOGRAPHY.fontSize.md,
    flex: 1,
  },
  reviewFieldValue: {
    fontSize: TYPOGRAPHY.fontSize.md,
    textAlign: "right",
    flex: 1,
  },
  reviewItemGap: {
    marginTop: SPACING.lg,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: SPACING.md,
    paddingHorizontal: SPACING.screen,
    paddingVertical: SPACING.lg,
    borderTopWidth: 1,
  },
  fixedFooter: {
    paddingHorizontal: SPACING.screen,
    paddingVertical: SPACING.lg,
    borderTopWidth: 1,
  },
  helpLink: {
    marginTop: SPACING.lg,
  },
  helpLinkText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    textDecorationLine: "underline",
  },
});
