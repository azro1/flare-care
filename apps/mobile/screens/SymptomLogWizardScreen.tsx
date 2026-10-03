import { FLARE_FEATURE_LUCIDE, FlareLucideIcon } from "../lib/flareLucideIcons";
import DateTimePicker from "@react-native-community/datetimepicker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { CommonActions, useNavigation, useRoute } from "@react-navigation/native";
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
  type ScrollView as RNScrollView,
} from "react-native";
import { showFlareAlert } from "../components/FlareAlertHost";
import { ScrollView } from "../lib/scrollViews";
import { Card } from "../components/MidnightLagoonCard";
import { SectionLabel } from "../components/MidnightLagoonSectionLabel";
import { OptionChip } from "../components/OptionChip";
import { NumberStepper } from "../components/NumberStepper";
import { WizardProgressBar } from "../components/WizardProgressBar";
import {
  WizardReviewMealsSection,
  WizardReviewNotesSection,
  WizardReviewSection,
  WizardReviewShell,
  type WizardReviewField,
} from "../components/symptomReviewLayout";
import { PrimaryButton, SecondaryButton } from "../components/FlareButton";
import { flareFieldErrorStyle, FlareTextInput } from "../components/FlareInput";
import { invalidateDashboardSnapshot } from "../lib/dashboardSnapshotCache";
import { formatUkDate } from "../lib/formatUkDate";
import { supabase, TABLES } from "../lib/supabase";
import { symptomWizardTryAdvance } from "../lib/symptomWizardNextStep";
import {
  buildSymptomInsertPayload,
  createEmptySymptomForm,
  fetchUserPreferencesRow,
  getSymptomReviewEditStep,
  getSymptomReviewSectionLastStep,
  getSymptomWizardPhaseProgress,
  resolveAlcoholStep12Phase,
  resolveSmokingStep10Phase,
  SYMPTOM_WIZARD_REVIEW_STEP,
  symptomLogRowToForm,
  type SymptomReviewSectionId,
  SEVERITY_WORD_OPTIONS,
  STRESS_WORD_OPTIONS,
  type MealRow,
  type SymptomFormData,
  type UserPreferencesShape,
  updateSymptomLog,
  upsertUserPreferencesMobile,
} from "../lib/symptomWizardShared";
import { SPACING, RADIUS, TYPOGRAPHY } from "../designTokens";
import { useFlareColors } from "../theme";

type SessionUser = { id: string };

function symptomWizardStorageKeys(userId: string) {
  return [`symptom-wizard-mobile-step:${userId}`, `symptom-wizard-mobile-form:${userId}`];
}

async function clearSymptomWizardStorage(userId: string) {
  await AsyncStorage.multiRemove(symptomWizardStorageKeys(userId));
}

