import { FLARE_FEATURE_LUCIDE, FlareLucideIcon } from "../lib/flareLucideIcons";
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
  Switch,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { showFlareAlert } from "../components/FlareAlertHost";
import { ScrollView } from "../lib/scrollViews";
import {
  WizardReviewMealsSection,
  WizardReviewNotesSection,
  WizardReviewSection,
  type WizardReviewField,
} from "../components/symptomReviewLayout";
import { EntryPrimaryButton, PrimaryButton, SecondaryButton } from "../components/FlareButton";
import { flareFieldErrorStyle, FlareInputTrigger, FlareTextInput } from "../components/FlareInput";
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
  symptomLogRowToForm,
  type SymptomReviewSectionId,
  SEVERITY_WORD_OPTIONS,
  STRESS_WORD_OPTIONS,
  type MealRow,
  type SymptomFormData,
  type UserPreferencesShape,
  updateSymptomLog,
  upsertUserPreferencesMobile,
  wizardRatingToBand,
} from "../lib/symptomWizardShared";
import { useFlareColors } from "../theme";
import { FULL_WIDTH_CTA_EDGE_PADDING, LANDING_CTA_SIDE_PAD, QUESTIONNAIRE_STEP_FOOTER, QUESTIONNAIRE_STEP_OPTION_LIST, QUESTIONNAIRE_STEP_RADIO_ROW, QUESTIONNAIRE_STEP_SCROLL, QUESTIONNAIRE_STEP_SCROLL_BOTTOM, QUESTIONNAIRE_STEP_TITLE } from "../lib/layoutConstants";

type SessionUser = { id: string };

/** Cleared on leave/submit — no draft resume (matches web symptoms wizard unmount). */
function symptomWizardStorageKeys(userId: string) {
  return [`symptom-wizard-mobile-step:${userId}`, `symptom-wizard-mobile-form:${userId}`];
}

async function clearSymptomWizardStorage(userId: string) {
  await AsyncStorage.multiRemove(symptomWizardStorageKeys(userId));
}

/** Example wording aligned with web `src/app/symptoms/page.js` helper `<p>` copy — mobile uses as input placeholders only */
const PLACEHOLDER_BATHROOM_CHANGE_EXAMPLE = "e.g. more often, blood, or loose stools";
const PLACEHOLDER_SMOKE_DAY_AMOUNT_EXAMPLE = "e.g. 3 cigarettes or 1 cigar";
const PLACEHOLDER_SMOKE_AMOUNT_RETURNING_EXAMPLE = "e.g. 5 cigarettes or 1 cigar";
const PLACEHOLDER_SMOKING_HABITS_EXAMPLE = "e.g. 1 pack of cigarettes per day";
const PLACEHOLDER_ALCOHOL_UNITS_EXAMPLE = "e.g. 0.5 or 2";

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

