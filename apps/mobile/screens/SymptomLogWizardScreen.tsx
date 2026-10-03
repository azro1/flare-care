import { FLARE_FEATURE_LUCIDE, FlareLucideIcon, FLARE_CHROME_LUCIDE } from "../lib/flareLucideIcons";
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
import { HeroCard } from "../components/MidnightLagoonHeroCard";
import { SectionLabel } from "../components/MidnightLagoonSectionLabel";
import { TrayRow } from "../components/MidnightLagoonTray";
import { OptionChip } from "../components/OptionChip";
import { NumberStepper } from "../components/NumberStepper";
import { WizardProgressBar } from "../components/WizardProgressBar";
import { type WizardReviewField } from "../components/symptomReviewLayout";
import { PrimaryButton, SecondaryButton } from "../components/FlareButton";
import { flareFieldErrorStyle, FlareTextInput } from "../components/FlareInput";
import { invalidateDashboardSnapshot } from "../lib/dashboardSnapshotCache";
import { formatUkDate } from "../lib/formatUkDate";
import { supabase, TABLES } from "../lib/supabase";
import { symptomWizardTryAdvance, type DateErrorsState } from "../lib/symptomWizardNextStep";
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
  SYMPTOM_WIZARD_SECTION_LABELS,
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
import { SPACING, RADIUS, TYPOGRAPHY, OPACITY } from "../designTokens";
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

function isDrinkRow(item: MealRow): boolean {
  if (item.kind === "drink") return true;
  if (item.kind === "food") return false;
  return (item.quantity ?? "").toLowerCase().includes("ml");
}

function drinkAmountInputValue(quantity: string): string {
  const q = (quantity ?? "").trim();
  if (!q || q.toLowerCase() === "ml") return "";
  return q.replace(/\s*ml$/i, "");
}

function drinkQuantityFromInput(raw: string): string {
  const digits = raw.replace(/[^0-9]/g, "");
  return digits ? `${digits} ml` : "";
}

const SYMPTOM_REVIEW_STEP = SYMPTOM_WIZARD_REVIEW_STEP;

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
          <FlareLucideIcon icon={FLARE_CHROME_LUCIDE.edit} size={16} color={c.textSecondary} />
        </Pressable>
      </View>
      {children}
    </Card>
  );
}

function ReviewFieldRows({ fields }: { fields: WizardReviewField[] }) {
  const c = useFlareColors();
  return (
    <>
      {fields.map((field, i) => (
        <View key={`${field.label}-${i}`} style={[styles.reviewFieldRow, i > 0 && styles.reviewFieldRowGap]}>
          <Text style={[styles.reviewFieldLabel, { color: c.textSecondary, fontFamily: TYPOGRAPHY.fontFamily.regular }]}>
            {field.label}
          </Text>
          <Text style={[styles.reviewFieldValue, { color: c.text, fontFamily: TYPOGRAPHY.fontFamily.medium }]}>
            {field.value}
          </Text>
        </View>
      ))}
    </>
  );
}