function cloneForm(f: SymptomFormData): SymptomFormData {
  return JSON.parse(JSON.stringify(f)) as SymptomFormData;
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

const SYMPTOM_REVIEW_STEP = SYMPTOM_WIZARD_REVIEW_STEP;

export function SymptomLogWizardScreen({ user }: { user: SessionUser }) {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const editId = String((route.params as { editId?: string } | undefined)?.editId ?? "");
  const c = useFlareColors();
  const errTextStyle = flareFieldErrorStyle(c, "wizard");
  
  const [loadingPrefs, setLoadingPrefs] = useState(true);
  const [userPreferences, setUserPreferences] = useState<UserPreferencesShape | null>(null);
  const [isFirstTimeUser, setIsFirstTimeUser] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [form, setForm] = useState<SymptomFormData>(() => createEmptySymptomForm());
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [history, setHistory] = useState<{ step: number; form: SymptomFormData }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(Boolean(editId));
  const [picker, setPicker] = useState<null | "start" | "end">(null);
  const [editingReviewSection, setEditingReviewSection] = useState<SymptomReviewSectionId | null>(null);
  const scrollRef = useRef<RNScrollView>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [currentStep]);

  useEffect(() => {
    return () => {
      void clearSymptomWizardStorage(user.id);
    };
  }, [user.id]);

  useEffect(() => {
    (async () => {
      setLoadingPrefs(true);
      try {
        const prefs = await fetchUserPreferencesRow(user.id);
        setUserPreferences(prefs);
        setIsFirstTimeUser(editId ? false : !prefs);
      } finally {
        setLoadingPrefs(false);
      }
    })();
  }, [editId, user.id]);

  useEffect(() => {
    if (!editId) return;
    let cancelled = false;
    (async () => {
      setLoadingEdit(true);
      const { data, error } = await supabase
        .from(TABLES.LOG_SYMPTOMS)
        .select("*")
        .eq("user_id", user.id)
        .eq("id", editId)
        .maybeSingle();
      if (cancelled) return;
      if (error || !data) {
        showFlareAlert("Could not load entry");
        navigation.goBack();
        return;
      }
      const loadedForm = symptomLogRowToForm(data as Record<string, unknown>);
      setForm(loadedForm);
      setCurrentStep(SYMPTOM_REVIEW_STEP);
      setHistory([]);
      setLoadingEdit(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [editId, navigation, user.id]);

  const phase = useMemo(
    () => getSymptomWizardPhaseProgress(currentStep, isFirstTimeUser, userPreferences),
    [currentStep, isFirstTimeUser, userPreferences],
  );

  const symptomDayDate = form.symptomStartDate ? parseYmd(form.symptomStartDate) : null;
  const hasValidSymptomDay = Boolean(symptomDayDate && !Number.isNaN(symptomDayDate.getTime()));
  const isSymptomDayToday = hasValidSymptomDay && symptomDayDate!.toDateString() === new Date().toDateString();
  const symptomDayLabel = hasValidSymptomDay ? formatUkDate(symptomDayDate!) : "this day";

  const smokingStep10Phase = resolveSmokingStep10Phase(form);
  const alcoholStep12Phase = resolveAlcoholStep12Phase(form);

  const mealReviewEntries = useMemo(() => {
    const entries: { label: string; skipped?: boolean; items?: MealRow[] }[] = [];
    const add = (
      meal: "breakfast" | "lunch" | "dinner",
      label: string,
      skipKey: "breakfast_skipped" | "lunch_skipped" | "dinner_skipped",
    ) => {
      const items = form[meal].filter((i) => i.food.trim());
      if (items.length) entries.push({ label, items });
      else if (form[skipKey]) entries.push({ label, skipped: true });
    };
    add("breakfast", "Breakfast", "breakfast_skipped");
    add("lunch", "Lunch", "lunch_skipped");
    add("dinner", "Dinner", "dinner_skipped");
    return entries;
  }, [form]);

  const showLifestyleReview =
    isFirstTimeUser || typeof form.smoked_on_symptom_day === "boolean" || typeof form.drank_on_symptom_day === "boolean";

  const reviewBasicFields = useMemo((): WizardReviewField[] => {
    const fields: WizardReviewField[] = [
      { label: "Start Date", value: form.symptomStartDate ? formatUkDate(form.symptomStartDate) : "Not set" },
      { label: "Status", value: form.isOngoing ? "Ongoing" : "Ended" },
      { label: "Severity", value: form.severity ? `${form.severity}/10` : "Not set" },
      { label: "Stress Level", value: form.stress_level ? `${form.stress_level}/10` : "Not set" },
    ];
    if (!form.isOngoing && form.symptomEndDate) {
      fields.splice(2, 0, { label: "End Date", value: formatUkDate(form.symptomEndDate) });
    }
    return fields;
  }, [form]);

  const reviewBathroomFields = useMemo((): WizardReviewField[] => {
    const fields: WizardReviewField[] = [
      {
        label: "Frequency",
        value: form.normal_bathroom_frequency ? `${form.normal_bathroom_frequency} times/day` : "Not set",
      },
    ];
    if (form.bathroom_frequency_changed) {
      fields.push({
        label: "Frequency Changed",
        value: form.bathroom_frequency_changed === "yes" ? "Yes" : "No",
      });
    }
    if (form.bathroom_frequency_changed === "yes" && form.bathroom_frequency_change_details?.trim()) {
      fields.push({ label: "Change Description", value: form.bathroom_frequency_change_details.trim() });
    }
    return fields;
  }, [form]);

  const reviewLifestyleFields = useMemo((): WizardReviewField[] => {
    if (!showLifestyleReview) return [];
    const fields: WizardReviewField[] = [];
    if (isFirstTimeUser) {
      fields.push({ label: "Smoker", value: form.smoker ? "Yes" : "No" });
    }
    if (isFirstTimeUser && form.smoker === true && form.smoking_habits?.trim()) {
      fields.push({ label: "Smoking Habits", value: form.smoking_habits.trim() });
    }
    if (!isFirstTimeUser && typeof form.smoked_on_symptom_day === "boolean") {
      fields.push({
        label: "Smoked",
        value: form.smoked_on_symptom_day ? form.smoked_amount_on_symptom_day?.trim() || "Yes" : "No",
      });
    }
    if (isFirstTimeUser && form.smoker === true && form.smoked_amount_on_symptom_day?.trim()) {
      fields.push({
        label: isSymptomDayToday ? "Smoked Today" : `Smoked on ${symptomDayLabel}`,
        value: form.smoked_amount_on_symptom_day.trim(),
      });
    }
    if (isFirstTimeUser) {
      fields.push({ label: "Alcohol", value: form.alcohol ? "Yes" : "No" });
    }
    if (isFirstTimeUser && form.alcohol === true && form.average_alcohol_units_pw?.trim()) {
      fields.push({ label: "Alcohol Habits (on average)", value: `${form.average_alcohol_units_pw.trim()} units/week` });
    }
    if (!isFirstTimeUser && typeof form.drank_on_symptom_day === "boolean") {
      fields.push({
        label: "Alcohol Units Consumed",
        value: form.drank_on_symptom_day
          ? form.alcohol_units_on_symptom_day?.trim()
            ? `${form.alcohol_units_on_symptom_day.trim()} units`
            : "Yes"
          : "No",
      });
    }
    if (isFirstTimeUser && form.alcohol === true && form.alcohol_units_on_symptom_day?.trim()) {
      fields.push({
        label: isSymptomDayToday ? "Alcohol Units Today" : `Alcohol Units on ${symptomDayLabel}`,
        value: `${form.alcohol_units_on_symptom_day.trim()} units`,
      });
    }
    return fields;
  }, [form, isFirstTimeUser, isSymptomDayToday, showLifestyleReview, symptomDayLabel]);

  const returnToReview = useCallback(() => {
    setCurrentStep(SYMPTOM_REVIEW_STEP);
    setEditingReviewSection(null);
    setFieldErrors({});
  }, []);

  const openReviewEdit = useCallback(
    (section: SymptomReviewSectionId) => {
      const entryStep = getSymptomReviewEditStep(section, isFirstTimeUser, userPreferences);
      if (entryStep == null) return;
      setEditingReviewSection(section);
      setCurrentStep(entryStep);
      setFieldErrors({});
    },
    [isFirstTimeUser, userPreferences],
  );

  const goBackInternal = useCallback(() => {
    if (currentStep === SYMPTOM_REVIEW_STEP && !editingReviewSection) {
      navigation.goBack();
      return true;
    }
    if (editingReviewSection) {
      const entryStep = getSymptomReviewEditStep(editingReviewSection, isFirstTimeUser, userPreferences);
      if (entryStep != null && currentStep === entryStep) {
        returnToReview();
        return true;
      }
    }
    const prev = history[history.length - 1];
    if (prev && !editingReviewSection) {
      if (prev.step <= 0) {
        navigation.goBack();
        return true;
      }
      setHistory((h) => h.slice(0, -1));
      setCurrentStep(prev.step);
      setForm(prev.form);
      setFieldErrors({});
      return true;
    }
    if (editingReviewSection) {
      const previousStep = currentStep - 1;
      if (previousStep >= 1) {
        setCurrentStep(previousStep);
        setFieldErrors({});
        return true;
      }
      returnToReview();
      return true;
    }
    if (editId && currentStep > 1) {
      setCurrentStep((step) => step - 1);
      setFieldErrors({});
      return true;
    }
    navigation.goBack();
    return true;
  }, [currentStep, editId, editingReviewSection, history, isFirstTimeUser, navigation, returnToReview, userPreferences]);

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", goBackInternal);
    return () => sub.remove();
  }, [goBackInternal]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: currentStep === SYMPTOM_REVIEW_STEP && !editingReviewSection ? "Review" : "",
    });
  }, [navigation, currentStep, editingReviewSection]);

  const applyAdvance = useCallback(() => {
    const res = symptomWizardTryAdvance({
      currentStep,
      form,
      isFirstTimeUser,
      userPreferences,
    });
    if (!res.ok) {
      setFieldErrors(res.fieldErrors);
      return;
    }
    setFieldErrors({});
    setForm(res.form);
    if (editingReviewSection) {
      const sectionLast = getSymptomReviewSectionLastStep(editingReviewSection);
      if (res.nextStep > sectionLast) {
        returnToReview();
        return;
      }
      setCurrentStep(res.nextStep);
      return;
    }
    if (res.nextStep === SYMPTOM_REVIEW_STEP) {
      setEditingReviewSection(null);
    }
    setHistory((h) => [...h, { step: currentStep, form: cloneForm(form) }]);
    setCurrentStep(res.nextStep);
  }, [currentStep, editingReviewSection, form, isFirstTimeUser, returnToReview, userPreferences]);

  const startWizard = () => {
    setHistory([{ step: 0, form: cloneForm(form) }]);
    setCurrentStep(1);
  };

  const submit = async () => {
    const hasMealData =
      form.breakfast.some((i) => i.food.trim()) ||
      form.lunch.some((i) => i.food.trim()) ||
      form.dinner.some((i) => i.food.trim()) ||
      form.breakfast_skipped ||
      form.lunch_skipped ||
      form.dinner_skipped;
    if (!form.notes.trim() && !hasMealData) {
      showFlareAlert("Please add notes or meal information");
      return;
    }
    if (!form.isOngoing && !form.symptomEndDate) {
      showFlareAlert("Please specify when symptoms ended");
      return;
    }
    setSubmitting(true);
    try {
      if (editId) {
        await updateSymptomLog(user.id, editId, form, isFirstTimeUser);
      } else {
        const payload = buildSymptomInsertPayload(user.id, form, isFirstTimeUser);
        const { error } = await supabase.from(TABLES.LOG_SYMPTOMS).insert([payload as any]);
        if (error) throw error;
        if (isFirstTimeUser) {
          await upsertUserPreferencesMobile(user.id, {
            isSmoker: Boolean(form.smoker),
            isDrinker: Boolean(form.alcohol),
            normalBathroomFrequency: form.normal_bathroom_frequency,
          });
        }
      }
      await clearSymptomWizardStorage(user.id);
      invalidateDashboardSnapshot(user.id);
      if (editId) {
        navigation.goBack();
        showFlareAlert("Saved");
      } else {
        navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: "Dashboard" }] }));
        showFlareAlert("Saved. To view, tap Logs.");
      }
    } catch (e: any) {
      showFlareAlert(e?.message || "Could not save");
    } finally {
      setSubmitting(false);
    }
  };

  const setRating = (name: "severity" | "stress_level", value: number) => {
    setForm((prev) => ({ ...prev, [name]: String(value) }));
    setFieldErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const mealLabel = (meal: "breakfast" | "lunch" | "dinner") => {
    if (!form.symptomStartDate) return `What did you have for ${meal}?`;
    if (isSymptomDayToday) return `What did you have for ${meal} today?`;
    return `What did you have for ${meal} on ${symptomDayLabel}?`;
  };

  const removeMealRow = (meal: "breakfast" | "lunch" | "dinner", index: number) => {
    setForm((p) => {
      const list = p[meal];
      if (list.length <= 1) {
        return { ...p, [meal]: [{ food: "", quantity: "" }] };
      }
      return { ...p, [meal]: list.filter((_, j) => j !== index) };
    });
  };

  const renderMeal = (meal: "breakfast" | "lunch" | "dinner", skipKey: "breakfast_skipped" | "lunch_skipped" | "dinner_skipped") => {
    const list = form[meal];
    const last = list[list.length - 1];
    const canAdd = Boolean(last?.food.trim() && last?.quantity.trim()) && !form[skipKey];

    return (
      <View style={styles.stepContent}>
        <Text style={[styles.stepTitle, { color: c.text, fontFamily: TYPOGRAPHY.fontFamily.semibold }]}>{mealLabel(meal)}</Text>
        {list.map((item, i) => (
          <View key={i} style={styles.mealRow}>
            <FlareTextInput
              placeholder="Food"
              value={item.food}
              onChangeText={(t) =>
                setForm((p) => ({
                  ...p,
                  [meal]: p[meal].map((row, j) => (j === i ? { ...row, food: t } : row)),
                  [skipKey]: false,
                }))
              }
              style={styles.mealFoodInput}
            />
            <FlareTextInput
              placeholder="Quantity"
              value={item.quantity}
              onChangeText={(t) =>
                setForm((p) => ({
                  ...p,
                  [meal]: p[meal].map((row, j) => (j === i ? { ...row, quantity: t } : row)),
                }))
              }
            />
            {list.length > 1 ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Remove meal item"
                hitSlop={8}
                onPress={() => removeMealRow(meal, i)}
                style={styles.removeLink}
              >
                <Text style={[styles.removeLinkText, { color: c.textMuted, fontFamily: TYPOGRAPHY.fontFamily.semibold }]}>Remove</Text>
              </Pressable>
            ) : null}
          </View>
        ))}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Add another ${meal} item`}
          disabled={!canAdd}
          hitSlop={10}
          onPress={() => {
            if (!canAdd) return;
            setForm((p) => ({
              ...p,
              [meal]: [...p[meal], { food: "", quantity: "" }],
              [skipKey]: false,
            }));
          }}
          style={styles.addLink}
        >
          <Text style={[styles.addLinkText, { color: c.primary, fontFamily: TYPOGRAPHY.fontFamily.bold, opacity: canAdd ? 1 : 0.45 }]}>Add item</Text>
        </Pressable>
        <View style={styles.switchRow}>
          <Text style={[styles.switchLabel, { color: c.text, fontFamily: TYPOGRAPHY.fontFamily.regular }]}>I didn't eat anything</Text>
          <Switch
            value={form[skipKey]}
            trackColor={{ false: c.inputBorder, true: c.primary }}
            thumbColor={c.white}
            ios_backgroundColor={c.inputBorder}
            onValueChange={(v) =>
              setForm((p) => ({
                ...p,
                [skipKey]: v,
                [meal]: v ? [{ food: "", quantity: "" }] : p[meal],
              }))
            }
          />
        </View>
        {fieldErrors[meal] ? <Text style={errTextStyle}>{fieldErrors[meal]}</Text> : null}
      </View>
    );
  };

  if (loadingPrefs || loadingEdit) {
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
        contentContainerStyle={[styles.scrollContent, currentStep === 0 && styles.scrollContentLanding]}
        keyboardShouldPersistTaps="handled"
      >
        {currentStep > 0 && currentStep !== SYMPTOM_REVIEW_STEP && phase.sectionTotal > 0 ? (
          <View style={styles.progressWrap}>
            <Text style={[styles.progressLabel, { color: c.textMuted, fontFamily: TYPOGRAPHY.fontFamily.regular }]}>
              {phase.currentPhaseLabel} • {phase.sectionStep}/{phase.sectionTotal}
            </Text>
            <WizardProgressBar current={phase.sectionStep} total={phase.sectionTotal} />
          </View>
        ) : null}

        {currentStep === 0 ? (
          <View style={styles.landing}>
            <Card style={styles.landingCard}>
              <View style={styles.landingIconWrap}>
                <FlareLucideIcon icon={FLARE_FEATURE_LUCIDE.symptoms} size={48} color={c.primary} />
              </View>
              <Text style={[styles.landingTitle, { color: c.text, fontFamily: TYPOGRAPHY.fontFamily.bold }]}>Log Your Symptoms</Text>
              <Text style={[styles.landingDesc, { color: c.textSecondary, fontFamily: TYPOGRAPHY.fontFamily.regular }]}>
                Track when symptoms occur, severity, lifestyle factors and meals to help identify patterns.
              </Text>
              <PrimaryButton title="Start now" onPress={startWizard} />
            </Card>
          </View>
        ) : null}

        {/* Step 1: When did symptoms begin */}
        {currentStep === 1 ? (
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: c.text, fontFamily: TYPOGRAPHY.fontFamily.semibold }]}>When did your symptoms begin?</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => setPicker("start")}
              style={[styles.datePicker, { backgroundColor: c.inputBg, borderColor: c.inputBorder }]}
            >
              <Text style={[styles.dateText, { color: form.symptomStartDate ? c.text : c.textSecondary, fontFamily: TYPOGRAPHY.fontFamily.regular }]}>
                {form.symptomStartDate ? formatUkDate(form.symptomStartDate) : "Select date"}
              </Text>
            </Pressable>
            {fieldErrors.symptomStartDate ? <Text style={errTextStyle}>{fieldErrors.symptomStartDate}</Text> : null}
          </View>
        ) : null}

        {/* Step 2: Ongoing? */}
        {currentStep === 2 ? (
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: c.text, fontFamily: TYPOGRAPHY.fontFamily.semibold }]}>Are symptoms still ongoing?</Text>
            <View style={styles.optionChipRow}>
              <OptionChip label="Yes" selected={form.isOngoing === true} onPress={() => setForm((p) => ({ ...p, isOngoing: true }))} />
              <OptionChip label="No" selected={form.isOngoing === false} onPress={() => setForm((p) => ({ ...p, isOngoing: false }))} />
            </View>
            {fieldErrors.isOngoing ? <Text style={errTextStyle}>{fieldErrors.isOngoing}</Text> : null}
          </View>
        ) : null}

        {/* Step 3: When did symptoms end */}
        {currentStep === 3 ? (
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: c.text, fontFamily: TYPOGRAPHY.fontFamily.semibold }]}>When did symptoms end?</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => setPicker("end")}
              style={[styles.datePicker, { backgroundColor: c.inputBg, borderColor: c.inputBorder }]}
            >
              <Text style={[styles.dateText, { color: form.symptomEndDate ? c.text : c.textSecondary, fontFamily: TYPOGRAPHY.fontFamily.regular }]}>
                {form.symptomEndDate ? formatUkDate(form.symptomEndDate) : "Select date"}
              </Text>
            </Pressable>
            {fieldErrors.symptomEndDate ? <Text style={errTextStyle}>{fieldErrors.symptomEndDate}</Text> : null}
          </View>
        ) : null}

        {/* Step 4: Severity */}
        {currentStep === 4 ? (
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: c.text, fontFamily: TYPOGRAPHY.fontFamily.semibold }]}>
              How severe {form.isOngoing ? "are" : "were"} your symptoms?
            </Text>
            <View style={styles.optionChipGrid}>
              {SEVERITY_WORD_OPTIONS.map((opt) => (
                <OptionChip
                  key={opt.value}
                  label={opt.label}
                  selected={form.severity === String(opt.value)}
                  onPress={() => setRating("severity", opt.value)}
                />
              ))}
            </View>
            {fieldErrors.severity ? <Text style={errTextStyle}>{fieldErrors.severity}</Text> : null}
          </View>
        ) : null}

        {/* Step 5: Stress */}
        {currentStep === 5 ? (
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: c.text, fontFamily: TYPOGRAPHY.fontFamily.semibold }]}>
              How stressed {form.isOngoing ? "are" : "were"} you feeling?
            </Text>
            <View style={styles.optionChipGrid}>
              {STRESS_WORD_OPTIONS.map((opt) => (
                <OptionChip
                  key={opt.value}
                  label={opt.label}
                  selected={form.stress_level === String(opt.value)}
                  onPress={() => setRating("stress_level", opt.value)}
                />
              ))}
            </View>
            {fieldErrors.stress_level ? <Text style={errTextStyle}>{fieldErrors.stress_level}</Text> : null}
          </View>
        ) : null}

        {/* Step 6: Bathroom frequency */}
        {currentStep === 6 ? (
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: c.text, fontFamily: TYPOGRAPHY.fontFamily.semibold }]}>
              How many times a day do you usually empty your bowels?
            </Text>
            <View style={styles.stepperWrap}>
              <NumberStepper
                value={Number.parseInt(form.normal_bathroom_frequency || "0", 10)}
                onChange={(v) => setForm((p) => ({ ...p, normal_bathroom_frequency: String(v) }))}
                min={0}
                max={99}
              />
            </View>
            {fieldErrors.normal_bathroom_frequency ? <Text style={errTextStyle}>{fieldErrors.normal_bathroom_frequency}</Text> : null}
          </View>
        ) : null}

        {/* Step 7: Bathroom frequency changed? */}
        {currentStep === 7 ? (
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: c.text, fontFamily: TYPOGRAPHY.fontFamily.semibold }]}>
              {form.isOngoing ? "Have you noticed" : "Did you notice"} a change in bathroom frequency?
            </Text>
            <View style={styles.optionChipRow}>
              <OptionChip
                label="Yes"
                selected={form.bathroom_frequency_changed === "yes"}
                onPress={() => setForm((p) => ({ ...p, bathroom_frequency_changed: "yes" }))}
              />
              <OptionChip
                label="No"
                selected={form.bathroom_frequency_changed === "no"}
                onPress={() => setForm((p) => ({ ...p, bathroom_frequency_changed: "no" }))}
              />
            </View>
            {fieldErrors.bathroom_frequency_changed ? <Text style={errTextStyle}>{fieldErrors.bathroom_frequency_changed}</Text> : null}
          </View>
        ) : null}

        {/* Step 8: Describe bathroom change */}
        {currentStep === 8 ? (
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: c.text, fontFamily: TYPOGRAPHY.fontFamily.semibold }]}>Describe your change</Text>
            <FlareTextInput
              value={form.bathroom_frequency_change_details}
              onChangeText={(t) => setForm((p) => ({ ...p, bathroom_frequency_change_details: t }))}
              placeholder="e.g. more often, blood, or loose stools"
              multiline
              numberOfLines={3}
            />
            {fieldErrors.bathroom_frequency_change_details ? <Text style={errTextStyle}>{fieldErrors.bathroom_frequency_change_details}</Text> : null}
          </View>
        ) : null}

        {/* Step 9: Do you smoke? (first-time only) */}
        {currentStep === 9 && isFirstTimeUser ? (
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: c.text, fontFamily: TYPOGRAPHY.fontFamily.semibold }]}>Do you smoke?</Text>
            <View style={styles.optionChipRow}>
              <OptionChip label="Yes" selected={form.smoker === true} onPress={() => setForm((p) => ({ ...p, smoker: true }))} />
              <OptionChip label="No" selected={form.smoker === false} onPress={() => setForm((p) => ({ ...p, smoker: false }))} />
            </View>
            {fieldErrors.smoker ? <Text style={errTextStyle}>{fieldErrors.smoker}</Text> : null}
          </View>
        ) : null}

        {/* Step 10: Smoking habits / day question / day amount (multi-phase) */}
        {currentStep === 10 && smokingStep10Phase === "details" ? (
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: c.text, fontFamily: TYPOGRAPHY.fontFamily.semibold }]}>Describe your smoking habits</Text>
            <FlareTextInput
              value={form.smoking_habits}
              onChangeText={(t) => setForm((p) => ({ ...p, smoking_habits: t }))}
              placeholder="e.g. 1 pack of cigarettes per day"
              multiline
              numberOfLines={3}
            />
            {fieldErrors.smoking_habits ? <Text style={errTextStyle}>{fieldErrors.smoking_habits}</Text> : null}
          </View>
        ) : null}

        {currentStep === 10 && smokingStep10Phase === "dayYesNo" ? (
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: c.text, fontFamily: TYPOGRAPHY.fontFamily.semibold }]}>
              Did you smoke {isSymptomDayToday ? "today" : `on ${symptomDayLabel}`}?
            </Text>
            <View style={styles.optionChipRow}>
              <OptionChip
                label="Yes"
                selected={form.smoked_on_symptom_day === true}
                onPress={() => setForm((p) => ({ ...p, smoked_on_symptom_day: true }))}
              />
              <OptionChip
                label="No"
                selected={form.smoked_on_symptom_day === false}
                onPress={() => setForm((p) => ({ ...p, smoked_on_symptom_day: false }))}
              />
            </View>
            {fieldErrors.smoked_on_symptom_day ? <Text style={errTextStyle}>{fieldErrors.smoked_on_symptom_day}</Text> : null}
          </View>
        ) : null}

        {currentStep === 10 && smokingStep10Phase === "dayAmount" ? (
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: c.text, fontFamily: TYPOGRAPHY.fontFamily.semibold }]}>How much did you smoke?</Text>
            <FlareTextInput
              value={form.smoked_amount_on_symptom_day}
              onChangeText={(t) => setForm((p) => ({ ...p, smoked_amount_on_symptom_day: t }))}
              placeholder={isFirstTimeUser ? "e.g. 3 cigarettes or 1 cigar" : "e.g. 5 cigarettes or 1 cigar"}
              multiline
              numberOfLines={2}
            />
            {fieldErrors.smoked_amount_on_symptom_day ? <Text style={errTextStyle}>{fieldErrors.smoked_amount_on_symptom_day}</Text> : null}
          </View>
        ) : null}

        {/* Step 11: Do you drink alcohol? (first-time only) */}
        {currentStep === 11 && isFirstTimeUser ? (
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: c.text, fontFamily: TYPOGRAPHY.fontFamily.semibold }]}>Do you drink alcohol?</Text>
            <View style={styles.optionChipRow}>
              <OptionChip label="Yes" selected={form.alcohol === true} onPress={() => setForm((p) => ({ ...p, alcohol: true }))} />
              <OptionChip label="No" selected={form.alcohol === false} onPress={() => setForm((p) => ({ ...p, alcohol: false }))} />
            </View>
            {fieldErrors.alcohol ? <Text style={errTextStyle}>{fieldErrors.alcohol}</Text> : null}
          </View>
        ) : null}

        {/* Step 12: Alcohol baseline / day question / day amount (multi-phase) */}
        {currentStep === 12 && alcoholStep12Phase === "baseline" ? (
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: c.text, fontFamily: TYPOGRAPHY.fontFamily.semibold }]}>
              On average, how many units per week?
            </Text>
            <View style={styles.stepperWrap}>
              <NumberStepper
                value={Number.parseInt(form.average_alcohol_units_pw || "0", 10)}
                onChange={(v) => setForm((p) => ({ ...p, average_alcohol_units_pw: String(v) }))}
                min={0}
                max={30}
              />
            </View>
            {fieldErrors.average_alcohol_units_pw ? <Text style={errTextStyle}>{fieldErrors.average_alcohol_units_pw}</Text> : null}
          </View>
        ) : null}

        {currentStep === 12 && alcoholStep12Phase === "dayYesNo" ? (
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: c.text, fontFamily: TYPOGRAPHY.fontFamily.semibold }]}>
              Did you drink {isSymptomDayToday ? "today" : `on ${symptomDayLabel}`}?
            </Text>
            <View style={styles.optionChipRow}>
              <OptionChip
                label="Yes"
                selected={form.drank_on_symptom_day === true}
                onPress={() => setForm((p) => ({ ...p, drank_on_symptom_day: true }))}
              />
              <OptionChip
                label="No"
                selected={form.drank_on_symptom_day === false}
                onPress={() => setForm((p) => ({ ...p, drank_on_symptom_day: false }))}
              />
            </View>
            {fieldErrors.drank_on_symptom_day ? <Text style={errTextStyle}>{fieldErrors.drank_on_symptom_day}</Text> : null}
          </View>
        ) : null}

        {currentStep === 12 && alcoholStep12Phase === "dayAmount" ? (
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: c.text, fontFamily: TYPOGRAPHY.fontFamily.semibold }]}>How many units?</Text>
            <View style={styles.stepperWrap}>
              <NumberStepper
                value={Number.parseInt(form.alcohol_units_on_symptom_day || "0", 10)}
                onChange={(v) => setForm((p) => ({ ...p, alcohol_units_on_symptom_day: String(v) }))}
                min={0}
                max={30}
              />
            </View>
            {fieldErrors.alcohol_units_on_symptom_day ? <Text style={errTextStyle}>{fieldErrors.alcohol_units_on_symptom_day}</Text> : null}
          </View>
        ) : null}

        {/* Steps 13-15: Meals */}
        {currentStep === 13 ? renderMeal("breakfast", "breakfast_skipped") : null}
        {currentStep === 14 ? renderMeal("lunch", "lunch_skipped") : null}
        {currentStep === 15 ? renderMeal("dinner", "dinner_skipped") : null}

        {/* Step 16: Notes */}
        {currentStep === 16 ? (
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: c.text, fontFamily: TYPOGRAPHY.fontFamily.semibold }]}>Additional notes</Text>
            <FlareTextInput
              value={form.notes}
              onChangeText={(t) => setForm((p) => ({ ...p, notes: t }))}
              placeholder="Any other information you'd like to record"
              multiline
              numberOfLines={4}
            />
            {fieldErrors.notes ? <Text style={errTextStyle}>{fieldErrors.notes}</Text> : null}
          </View>
        ) : null}

        {/* Step 17: Review */}
        {currentStep === SYMPTOM_REVIEW_STEP ? (
          <View style={styles.reviewContent}>
            <Text style={[styles.reviewTitle, { color: c.text, fontFamily: TYPOGRAPHY.fontFamily.bold }]}>Review Your Log</Text>
            <WizardReviewShell>
              <WizardReviewSection title="Basic Information" fields={reviewBasicFields} onEdit={() => openReviewEdit("basic")} />
              <WizardReviewSection title="Bathroom Frequency" fields={reviewBathroomFields} onEdit={() => openReviewEdit("bathroom")} />
              {showLifestyleReview && reviewLifestyleFields.length > 0 ? (
                <WizardReviewSection title="Lifestyle" fields={reviewLifestyleFields} onEdit={() => openReviewEdit("lifestyle")} />
              ) : null}
              {mealReviewEntries.length > 0 ? (
                <WizardReviewMealsSection entries={mealReviewEntries} onEdit={() => openReviewEdit("meals")} />
              ) : null}
              {form.notes.trim() ? <WizardReviewNotesSection notes={form.notes.trim()} onEdit={() => openReviewEdit("notes")} /> : null}
            </WizardReviewShell>
          </View>
        ) : null}
      </ScrollView>

      {currentStep > 0 && currentStep !== SYMPTOM_REVIEW_STEP ? (
        <View style={[styles.footer, { backgroundColor: c.screen, borderTopColor: c.cardBorder }]}>
          <SecondaryButton title="Back" onPress={goBackInternal} />
          <PrimaryButton title="Next" onPress={applyAdvance} />
        </View>
      ) : null}

      {currentStep === SYMPTOM_REVIEW_STEP && !editingReviewSection ? (
        <View style={[styles.footer, { backgroundColor: c.screen, borderTopColor: c.cardBorder }]}>
          <PrimaryButton title={submitting ? "Saving..." : "Save"} onPress={submit} disabled={submitting} />
        </View>
      ) : null}

      {picker && (
        <DateTimePicker
          value={picker === "start" && form.symptomStartDate ? parseYmd(form.symptomStartDate) : picker === "end" && form.symptomEndDate ? parseYmd(form.symptomEndDate) : new Date()}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          maximumDate={new Date()}
          onChange={(event, d) => {
            if (Platform.OS === "android") {
              setPicker(null);
              if (isAndroidDatePickerDismissed(event)) return;
              if (event.type === "set" && d) {
                setForm((p) => ({ ...p, [picker === "start" ? "symptomStartDate" : "symptomEndDate"]: toYmd(d) }));
              }
              return;
            }
            if (d) {
              setForm((p) => ({ ...p, [picker === "start" ? "symptomStartDate" : "symptomEndDate"]: toYmd(d) }));
            }
            setPicker(null);
          }}
        />
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  scrollContent: {
    paddingHorizontal: SPACING.screen,
    paddingTop: SPACING.lg,
    paddingBottom: 120,
  },
  scrollContentLanding: {
    paddingTop: 0,
    paddingBottom: SPACING.xl,
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
  optionChipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.md,
  },
  stepperWrap: {
    alignItems: "flex-start",
  },
  datePicker: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.card,
    borderRadius: RADIUS.button,
    borderWidth: 1.5,
  },
  dateText: {
    fontSize: TYPOGRAPHY.fontSize.md,
  },
  mealRow: {
    gap: SPACING.sm,
  },
  mealFoodInput: {
    flex: 1,
  },
  removeLink: {
    paddingVertical: SPACING.xs,
    alignSelf: "flex-start",
  },
  removeLinkText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
  },
  addLink: {
    paddingVertical: SPACING.sm,
    alignSelf: "flex-start",
  },
  addLinkText: {
    fontSize: TYPOGRAPHY.fontSize.md,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: SPACING.sm,
  },
  switchLabel: {
    flex: 1,
    fontSize: TYPOGRAPHY.fontSize.md,
  },
  reviewContent: {
    gap: SPACING.lg,
  },
  reviewTitle: {
    fontSize: TYPOGRAPHY.fontSize.screenTitle,
  },
  footer: {
    flexDirection: "row",
    gap: SPACING.md,
    paddingHorizontal: SPACING.screen,
    paddingVertical: SPACING.lg,
    borderTopWidth: 1,
  },
});