/** Android date dialog: Cancel fires `onChange` with `type: "dismissed"` — must not commit a date. */
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
  const { height: windowHeight } = useWindowDimensions();
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
        showFlareAlert("Could not load entry", "This symptom log could not be opened for editing.");
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
      { label: "Start Date", value: form.symptomStartDate ? formatUkDate(form.symptomStartDate) : "Not set", valueSize: "caption" },
      { label: "Status", value: form.isOngoing ? "Ongoing" : "Ended" },
      { label: "Severity", value: form.severity ? `${form.severity}/10` : "Not set", valueSize: "caption" },
      { label: "Stress Level", value: form.stress_level ? `${form.stress_level}/10` : "Not set", valueSize: "caption" },
    ];
    if (!form.isOngoing && form.symptomEndDate) {
      fields.splice(2, 0, { label: "End Date", value: formatUkDate(form.symptomEndDate), valueSize: "caption" });
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
    setDateErrors({ day: "", month: "", year: "", endDay: "", endMonth: "", endYear: "" });
  }, []);

  const openReviewEdit = useCallback(
    (section: SymptomReviewSectionId) => {
      const entryStep = getSymptomReviewEditStep(section, isFirstTimeUser, userPreferences);
      if (entryStep == null) return;
      setEditingReviewSection(section);
      setCurrentStep(entryStep);
      setFieldErrors({});
      setDateErrors({ day: "", month: "", year: "", endDay: "", endMonth: "", endYear: "" });
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
      // Don't return to landing (step 0) — exit the wizard like Track Medications / Wellbeing.
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

  const applyAdvance = useCallback(() => {
    const res = symptomWizardTryAdvance({
      currentStep,
      form,
      isFirstTimeUser,
      userPreferences,
    });
    if (!res.ok) {
      setFieldErrors(res.fieldErrors);
      setDateErrors(res.dateErrors);
      return;
    }
    setFieldErrors({});
    if (res.clearDateErrors) setDateErrors({ day: "", month: "", year: "", endDay: "", endMonth: "", endYear: "" });
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
      showFlareAlert("Missing information", "Please add some notes or meal information to log this entry.");
      return;
    }
    if (!form.isOngoing && !form.symptomEndDate) {
      showFlareAlert("Missing end date", "Please specify when symptoms ended.");
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
        showFlareAlert("Saved", "Your symptom log was updated.");
      } else {
        navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: "Dashboard" }] }));
        showFlareAlert("Saved", "Your symptom log was saved. To view, tap Logs.");
      }
    } catch (e: any) {
      showFlareAlert("Could not save", e?.message || "Unknown error");
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
    const canAdd =
      Boolean(last?.food.trim() && last?.quantity.trim()) && !form[skipKey];

    return (
    <View>
      <Text style={[styles.h3, { color: c.text }]}>{mealLabel(meal)}</Text>
      {list.map((item, i) => (
        <View key={i} style={[styles.mealEntryWrap, i === 0 ? styles.mealEntryWrapFirst : null]}>
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
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              onPress={() => removeMealRow(meal, i)}
              style={styles.removeItemLink}
            >
              <Text style={{ color: c.textMuted, fontFamily: "Inter_600SemiBold" }}>Remove</Text>
            </Pressable>
          ) : null}
        </View>
      ))}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Add another ${meal} item`}
        disabled={!canAdd}
        hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
        onPress={() => {
          if (!canAdd) return;
          setForm((p) => ({
            ...p,
            [meal]: [...p[meal], { food: "", quantity: "" }],
            [skipKey]: false,
          }));
        }}
        style={styles.addItemLink}
      >
        <Text style={{ color: c.primary, fontFamily: "Inter_700Bold", opacity: canAdd ? 1 : 0.45 }}>
          Add item
        </Text>
      </Pressable>
      <View style={styles.switchRow}>
        <Text style={{ color: c.text, flex: 1 }}>I didn&apos;t eat anything</Text>
        <Switch
          value={form[skipKey]}
          trackColor={{
            false: c.isDark ? "#57534e" : "#94a3b8",
            true: c.primary,
          }}
          thumbColor={c.white}
          ios_backgroundColor={c.isDark ? "#57534e" : "#94a3b8"}
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
            {/* Same surface token as home `Card` (`c.card`) — matches section panels */}
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
              <FlareLucideIcon icon={FLARE_FEATURE_LUCIDE.symptoms} size={28} color={c.primary} />
            </View>
            <Text style={[styles.landingTitle, { color: c.text }]}>Log Symptoms</Text>
            <Text style={[styles.landingSub, { color: c.textMuted }]}>
              Tell us about your symptoms and any other related details.
            </Text>
            <View style={styles.landingCta}>
              <EntryPrimaryButton title="Start now" onPress={startWizard} noTopMargin />
            </View>
          </View>
        ) : null}

        {currentStep === 1 ? (
          <View>
            <Text style={[styles.h3, { color: c.text }]}>When did your symptoms begin?</Text>
            <FlareInputTrigger pickerIcon="date" onPress={() => setPicker("start")}>
              <Text style={{ color: form.symptomStartDate ? c.text : c.textMuted }}>
                {form.symptomStartDate ? formatUkDate(form.symptomStartDate) : ""}
              </Text>
            </FlareInputTrigger>
            {dateErrors.day ? <Text style={errTextStyle}>{dateErrors.day}</Text> : null}
            {picker === "start" ? (
              <DateTimePicker
                value={form.symptomStartDate ? parseYmd(form.symptomStartDate) : new Date()}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                maximumDate={new Date()}
                minimumDate={new Date(2020, 0, 1)}
                onChange={(event, d) => {
                  if (Platform.OS === "android") setPicker(null);
                  if (isAndroidDatePickerDismissed(event)) return;
                  if (d) setForm((p) => ({ ...p, symptomStartDate: toYmd(d) }));
                }}
              />
            ) : null}
            {Platform.OS === "ios" && picker === "start" ? <PrimaryButton title="Done" onPress={() => setPicker(null)} /> : null}
          </View>
        ) : null}

        {currentStep === 2 ? (
          <View>
            <Text style={[styles.h3, { color: c.text }]}>Are symptoms still ongoing?</Text>
            <View style={styles.rowGap}>
              <Pressable style={styles.radioRow} onPress={() => setForm((p) => ({ ...p, isOngoing: true }))}>
                <View style={[styles.radioOuter, { borderColor: c.cardBorder }]}>{form.isOngoing === true ? <View style={[styles.radioInner, { backgroundColor: c.primary }]} /> : null}</View>
                <Text style={{ color: c.text }}>Yes</Text>
              </Pressable>
              <Pressable style={styles.radioRow} onPress={() => setForm((p) => ({ ...p, isOngoing: false }))}>
                <View style={[styles.radioOuter, { borderColor: c.cardBorder }]}>{form.isOngoing === false ? <View style={[styles.radioInner, { backgroundColor: c.primary }]} /> : null}</View>
                <Text style={{ color: c.text }}>No</Text>
              </Pressable>
            </View>
            {fieldErrors.isOngoing ? <Text style={errTextStyle}>{fieldErrors.isOngoing}</Text> : null}
          </View>
        ) : null}

        {currentStep === 3 ? (
          <View>
            <Text style={[styles.h3, { color: c.text }]}>When did symptoms end?</Text>
            <FlareInputTrigger pickerIcon="date" onPress={() => setPicker("end")}>
              <Text style={{ color: form.symptomEndDate ? c.text : c.textMuted }}>
                {form.symptomEndDate ? formatUkDate(form.symptomEndDate) : ""}
              </Text>
            </FlareInputTrigger>
            {dateErrors.endDay ? <Text style={errTextStyle}>{dateErrors.endDay}</Text> : null}
            {picker === "end" ? (
              <DateTimePicker
                value={form.symptomEndDate ? parseYmd(form.symptomEndDate) : new Date()}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                maximumDate={new Date()}
                minimumDate={form.symptomStartDate ? parseYmd(form.symptomStartDate) : new Date(2020, 0, 1)}
                onChange={(event, d) => {
                  if (Platform.OS === "android") setPicker(null);
                  if (isAndroidDatePickerDismissed(event)) return;
                  if (d) setForm((p) => ({ ...p, symptomEndDate: toYmd(d) }));
                }}
              />
            ) : null}
            {Platform.OS === "ios" && picker === "end" ? <PrimaryButton title="Done" onPress={() => setPicker(null)} /> : null}
          </View>
        ) : null}

        {currentStep === 4 ? (
          <View>
            <Text style={[styles.h3, { color: c.text }]}>
              {form.isOngoing ? "How severe are your symptoms?" : "How severe were your symptoms?"}
            </Text>
            <View style={styles.rowGap}>
              {SEVERITY_WORD_OPTIONS.map((opt) => {
                const band = form.severity ? wizardRatingToBand(form.severity) : null;
                const selected = band !== null && band === opt.value;
                return (
                  <Pressable key={opt.value} style={styles.radioRow} onPress={() => setRating("severity", opt.value)}>
                    <View style={[styles.radioOuter, { borderColor: c.cardBorder }]}>
                      {selected ? <View style={[styles.radioInner, { backgroundColor: c.primary }]} /> : null}
                    </View>
                    <Text style={{ color: c.text, flex: 1 }}>{opt.label}</Text>
                  </Pressable>
                );
              })}
            </View>
            {fieldErrors.severity ? <Text style={errTextStyle}>{fieldErrors.severity}</Text> : null}
          </View>
        ) : null}

        {currentStep === 5 ? (
          <View>
            <Text style={[styles.h3, { color: c.text }]}>
              {form.isOngoing ? "How stressed are you feeling?" : "How stressed were you feeling during that time?"}
            </Text>
            <View style={styles.rowGap}>
              {STRESS_WORD_OPTIONS.map((opt) => {
                const band = form.stress_level ? wizardRatingToBand(form.stress_level) : null;
                const selected = band !== null && band === opt.value;
                return (
                  <Pressable key={opt.value} style={styles.radioRow} onPress={() => setRating("stress_level", opt.value)}>
                    <View style={[styles.radioOuter, { borderColor: c.cardBorder }]}>
                      {selected ? <View style={[styles.radioInner, { backgroundColor: c.primary }]} /> : null}
                    </View>
                    <Text style={{ color: c.text, flex: 1 }}>{opt.label}</Text>
                  </Pressable>
                );
              })}
            </View>
            {fieldErrors.stress_level ? <Text style={errTextStyle}>{fieldErrors.stress_level}</Text> : null}
          </View>
        ) : null}

        {currentStep === 6 ? (
          <View>
            <Text style={[styles.h3, { color: c.text }]}>How many times a day do you usually empty your bowels?</Text>
            <FlareTextInput
              keyboardType="number-pad"
              value={form.normal_bathroom_frequency}
              onChangeText={(t) => {
                if (t.length > 2) return;
                const n = parseInt(t, 10);
                if (t && (Number.isNaN(n) || n < 0 || n > 99)) return;
                setForm((p) => ({ ...p, normal_bathroom_frequency: t }));
              }}
              placeholder="e.g. 1 or 3"
            />
            {fieldErrors.normal_bathroom_frequency ? <Text style={errTextStyle}>{fieldErrors.normal_bathroom_frequency}</Text> : null}
          </View>
        ) : null}

        {currentStep === 7 ? (
          <View>
            <Text style={[styles.h3, { color: c.text }]}>
              {form.isOngoing
                ? "Have you noticed a change in bathroom frequency since symptoms started?"
                : "Did you notice a change in bathroom frequency during that time?"}
            </Text>
            <View style={styles.rowGap}>
              {(["yes", "no"] as const).map((v) => (
                <Pressable key={v} style={styles.radioRow} onPress={() => setForm((p) => ({ ...p, bathroom_frequency_changed: v }))}>
                  <View style={[styles.radioOuter, { borderColor: c.cardBorder }]}>
                    {form.bathroom_frequency_changed === v ? <View style={[styles.radioInner, { backgroundColor: c.primary }]} /> : null}
                  </View>
                  <Text style={{ color: c.text }}>{v === "yes" ? "Yes" : "No"}</Text>
                </Pressable>
              ))}
            </View>
            {fieldErrors.bathroom_frequency_changed ? <Text style={errTextStyle}>{fieldErrors.bathroom_frequency_changed}</Text> : null}
          </View>
        ) : null}

        {currentStep === 8 ? (
          <View>
            <Text style={[styles.h3, { color: c.text }]}>Describe your change</Text>
            <FlareTextInput
              multiline
              placeholder={PLACEHOLDER_BATHROOM_CHANGE_EXAMPLE}
              value={form.bathroom_frequency_change_details}
              onChangeText={(t) => setForm((p) => ({ ...p, bathroom_frequency_change_details: t }))}
            />
            {fieldErrors.bathroom_frequency_change_details ? <Text style={errTextStyle}>{fieldErrors.bathroom_frequency_change_details}</Text> : null}
          </View>
        ) : null}

        {currentStep === 9 ? (
          <View>
            <Text style={[styles.h3, { color: c.text }]}>
              {isFirstTimeUser
                ? "Do you smoke?"
                : userPreferences?.isSmoker
                  ? isSymptomDayToday
                    ? "Did you smoke today?"
                    : `Did you smoke on ${symptomDayLabel}?`
                  : "Do you smoke?"}
            </Text>
            <View style={styles.rowGap}>
              <Pressable
                style={styles.radioRow}
                onPress={() =>
                  setForm((p) =>
                    !isFirstTimeUser && userPreferences?.isSmoker ? { ...p, smoked_on_symptom_day: true } : { ...p, smoker: true },
                  )
                }
              >
                <View style={[styles.radioOuter, { borderColor: c.cardBorder }]}>
                  {(!isFirstTimeUser && userPreferences?.isSmoker ? form.smoked_on_symptom_day === true : form.smoker === true) ? (
                    <View style={[styles.radioInner, { backgroundColor: c.primary }]} />
                  ) : null}
                </View>
                <Text style={{ color: c.text }}>Yes</Text>
              </Pressable>
              <Pressable
                style={styles.radioRow}
                onPress={() =>
                  setForm((p) =>
                    !isFirstTimeUser && userPreferences?.isSmoker ? { ...p, smoked_on_symptom_day: false } : { ...p, smoker: false },
                  )
                }
              >
                <View style={[styles.radioOuter, { borderColor: c.cardBorder }]}>
                  {(!isFirstTimeUser && userPreferences?.isSmoker ? form.smoked_on_symptom_day === false : form.smoker === false) ? (
                    <View style={[styles.radioInner, { backgroundColor: c.primary }]} />
                  ) : null}
                </View>
                <Text style={{ color: c.text }}>No</Text>
              </Pressable>
            </View>
            {fieldErrors.smoked_on_symptom_day ? <Text style={errTextStyle}>{fieldErrors.smoked_on_symptom_day}</Text> : null}
            {fieldErrors.smoker ? <Text style={errTextStyle}>{fieldErrors.smoker}</Text> : null}
          </View>
        ) : null}

        {currentStep === 10 ? (
          <View>
            {form.smoker === true && smokingStep10Phase === "dayAmount" ? (
              <>
                <Text style={[styles.h3, { color: c.text }]}>
                  {!isFirstTimeUser
                    ? "How much did you smoke?"
                    : isSymptomDayToday
                      ? "How much did you smoke today?"
                      : `How much did you smoke on ${symptomDayLabel}?`}
                </Text>
                <FlareTextInput
                  placeholder={PLACEHOLDER_SMOKE_DAY_AMOUNT_EXAMPLE}
                  value={form.smoked_amount_on_symptom_day}
                  onChangeText={(t) => setForm((p) => ({ ...p, smoked_amount_on_symptom_day: t }))}
                />
                {fieldErrors.smoked_amount_on_symptom_day ? <Text style={errTextStyle}>{fieldErrors.smoked_amount_on_symptom_day}</Text> : null}
              </>
            ) : form.smoker === true && smokingStep10Phase === "dayYesNo" ? (
              <>
                <Text style={[styles.h3, { color: c.text }]}>
                  {isSymptomDayToday ? "Did you smoke today?" : `Did you smoke on ${symptomDayLabel}?`}
                </Text>
                <View style={styles.rowGap}>
                  <Pressable style={styles.radioRow} onPress={() => setForm((p) => ({ ...p, smoked_on_symptom_day: true }))}>
                    <View style={[styles.radioOuter, { borderColor: c.cardBorder }]}>
                      {form.smoked_on_symptom_day === true ? <View style={[styles.radioInner, { backgroundColor: c.primary }]} /> : null}
                    </View>
                    <Text style={{ color: c.text }}>Yes</Text>
                  </Pressable>
                  <Pressable style={styles.radioRow} onPress={() => setForm((p) => ({ ...p, smoked_on_symptom_day: false }))}>
                    <View style={[styles.radioOuter, { borderColor: c.cardBorder }]}>
                      {form.smoked_on_symptom_day === false ? <View style={[styles.radioInner, { backgroundColor: c.primary }]} /> : null}
                    </View>
                    <Text style={{ color: c.text }}>No</Text>
                  </Pressable>
                </View>
                {fieldErrors.smoked_on_symptom_day ? <Text style={errTextStyle}>{fieldErrors.smoked_on_symptom_day}</Text> : null}
              </>
            ) : (
              <>
                <Text style={[styles.h3, { color: c.text }]}>
                  {!isFirstTimeUser && userPreferences?.isSmoker ? "How much did you smoke?" : "Please describe your smoking habits"}
                </Text>
                <FlareTextInput
                  placeholder={
                    !isFirstTimeUser && userPreferences?.isSmoker
                      ? PLACEHOLDER_SMOKE_AMOUNT_RETURNING_EXAMPLE
                      : PLACEHOLDER_SMOKING_HABITS_EXAMPLE
                  }
                  value={!isFirstTimeUser && userPreferences?.isSmoker ? form.smoked_amount_on_symptom_day : form.smoking_habits}
                  onChangeText={(t) =>
                    setForm((p) =>
                      !isFirstTimeUser && userPreferences?.isSmoker ? { ...p, smoked_amount_on_symptom_day: t } : { ...p, smoking_habits: t },
                    )
                  }
                />
                {fieldErrors.smoked_amount_on_symptom_day ? <Text style={errTextStyle}>{fieldErrors.smoked_amount_on_symptom_day}</Text> : null}
                {fieldErrors.smoking_habits ? <Text style={errTextStyle}>{fieldErrors.smoking_habits}</Text> : null}
              </>
            )}
          </View>
        ) : null}

        {currentStep === 11 ? (
          <View>
            <Text style={[styles.h3, { color: c.text }]}>
              {isFirstTimeUser
                ? "Do you drink alcohol?"
                : userPreferences?.isDrinker
                  ? isSymptomDayToday
                    ? "Did you drink alcohol today?"
                    : `Did you drink alcohol on ${symptomDayLabel}?`
                  : "Do you drink alcohol?"}
            </Text>
            <View style={styles.rowGap}>
              <Pressable
                style={styles.radioRow}
                onPress={() =>
                  setForm((p) => (!isFirstTimeUser && userPreferences?.isDrinker ? { ...p, drank_on_symptom_day: true } : { ...p, alcohol: true }))
                }
              >
                <View style={[styles.radioOuter, { borderColor: c.cardBorder }]}>
                  {(!isFirstTimeUser && userPreferences?.isDrinker ? form.drank_on_symptom_day === true : form.alcohol === true) ? (
                    <View style={[styles.radioInner, { backgroundColor: c.primary }]} />
                  ) : null}
                </View>
                <Text style={{ color: c.text }}>Yes</Text>
              </Pressable>
              <Pressable
                style={styles.radioRow}
                onPress={() =>
                  setForm((p) => (!isFirstTimeUser && userPreferences?.isDrinker ? { ...p, drank_on_symptom_day: false } : { ...p, alcohol: false }))
                }
              >
                <View style={[styles.radioOuter, { borderColor: c.cardBorder }]}>
                  {(!isFirstTimeUser && userPreferences?.isDrinker ? form.drank_on_symptom_day === false : form.alcohol === false) ? (
                    <View style={[styles.radioInner, { backgroundColor: c.primary }]} />
                  ) : null}
                </View>
                <Text style={{ color: c.text }}>No</Text>
              </Pressable>
            </View>
            {fieldErrors.drank_on_symptom_day ? <Text style={errTextStyle}>{fieldErrors.drank_on_symptom_day}</Text> : null}
            {fieldErrors.alcohol ? <Text style={errTextStyle}>{fieldErrors.alcohol}</Text> : null}
          </View>
        ) : null}

        {currentStep === 12 ? (
          <View>
            {form.alcohol === true && alcoholStep12Phase === "dayAmount" ? (
              <>
                <Text style={[styles.h3, { color: c.text }]}>
                  {isSymptomDayToday
                    ? "How many units of alcohol did you drink today?"
                    : `How many units of alcohol did you drink on ${symptomDayLabel}?`}
                </Text>
                <FlareTextInput
                  keyboardType="decimal-pad"
                  placeholder={PLACEHOLDER_ALCOHOL_UNITS_EXAMPLE}
                  value={form.alcohol_units_on_symptom_day}
                  onChangeText={(t) => setForm((p) => ({ ...p, alcohol_units_on_symptom_day: t }))}
                />
                {fieldErrors.alcohol_units_on_symptom_day ? <Text style={errTextStyle}>{fieldErrors.alcohol_units_on_symptom_day}</Text> : null}
              </>
            ) : form.alcohol === true && alcoholStep12Phase === "dayYesNo" ? (
              <>
                <Text style={[styles.h3, { color: c.text }]}>
                  {isSymptomDayToday ? "Did you drink alcohol today?" : `Did you drink alcohol on ${symptomDayLabel}?`}
                </Text>
                <View style={styles.rowGap}>
                  <Pressable style={styles.radioRow} onPress={() => setForm((p) => ({ ...p, drank_on_symptom_day: true }))}>
                    <View style={[styles.radioOuter, { borderColor: c.cardBorder }]}>
                      {form.drank_on_symptom_day === true ? <View style={[styles.radioInner, { backgroundColor: c.primary }]} /> : null}
                    </View>
                    <Text style={{ color: c.text }}>Yes</Text>
                  </Pressable>
                  <Pressable style={styles.radioRow} onPress={() => setForm((p) => ({ ...p, drank_on_symptom_day: false }))}>
                    <View style={[styles.radioOuter, { borderColor: c.cardBorder }]}>
                      {form.drank_on_symptom_day === false ? <View style={[styles.radioInner, { backgroundColor: c.primary }]} /> : null}
                    </View>
                    <Text style={{ color: c.text }}>No</Text>
                  </Pressable>
                </View>
                {fieldErrors.drank_on_symptom_day ? <Text style={errTextStyle}>{fieldErrors.drank_on_symptom_day}</Text> : null}
              </>
            ) : (
              <>
                <Text style={[styles.h3, { color: c.text }]}>
                  {!isFirstTimeUser && userPreferences?.isDrinker
                    ? "How many units of alcohol did you drink?"
                    : "On average, how many units of alcohol do you drink per week?"}
                </Text>
                <FlareTextInput
                  keyboardType="decimal-pad"
                  placeholder={PLACEHOLDER_ALCOHOL_UNITS_EXAMPLE}
                  value={!isFirstTimeUser && userPreferences?.isDrinker ? form.alcohol_units_on_symptom_day : form.average_alcohol_units_pw}
                  onChangeText={(t) =>
                    setForm((p) =>
                      !isFirstTimeUser && userPreferences?.isDrinker ? { ...p, alcohol_units_on_symptom_day: t } : { ...p, average_alcohol_units_pw: t },
                    )
                  }
                />
                {fieldErrors.alcohol_units_on_symptom_day ? <Text style={errTextStyle}>{fieldErrors.alcohol_units_on_symptom_day}</Text> : null}
                {fieldErrors.average_alcohol_units_pw ? <Text style={errTextStyle}>{fieldErrors.average_alcohol_units_pw}</Text> : null}
              </>
            )}
          </View>
        ) : null}

        {currentStep === 13 ? renderMeal("breakfast", "breakfast_skipped") : null}
        {currentStep === 14 ? renderMeal("lunch", "lunch_skipped") : null}
        {currentStep === 15 ? renderMeal("dinner", "dinner_skipped") : null}

        {currentStep === 16 ? (
          <View>
            <Text style={[styles.h3, { color: c.text }]}>Additional notes</Text>
            <FlareTextInput
              multiline
              placeholder="Anything else you would like to add…"
              value={form.notes}
              onChangeText={(t) => setForm((p) => ({ ...p, notes: t }))}
            />
          </View>
        ) : null}

        {currentStep === 17 ? (
          <View>
            <WizardReviewSection title="Basic Information" fields={reviewBasicFields} onEdit={() => openReviewEdit("basic")} />
            <WizardReviewSection
              title="Bathroom Frequency"
              fields={reviewBathroomFields}
              onEdit={() => openReviewEdit("bathroom")}
            />
            {reviewLifestyleFields.length > 0 ? (
              <WizardReviewSection
                title="Lifestyle"
                fields={reviewLifestyleFields}
                onEdit={() => openReviewEdit("lifestyle")}
              />
            ) : null}
            <WizardReviewMealsSection entries={mealReviewEntries} onEdit={() => openReviewEdit("meals")} />
            <WizardReviewNotesSection notes={form.notes} onEdit={() => openReviewEdit("notes")} />
          </View>
        ) : null}

        {currentStep > 0 ? (
          <View
            style={[
              styles.footerBtns,
              currentStep === SYMPTOM_REVIEW_STEP && !editingReviewSection && styles.footerBtnsReview,
            ]}
          >
            {editingReviewSection ? (
              <>
                <PrimaryButton title="Back to review" onPress={returnToReview} />
                {currentStep < getSymptomReviewSectionLastStep(editingReviewSection) ? (
                  <SecondaryButton title="Next" onPress={applyAdvance} />
                ) : null}
              </>
            ) : currentStep < SYMPTOM_REVIEW_STEP ? (
              <PrimaryButton title="Next" onPress={applyAdvance} />
            ) : (
              <PrimaryButton
                title={submitting ? "Saving…" : editId ? "Save changes" : "Submit"}
                onPress={submit}
                disabled={submitting}
              />
            )}
            {currentStep > 1 && !editingReviewSection && currentStep !== SYMPTOM_REVIEW_STEP ? (
              <SecondaryButton title="Previous step" onPress={goBackInternal} />
            ) : null}
          </View>
        ) : null}
      </ScrollView>
      </View>
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
  /** Web: `w-14 h-14` (56), `rounded-2xl` (16); spaced from title so the icon reads as its own band. */
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
  mealEntryWrap: { marginBottom: 12 },
  mealEntryWrapFirst: { paddingTop: 0 },
  mealFoodInput: { marginTop: 0 },
  removeItemLink: { marginTop: 6, alignSelf: "flex-end" },
  addItemLink: { marginTop: 8, marginBottom: 8, alignSelf: "flex-start" },
  footerBtns: { ...QUESTIONNAIRE_STEP_FOOTER },
  footerBtnsReview: { marginTop: 0 },
  switchRow: { flexDirection: "row", alignItems: "center", marginTop: 12 },
});