function ReviewHeroChip({ label, value }: { label: string; value: string }) {
  return (
    <View style={[styles.heroChip, { backgroundColor: `rgba(255,255,255,${OPACITY.heroButton})` }]}>
      <Text style={[styles.heroChipText, { color: "#ffffff", fontFamily: TYPOGRAPHY.fontFamily.regular }]}>{label} </Text>
      <Text style={[styles.heroChipText, { color: "#ffffff", fontFamily: TYPOGRAPHY.fontFamily.semibold }]}>{value}</Text>
    </View>
  );
}

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
  const [dateErrors, setDateErrors] = useState<DateErrorsState>({
    day: "",
    month: "",
    year: "",
    endDay: "",
    endMonth: "",
    endYear: "",
  });
  const [history, setHistory] = useState<{ step: number; form: SymptomFormData }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(Boolean(editId));
  const [picker, setPicker] = useState<null | "start" | "end">(null);
  const [editingReviewSection, setEditingReviewSection] = useState<SymptomReviewSectionId | null>(null);
  const scrollRef = useRef<RNScrollView>(null);
  const formRef = useRef(form);
  formRef.current = form;
  const advancingRef = useRef(false);
  const leavingRef = useRef(false);
  const placeRef = useRef("0");
  const numberTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearAdvanceTimers = () => {
    if (numberTimer.current) {
      clearTimeout(numberTimer.current);
      numberTimer.current = null;
    }
    if (textTimer.current) {
      clearTimeout(textTimer.current);
      textTimer.current = null;
    }
  };

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
  placeRef.current = `${currentStep}:${smokingStep10Phase}:${alcoholStep12Phase}`;

  useEffect(() => {
    advancingRef.current = false;
    leavingRef.current = false;
    return () => {
      clearAdvanceTimers();
    };
  }, [currentStep, smokingStep10Phase, alcoholStep12Phase]);

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

  const reviewDurationFields = useMemo((): WizardReviewField[] => {
    const fields: WizardReviewField[] = [
      { label: "Start Date", value: form.symptomStartDate ? formatUkDate(form.symptomStartDate) : "Not set" },
      { label: "Still ongoing", value: form.isOngoing ? "Yes" : "No" },
    ];
    if (!form.isOngoing && form.symptomEndDate) {
      fields.push({ label: "End Date", value: formatUkDate(form.symptomEndDate) });
    }
    return fields;
  }, [form]);

  const reviewSeverityFields = useMemo((): WizardReviewField[] => {
    return [
      { label: "Severity", value: form.severity ? `${form.severity}/10` : "Not set" },
      { label: "Stress Level", value: form.stress_level ? `${form.stress_level}/10` : "Not set" },
    ];
  }, [form]);

  const reviewBathroomFields = useMemo((): WizardReviewField[] => {
    const fields: WizardReviewField[] = [
      {
        label: "Usually",
        value: form.normal_bathroom_frequency ? `${form.normal_bathroom_frequency} a day` : "Not set",
      },
    ];
    if (form.bathroom_frequency_changed === "yes" && form.bathroom_frequency_change_details?.trim()) {
      fields.push({ label: "Change", value: form.bathroom_frequency_change_details.trim() });
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
        label: isSymptomDayToday ? "Smoked today" : "Smoked",
        value: form.smoked_on_symptom_day ? form.smoked_amount_on_symptom_day?.trim() || "Yes" : "No",
      });
    }
    if (isFirstTimeUser && form.smoker === true && form.smoked_amount_on_symptom_day?.trim()) {
      fields.push({
        label: isSymptomDayToday ? "Smoked today" : "Smoked",
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
        label: isSymptomDayToday ? "Drank today" : "Alcohol consumed",
        value: form.drank_on_symptom_day
          ? form.alcohol_units_on_symptom_day?.trim()
            ? `${form.alcohol_units_on_symptom_day.trim()} units`
            : "Yes"
          : "No",
      });
    }
    if (isFirstTimeUser && form.alcohol === true && form.alcohol_units_on_symptom_day?.trim()) {
      fields.push({
        label: isSymptomDayToday ? "Drank today" : "Alcohol consumed",
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
    leavingRef.current = true;
    clearAdvanceTimers();
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
      setDateErrors({ day: "", month: "", year: "", endDay: "", endMonth: "", endYear: "" });
      return true;
    }
    if (editingReviewSection) {
      const previousStep = currentStep - 1;
      if (previousStep >= 1) {
        setCurrentStep(previousStep);
        setFieldErrors({});
        setDateErrors({ day: "", month: "", year: "", endDay: "", endMonth: "", endYear: "" });
        return true;
      }
      returnToReview();
      return true;
    }
    if (editId && currentStep > 1) {
      setCurrentStep((step) => step - 1);
      setFieldErrors({});
      setDateErrors({ day: "", month: "", year: "", endDay: "", endMonth: "", endYear: "" });
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

  const advanceFrom = useCallback(
    (source: SymptomFormData) => {
      if (advancingRef.current) return;
      clearAdvanceTimers();
      const res = symptomWizardTryAdvance({
        currentStep,
        form: source,
        isFirstTimeUser,
        userPreferences,
      });
      if (!res.ok) {
        setForm(source);
        setFieldErrors(res.fieldErrors);
        setDateErrors(res.dateErrors);
        return;
      }
      setFieldErrors({});
      if (res.clearDateErrors) setDateErrors({ day: "", month: "", year: "", endDay: "", endMonth: "", endYear: "" });
      setForm(res.form);
      advancingRef.current = true;
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
      setHistory((h) => [...h, { step: currentStep, form: cloneForm(source) }]);
      setCurrentStep(res.nextStep);
    },
    [currentStep, editingReviewSection, isFirstTimeUser, returnToReview, userPreferences],
  );

  const applyAdvance = useCallback(() => {
    advanceFrom(form);
  }, [advanceFrom, form]);

  /** One completed answer moves on. Back restores it and does not advance again. */
  const chooseSingle = useCallback(
    (patch: Partial<SymptomFormData>) => {
      advanceFrom({ ...form, ...patch });
    },
    [advanceFrom, form],
  );

  const rememberText = (patch: Partial<SymptomFormData>) => {
    const next = { ...formRef.current, ...patch };
    formRef.current = next;
    setForm(next);
  };

  // Blur can fire before Back's press, and again when the field unmounts. Wait so Back can cancel.
  const answerPlace = placeRef.current;
  const finishText = () => {
    if (advancingRef.current || leavingRef.current) return;
    if (textTimer.current) clearTimeout(textTimer.current);
    textTimer.current = setTimeout(() => {
      textTimer.current = null;
      if (advancingRef.current || leavingRef.current) return;
      if (placeRef.current !== answerPlace) return;
      advanceFrom(formRef.current);
    }, 100);
  };

  const queueNumber = (patch: Partial<SymptomFormData>) => {
    const next = { ...formRef.current, ...patch };
    formRef.current = next;
    setForm(next);
    if (numberTimer.current) clearTimeout(numberTimer.current);
    numberTimer.current = setTimeout(() => {
      numberTimer.current = null;
      if (advancingRef.current || leavingRef.current) return;
      if (placeRef.current !== answerPlace) return;
      advanceFrom(next);
    }, 700);
  };

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
    chooseSingle({ [name]: String(value) });
  };

  const mealLabel = (meal: "breakfast" | "lunch" | "dinner") => {
    if (!form.symptomStartDate) return `What did you have for ${meal}?`;
    if (isSymptomDayToday) return `What did you have for ${meal} today?`;
    return `What did you have for ${meal} on ${symptomDayLabel}?`;
  };

  const removeMealRow = (meal: "breakfast" | "lunch" | "dinner", index: number) => {
    setForm((p) => {
      const list = p[meal];
      if (index < 0 || index >= list.length) return p;
      if (list.length <= 1) {
        return { ...p, [meal]: [{ food: "", quantity: "", kind: "food" }] };
      }
      return { ...p, [meal]: list.filter((_, j) => j !== index) };
    });
  };

  const renderMeal = (meal: "breakfast" | "lunch" | "dinner", skipKey: "breakfast_skipped" | "lunch_skipped" | "dinner_skipped") => {
    const list = form[meal];
    const entries = list.map((item, index) => ({ item, index }));
    const foodEntries = entries.filter(({ item }) => !isDrinkRow(item));
    const drinkEntries = entries.filter(({ item }) => isDrinkRow(item));
    const patchRow = (index: number, patch: Partial<MealRow>) => {
      setForm((p) => ({
        ...p,
        [meal]: p[meal].map((row, j) => (j === index ? { ...row, ...patch } : row)),
      }));
    };

    return (
      <View style={styles.stepContent}>
        <Text style={[styles.stepTitle, { color: c.text, fontFamily: TYPOGRAPHY.fontFamily.semibold }]}>{mealLabel(meal)}</Text>
        
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            const newValue = !form[skipKey];
            setForm((p) => ({
              ...p,
              [skipKey]: newValue,
              [meal]: newValue ? [{ food: "", quantity: "", kind: "food" }] : p[meal],
            }));
          }}
          style={[
            styles.skipToggle,
            {
              backgroundColor: form[skipKey] ? c.primary : c.inputBg,
              borderColor: form[skipKey] ? c.primary : c.inputBorder,
            },
          ]}
        >
          <View style={[styles.skipToggleIcon, { backgroundColor: form[skipKey] ? c.white : c.inputBorder }]}>
            <FlareLucideIcon icon={FLARE_CHROME_LUCIDE.check} size={20} color={form[skipKey] ? c.primary : c.textSecondary} />
          </View>
          <View style={styles.skipToggleText}>
            <Text style={[styles.skipToggleLabel, { color: form[skipKey] ? c.white : c.text, fontFamily: TYPOGRAPHY.fontFamily.semibold }]}>
              I didn't eat or drink anything
            </Text>
            <Text style={[styles.skipToggleSublabel, { color: form[skipKey] ? c.white : c.textSecondary, fontFamily: TYPOGRAPHY.fontFamily.regular }]}>
              Skip {meal} for today
            </Text>
          </View>
        </Pressable>

        {!form[skipKey] ? (
          <>
            <SectionLabel>FOOD</SectionLabel>
            <Card noPadding style={{ paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md }}>
              {foodEntries.length === 0 ? (
                <Text style={[styles.emptyText, { color: c.textSecondary, fontFamily: TYPOGRAPHY.fontFamily.regular }]}>No food added yet</Text>
              ) : (
                foodEntries.map(({ item, index }, originalIndex) => {
                  return (
                    <View
                      key={index}
                      style={[styles.mealFoodRow, originalIndex > 0 && styles.mealFoodRowBorder, { borderTopColor: c.cardBorder }]}
                    >
                      <View style={styles.mealRowContent}>
                        <View style={styles.mealRowTop}>
                          <FlareTextInput
                            value={item.food}
                            onChangeText={(t) => patchRow(index, { food: t, kind: "food" })}
                            placeholder="Food name"
                            style={styles.mealNameInput}
                          />
                          <FlareTextInput
                            value={item.quantity && !["Small", "Medium", "Large"].includes(item.quantity) ? item.quantity : item.quantity || ""}
                            onChangeText={(t) => patchRow(index, { quantity: t, kind: "food" })}
                            placeholder="Amount"
                            style={styles.mealAmountInputSmall}
                          />
                        </View>
                        <View style={styles.portionChips}>
                          <OptionChip
                            label="Small"
                            selected={item.quantity === "Small"}
                            onPress={() => patchRow(index, { quantity: "Small", kind: "food" })}
                          />
                          <OptionChip
                            label="Medium"
                            selected={item.quantity === "Medium"}
                            onPress={() => patchRow(index, { quantity: "Medium", kind: "food" })}
                          />
                          <OptionChip
                            label="Large"
                            selected={item.quantity === "Large"}
                            onPress={() => patchRow(index, { quantity: "Large", kind: "food" })}
                          />
                        </View>
                      </View>
                      {list.length > 1 ? (
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel="Remove meal item"
                          hitSlop={10}
                          onPress={() => removeMealRow(meal, index)}
                        >
                          <FlareLucideIcon icon={FLARE_CHROME_LUCIDE.delete} size={20} color={c.textMuted} />
                        </Pressable>
                      ) : null}
                    </View>
                  );
                })
              )}
            </Card>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setForm((p) => ({
                  ...p,
                  [meal]: [...p[meal], { food: "", quantity: "", kind: "food" }],
                }));
              }}
              style={[styles.addFoodButton, { borderColor: c.inputBorder }]}
            >
              <FlareLucideIcon icon={FLARE_CHROME_LUCIDE.add} size={16} color={c.primary} />
              <Text style={[styles.addFoodText, { color: c.primary, fontFamily: TYPOGRAPHY.fontFamily.semibold }]}>Add food</Text>
            </Pressable>

            <SectionLabel>DRINKS</SectionLabel>
            <Card noPadding style={{ paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md }}>
              {drinkEntries.length === 0 ? (
                <Text style={[styles.emptyText, { color: c.textSecondary, fontFamily: TYPOGRAPHY.fontFamily.regular }]}>No drinks added yet</Text>
              ) : (
                drinkEntries.map(({ item, index }, originalIndex) => {
                  return (
                    <View
                      key={index}
                      style={[styles.mealFoodRow, originalIndex > 0 && styles.mealFoodRowBorder, { borderTopColor: c.cardBorder }]}
                    >
                      <View style={styles.mealRowContent}>
                        <View style={styles.mealRowTop}>
                          <FlareTextInput
                            value={item.food}
                            onChangeText={(t) => patchRow(index, { food: t, kind: "drink" })}
                            placeholder="Drink name"
                            style={styles.mealNameInput}
                          />
                          <FlareTextInput
                            value={drinkAmountInputValue(item.quantity)}
                            onChangeText={(t) => patchRow(index, { quantity: drinkQuantityFromInput(t), kind: "drink" })}
                            placeholder="ml"
                            keyboardType="number-pad"
                            style={styles.mealAmountInputSmall}
                          />
                        </View>
                        <View style={styles.portionChips}>
                          <OptionChip
                            label="250 ml"
                            selected={item.quantity === "250 ml"}
                            onPress={() => patchRow(index, { quantity: "250 ml", kind: "drink" })}
                          />
                          <OptionChip
                            label="330 ml"
                            selected={item.quantity === "330 ml"}
                            onPress={() => patchRow(index, { quantity: "330 ml", kind: "drink" })}
                          />
                          <OptionChip
                            label="500 ml"
                            selected={item.quantity === "500 ml"}
                            onPress={() => patchRow(index, { quantity: "500 ml", kind: "drink" })}
                          />
                        </View>
                      </View>
                      {list.length > 1 ? (
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel="Remove meal item"
                          hitSlop={10}
                          onPress={() => removeMealRow(meal, index)}
                        >
                          <FlareLucideIcon icon={FLARE_CHROME_LUCIDE.delete} size={20} color={c.textMuted} />
                        </Pressable>
                      ) : null}
                    </View>
                  );
                })
              )}
            </Card>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setForm((p) => ({
                  ...p,
                  [meal]: [...p[meal], { food: "", quantity: "250 ml", kind: "drink" }],
                }));
              }}
              style={[styles.addFoodButton, { borderColor: c.inputBorder }]}
            >
              <FlareLucideIcon icon={FLARE_CHROME_LUCIDE.add} size={16} color={c.primary} />
              <Text style={[styles.addFoodText, { color: c.primary, fontFamily: TYPOGRAPHY.fontFamily.semibold }]}>Add drink</Text>
            </Pressable>
          </>
        ) : null}

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
            {dateErrors.day ? <Text style={errTextStyle}>{dateErrors.day}</Text> : null}
          </View>
        ) : null}

        {/* Step 2: Ongoing? */}
        {currentStep === 2 ? (
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: c.text, fontFamily: TYPOGRAPHY.fontFamily.semibold }]}>Are symptoms still ongoing?</Text>
            <View style={styles.optionChipRow}>
              <OptionChip label="Yes" selected={form.isOngoing === true} onPress={() => chooseSingle({ isOngoing: true })} />
              <OptionChip label="No" selected={form.isOngoing === false} onPress={() => chooseSingle({ isOngoing: false })} />
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
            {dateErrors.endDay ? <Text style={errTextStyle}>{dateErrors.endDay}</Text> : null}
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
                onChange={(v) => queueNumber({ normal_bathroom_frequency: String(v) })}
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
                onPress={() => chooseSingle({ bathroom_frequency_changed: "yes" })}
              />
              <OptionChip
                label="No"
                selected={form.bathroom_frequency_changed === "no"}
                onPress={() => chooseSingle({ bathroom_frequency_changed: "no" })}
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
              onChangeText={(t) => rememberText({ bathroom_frequency_change_details: t })}
              onBlur={finishText}
              blurOnSubmit
              returnKeyType="done"
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
              <OptionChip label="Yes" selected={form.smoker === true} onPress={() => chooseSingle({ smoker: true })} />
              <OptionChip label="No" selected={form.smoker === false} onPress={() => chooseSingle({ smoker: false })} />
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
              onChangeText={(t) => rememberText({ smoking_habits: t })}
              onBlur={finishText}
              blurOnSubmit
              returnKeyType="done"
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
                onPress={() => chooseSingle({ smoked_on_symptom_day: true })}
              />
              <OptionChip
                label="No"
                selected={form.smoked_on_symptom_day === false}
                onPress={() => chooseSingle({ smoked_on_symptom_day: false })}
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
              onChangeText={(t) => rememberText({ smoked_amount_on_symptom_day: t })}
              onBlur={finishText}
              blurOnSubmit
              returnKeyType="done"
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
              <OptionChip label="Yes" selected={form.alcohol === true} onPress={() => chooseSingle({ alcohol: true })} />
              <OptionChip label="No" selected={form.alcohol === false} onPress={() => chooseSingle({ alcohol: false })} />
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
                onChange={(v) => queueNumber({ average_alcohol_units_pw: String(v) })}
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
                onPress={() => chooseSingle({ drank_on_symptom_day: true })}
              />
              <OptionChip
                label="No"
                selected={form.drank_on_symptom_day === false}
                onPress={() => chooseSingle({ drank_on_symptom_day: false })}
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
                onChange={(v) => queueNumber({ alcohol_units_on_symptom_day: String(v) })}
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
              onChangeText={(t) => rememberText({ notes: t })}
              onBlur={finishText}
              blurOnSubmit
              returnKeyType="done"
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
            <Text style={[styles.reviewPageTitle, { color: c.text, fontFamily: TYPOGRAPHY.fontFamily.bold }]}>
              Review your log
            </Text>
            <Text style={[styles.reviewPageSubtitle, { color: c.textSecondary, fontFamily: TYPOGRAPHY.fontFamily.regular }]}>
              Check everything looks right before saving.
            </Text>

            <HeroCard style={styles.reviewHero}>
              <Text style={[styles.heroLabel, { fontFamily: TYPOGRAPHY.fontFamily.semibold }]}>THIS FLARE</Text>
              <Text style={[styles.heroTitle, { fontFamily: TYPOGRAPHY.fontFamily.bold }]}>
                {form.symptomStartDate ? `Started ${formatUkDate(form.symptomStartDate)}` : "Symptom Log"}
                {form.isOngoing ? ", still ongoing" : ""}
              </Text>
              {form.isOngoing && form.symptomStartDate ? (
                <Text style={[styles.heroDuration, { fontFamily: TYPOGRAPHY.fontFamily.regular }]}>
                  {Math.ceil((new Date().getTime() - parseYmd(form.symptomStartDate).getTime()) / (1000 * 60 * 60 * 24))} days so far
                </Text>
              ) : null}
              {form.severity || form.stress_level ? (
                <View style={styles.heroChips}>
                  {form.severity ? (
                    <ReviewHeroChip
                      label="Severity"
                      value={SEVERITY_WORD_OPTIONS.find((o) => String(o.value) === form.severity)?.label || form.severity}
                    />
                  ) : null}
                  {form.stress_level ? (
                    <ReviewHeroChip
                      label="Stress"
                      value={STRESS_WORD_OPTIONS.find((o) => String(o.value) === form.stress_level)?.label || form.stress_level}
                    />
                  ) : null}
                </View>
              ) : null}
            </HeroCard>

            <ReviewSectionCard title={SYMPTOM_WIZARD_SECTION_LABELS.duration} onEdit={() => openReviewEdit("duration")}>
              <ReviewFieldRows fields={reviewDurationFields} />
            </ReviewSectionCard>

            <ReviewSectionCard title={SYMPTOM_WIZARD_SECTION_LABELS.severity} onEdit={() => openReviewEdit("severity")}>
              <ReviewFieldRows fields={reviewSeverityFields} />
            </ReviewSectionCard>

            <ReviewSectionCard title={SYMPTOM_WIZARD_SECTION_LABELS.bathroom} onEdit={() => openReviewEdit("bathroom")}>
              <ReviewFieldRows fields={reviewBathroomFields} />
            </ReviewSectionCard>

            {showLifestyleReview && reviewLifestyleFields.length > 0 ? (
              <ReviewSectionCard title={SYMPTOM_WIZARD_SECTION_LABELS.lifestyle} onEdit={() => openReviewEdit("lifestyle")}>
                <ReviewFieldRows fields={reviewLifestyleFields} />
              </ReviewSectionCard>
            ) : null}

            {mealReviewEntries.length > 0 ? (
              <ReviewSectionCard title={SYMPTOM_WIZARD_SECTION_LABELS.meals} onEdit={() => openReviewEdit("meals")}>
                <ReviewFieldRows
                  fields={mealReviewEntries.map((entry) => ({
                    label: entry.label,
                    value: entry.skipped
                      ? "Skipped"
                      : (entry.items ?? []).map((item) => `${item.food}${item.quantity ? ` (${item.quantity})` : ""}`).join(", "),
                  }))}
                />
              </ReviewSectionCard>
            ) : null}

            {form.notes.trim() ? (
              <ReviewSectionCard title={SYMPTOM_WIZARD_SECTION_LABELS.notes} onEdit={() => openReviewEdit("notes")}>
                <Text style={[styles.reviewNotesText, { color: c.text, fontFamily: TYPOGRAPHY.fontFamily.regular }]}>
                  {`\u201C${form.notes.trim()}\u201D`}
                </Text>
              </ReviewSectionCard>
            ) : null}
          </View>
        ) : null}
      </ScrollView>

      {currentStep > 0 && currentStep !== SYMPTOM_REVIEW_STEP ? (
        <View style={[styles.footer, { backgroundColor: c.screen, borderTopColor: c.cardBorder }]}>
          <SecondaryButton title="Back" onPress={goBackInternal} />
          {currentStep >= 13 && currentStep <= 16 ? <PrimaryButton title="Next" onPress={applyAdvance} /> : null}
        </View>
      ) : null}

      {currentStep === SYMPTOM_REVIEW_STEP && !editingReviewSection ? (
        <View style={[styles.fixedFooter, { backgroundColor: c.screen, borderTopColor: c.cardBorder }]}>
          <PrimaryButton title={submitting ? "Saving..." : "Save log"} onPress={submit} disabled={submitting} />
        </View>
      ) : null}

      {picker && (
        <DateTimePicker
          value={picker === "start" && form.symptomStartDate ? parseYmd(form.symptomStartDate) : picker === "end" && form.symptomEndDate ? parseYmd(form.symptomEndDate) : new Date()}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          minimumDate={picker === "end" && form.symptomStartDate ? parseYmd(form.symptomStartDate) : undefined}
          maximumDate={new Date()}
          onChange={(event, d) => {
            const commit = (date: Date) => {
              chooseSingle(picker === "start" ? { symptomStartDate: toYmd(date) } : { symptomEndDate: toYmd(date) });
            };
            if (Platform.OS === "android") {
              setPicker(null);
              if (isAndroidDatePickerDismissed(event)) return;
              if (event.type === "set" && d) commit(d);
              return;
            }
            setPicker(null);
            if (d) commit(d);
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
  skipToggle: {
    flexDirection: "row",
    alignItems: "center",
    padding: SPACING.lg,
    borderRadius: RADIUS.card,
    borderWidth: 2,
    gap: SPACING.md,
  },
  skipToggleIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  skipToggleText: {
    flex: 1,
    gap: SPACING.xxs,
  },
  skipToggleLabel: {
    fontSize: TYPOGRAPHY.fontSize.md,
  },
  skipToggleSublabel: {
    fontSize: TYPOGRAPHY.fontSize.sm,
  },
  portionChips: {
    flexDirection: "row",
    gap: SPACING.xs,
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
  mealFoodRowLeft: {
    flex: 1,
    gap: SPACING.xs,
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
  mealFoodName: {
    fontSize: TYPOGRAPHY.fontSize.md,
    flex: 1,
  },
  mealFoodHint: {
    fontSize: TYPOGRAPHY.fontSize.sm,
  },
  mealAmountRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  mealAmountInput: {
    flex: 1,
  },
  mealAmountInputSmall: {
    minWidth: 80,
  },
  emptyText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    paddingVertical: SPACING.md,
    textAlign: "center",
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
  reviewHero: {
    marginTop: SPACING.md,
    marginBottom: SPACING.lg,
  },
  heroLabel: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: "rgba(255,255,255,0.82)",
    marginBottom: SPACING.xs,
  },
  heroTitle: {
    fontSize: TYPOGRAPHY.fontSize.stat,
    lineHeight: 26,
    color: "#ffffff",
  },
  heroDuration: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    lineHeight: 18,
    color: "rgba(255,255,255,0.9)",
    marginTop: SPACING.xxs,
  },
  heroChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  heroChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.button,
  },
  heroChipText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
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
  reviewNotesText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    lineHeight: 22,
    fontStyle: "italic",
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
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: SPACING.screen,
  },
  modalCard: {
    width: "100%",
    maxWidth: 400,
    gap: SPACING.lg,
  },
  modalTitle: {
    fontSize: TYPOGRAPHY.fontSize.cardTitle,
  },
  modalButtons: {
    flexDirection: "row",
    gap: SPACING.md,
  },
});
