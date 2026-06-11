/** Shared symptom log wizard types & helpers — aligned with `src/app/symptoms/page.js` (web). */

import { supabase, TABLES } from "./supabase";

export type MealRow = { food: string; quantity: string };

export type SymptomFormData = {
  symptomStartDate: string;
  isOngoing: boolean | null;
  symptomEndDate: string;
  severity: string;
  stress_level: string;
  normal_bathroom_frequency: string;
  bathroom_frequency_changed: string;
  bathroom_frequency_change_details: string;
  notes: string;
  breakfast: MealRow[];
  lunch: MealRow[];
  dinner: MealRow[];
  breakfast_skipped: boolean;
  lunch_skipped: boolean;
  dinner_skipped: boolean;
  smoker: boolean | null;
  smoking_habits: string;
  smoking_step10_phase: "details" | "dayYesNo" | "dayAmount";
  smoked_on_symptom_day: boolean | null;
  smoked_amount_on_symptom_day: string;
  alcohol: boolean | null;
  average_alcohol_units_pw: string;
  alcohol_step12_phase: "baseline" | "dayYesNo" | "dayAmount";
  drank_on_symptom_day: boolean | null;
  alcohol_units_on_symptom_day: string;
};

export type UserPreferencesShape = {
  isSmoker?: boolean;
  isDrinker?: boolean;
  normalBathroomFrequency?: string | number | null;
  hasSetPreferences?: boolean;
  lastUpdated?: string;
  smokingPattern?: { consecutiveNo?: number; lastAsked?: string | null };
  alcoholPattern?: { consecutiveNo?: number; lastAsked?: string | null };
};

export const SYMPTOM_WIZARD_REVIEW_STEP = 17;

/** Review card sections — `basic` spans duration + severity/stress (wizard steps 1–5). */
export type SymptomReviewSectionId = "basic" | "bathroom" | "lifestyle" | "meals" | "notes";

export const SYMPTOM_WIZARD_PHASES = [
  { id: "timing", label: "Duration", firstStep: 1, lastStep: 3 },
  { id: "severity", label: "Severity & stress", firstStep: 4, lastStep: 5 },
  { id: "bathroom", label: "Bathroom frequency", firstStep: 6, lastStep: 8 },
  { id: "lifestyle", label: "Lifestyle", firstStep: 9, lastStep: 12 },
  { id: "meals", label: "Meals", firstStep: 13, lastStep: 15 },
  { id: "notes", label: "Notes", firstStep: 16, lastStep: 16 },
  { id: "review", label: "Review", firstStep: 17, lastStep: 17 },
] as const;

export function getSymptomWizardPhasesFiltered(isFirstTimeUser: boolean, userPreferences: UserPreferencesShape | null) {
  const phases = [...SYMPTOM_WIZARD_PHASES];
  if (!isFirstTimeUser && userPreferences && !userPreferences.isSmoker && !userPreferences.isDrinker) {
    return phases.filter((p) => p.id !== "lifestyle");
  }
  return phases;
}

export function getSymptomReviewEditStep(
  section: SymptomReviewSectionId,
  isFirstTimeUser: boolean,
  userPreferences: UserPreferencesShape | null,
): number | null {
  if (section === "basic") return 1;
  const phaseId =
    section === "bathroom"
      ? "bathroom"
      : section === "lifestyle"
        ? "lifestyle"
        : section === "meals"
          ? "meals"
          : "notes";
  const phase = SYMPTOM_WIZARD_PHASES.find((p) => p.id === phaseId);
  if (!phase) return null;
  return getSymptomWizardPhaseEntryStep(phase, isFirstTimeUser, userPreferences);
}

export function getSymptomReviewSectionLastStep(section: SymptomReviewSectionId): number {
  if (section === "basic") return 5;
  const phaseId =
    section === "bathroom"
      ? "bathroom"
      : section === "lifestyle"
        ? "lifestyle"
        : section === "meals"
          ? "meals"
          : "notes";
  return SYMPTOM_WIZARD_PHASES.find((p) => p.id === phaseId)?.lastStep ?? SYMPTOM_WIZARD_REVIEW_STEP;
}

export function getSymptomWizardPhaseEntryStep(
  phase: (typeof SYMPTOM_WIZARD_PHASES)[number],
  isFirstTimeUser: boolean,
  userPreferences: UserPreferencesShape | null,
): number | null {
  if (phase.id === "bathroom" && !isFirstTimeUser && userPreferences?.normalBathroomFrequency) {
    return 7;
  }
  if (phase.id === "lifestyle" && !isFirstTimeUser && userPreferences) {
    if (!userPreferences.isSmoker && !userPreferences.isDrinker) return null;
    if (!userPreferences.isSmoker) return 11;
    return 9;
  }
  return phase.firstStep;
}

export function getSymptomWizardPhaseProgress(
  currentStep: number,
  isFirstTimeUser: boolean,
  userPreferences: UserPreferencesShape | null,
) {
  const phases = getSymptomWizardPhasesFiltered(isFirstTimeUser, userPreferences);
  if (currentStep <= 0 || phases.length === 0) {
    return {
      phaseNames: [] as string[],
      phaseEntrySteps: [] as (number | null)[],
      currentPhaseLabel: "",
      sectionStep: 0,
      sectionTotal: 0,
    };
  }
  const idx = phases.findIndex((p) => currentStep >= p.firstStep && currentStep <= p.lastStep);
  if (idx < 0) {
    return {
      phaseNames: [] as string[],
      phaseEntrySteps: [] as (number | null)[],
      currentPhaseLabel: "",
      sectionStep: 0,
      sectionTotal: 0,
    };
  }
  return {
    phaseNames: phases.map((p) => p.label),
    phaseEntrySteps: phases.map((p) => getSymptomWizardPhaseEntryStep(p, isFirstTimeUser, userPreferences)),
    currentPhaseLabel: phases[idx].label,
    sectionStep: idx + 1,
    sectionTotal: phases.length,
  };
}

export const WIZARD_RATING_BAND_VALUES = [2, 4, 6, 8, 10] as const;

export const SEVERITY_WORD_OPTIONS = [
  { label: "Mild", value: 2 },
  { label: "Slight", value: 4 },
  { label: "Moderate", value: 6 },
  { label: "Severe", value: 8 },
  { label: "Extreme", value: 10 },
] as const;

export const STRESS_WORD_OPTIONS = [
  { label: "Calm", value: 2 },
  { label: "A little", value: 4 },
  { label: "Moderate", value: 6 },
  { label: "Stressed", value: 8 },
  { label: "Very stressed", value: 10 },
] as const;

export function wizardRatingToBand(value: string | number | ""): number {
  const v = Math.min(10, Math.max(1, Number(value) || 1));
  return WIZARD_RATING_BAND_VALUES[Math.min(4, Math.floor((v - 1) / 2))];
}

export function createEmptySymptomForm(): SymptomFormData {
  return {
    symptomStartDate: "",
    isOngoing: null,
    symptomEndDate: "",
    severity: "",
    stress_level: "",
    normal_bathroom_frequency: "",
    bathroom_frequency_changed: "",
    bathroom_frequency_change_details: "",
    notes: "",
    breakfast: [{ food: "", quantity: "" }],
    lunch: [{ food: "", quantity: "" }],
    dinner: [{ food: "", quantity: "" }],
    breakfast_skipped: false,
    lunch_skipped: false,
    dinner_skipped: false,
    smoker: null,
    smoking_habits: "",
    smoking_step10_phase: "details",
    smoked_on_symptom_day: null,
    smoked_amount_on_symptom_day: "",
    alcohol: null,
    average_alcohol_units_pw: "",
    alcohol_step12_phase: "baseline",
    drank_on_symptom_day: null,
    alcohol_units_on_symptom_day: "",
  };
}

export function sanitizeNotesMobile(notes: string): string {
  if (typeof notes !== "string") return "";
  return notes.replace(/<[^>]*>/g, "").trim().slice(0, 500);
}

export function sanitizeFoodTriggersMobile(s: string): string {
  if (typeof s !== "string") return "";
  return s.replace(/<[^>]*>/g, "").trim().slice(0, 200);
}

/** Mirrors web `smokingStep10Phase` useMemo. */
export function resolveSmokingStep10Phase(form: SymptomFormData): "details" | "dayYesNo" | "dayAmount" {
  const p = form.smoking_step10_phase;
  if (p === "dayAmount" || p === "dayYesNo" || p === "details") return p;
  if (form.smoked_on_symptom_day === true && form.smoked_amount_on_symptom_day?.trim()) return "dayAmount";
  if (typeof form.smoked_on_symptom_day === "boolean") return "dayYesNo";
  if (form.smoking_habits?.trim()) return "dayYesNo";
  return "details";
}

/** Mirrors web `alcoholStep12Phase` useMemo. */
export function resolveAlcoholStep12Phase(form: SymptomFormData): "baseline" | "dayYesNo" | "dayAmount" {
  const p = form.alcohol_step12_phase;
  if (p === "dayAmount" || p === "dayYesNo" || p === "baseline") return p;
  if (form.drank_on_symptom_day === true && String(form.alcohol_units_on_symptom_day || "").trim()) return "dayAmount";
  if (typeof form.drank_on_symptom_day === "boolean") return "dayYesNo";
  if (String(form.average_alcohol_units_pw || "").trim()) return "dayYesNo";
  return "baseline";
}

function parseSymptomMealRows(raw: unknown): MealRow[] {
  let arr: unknown[] = [];
  if (Array.isArray(raw)) arr = raw;
  else if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) arr = parsed;
    } catch {
      arr = [];
    }
  }
  const items = arr
    .map((meal): MealRow => {
      if (typeof meal === "string") return { food: meal, quantity: "" };
      if (meal && typeof meal === "object") {
        const m = meal as Record<string, unknown>;
        return {
          food: typeof m.food === "string" ? m.food : "",
          quantity: typeof m.quantity === "string" ? m.quantity.trim() : "",
        };
      }
      return { food: "", quantity: "" };
    })
    .filter((item) => item.food.trim() || item.quantity.trim());
  return items.length ? items : [{ food: "", quantity: "" }];
}

function symptomRowString(row: Record<string, unknown>, snake: string, camel?: string): string {
  const raw = row[snake] ?? (camel ? row[camel] : undefined);
  return raw != null ? String(raw) : "";
}

function symptomRowBoolOrNull(value: unknown): boolean | null {
  return value === true || value === false ? value : null;
}

/** Hydrate wizard form from an existing `log_symptoms` row. */
export function symptomLogRowToForm(row: Record<string, unknown>): SymptomFormData {
  const form: SymptomFormData = {
    ...createEmptySymptomForm(),
    symptomStartDate: symptomRowString(row, "symptom_start_date", "symptomStartDate"),
    isOngoing: symptomRowBoolOrNull(row.is_ongoing ?? row.isOngoing),
    symptomEndDate: symptomRowString(row, "symptom_end_date", "symptomEndDate"),
    severity: symptomRowString(row, "severity"),
    stress_level: symptomRowString(row, "stress_level"),
    normal_bathroom_frequency: symptomRowString(row, "normal_bathroom_frequency"),
    bathroom_frequency_changed: symptomRowString(row, "bathroom_frequency_changed"),
    bathroom_frequency_change_details: symptomRowString(row, "bathroom_frequency_change_details"),
    notes: symptomRowString(row, "notes"),
    breakfast: parseSymptomMealRows(row.breakfast),
    lunch: parseSymptomMealRows(row.lunch),
    dinner: parseSymptomMealRows(row.dinner),
    smoker: symptomRowBoolOrNull(row.smoker),
    smoking_habits: symptomRowString(row, "smoking_habits") || symptomRowString(row, "smoking_details"),
    smoked_on_symptom_day: symptomRowBoolOrNull(row.smoked_on_symptom_day),
    smoked_amount_on_symptom_day: symptomRowString(row, "smoked_amount_on_symptom_day"),
    alcohol: symptomRowBoolOrNull(row.alcohol),
    average_alcohol_units_pw:
      symptomRowString(row, "average_alcohol_units_pw") || symptomRowString(row, "alcohol_habits"),
    drank_on_symptom_day: symptomRowBoolOrNull(row.drank_on_symptom_day),
    alcohol_units_on_symptom_day: symptomRowString(row, "alcohol_units_on_symptom_day"),
  };
  form.smoking_step10_phase = resolveSmokingStep10Phase(form);
  form.alcohol_step12_phase = resolveAlcoholStep12Phase(form);
  return form;
}

function buildSymptomLogFields(form: SymptomFormData, isFirstTimeUser: boolean, isEdit = false) {
  const includeLifestyleBaseline = isFirstTimeUser || isEdit;
  const breakfast = form.breakfast
    .map((item) => ({
      food: sanitizeFoodTriggersMobile(item.food),
      quantity: sanitizeFoodTriggersMobile(item.quantity),
    }))
    .filter((item) => item.food.trim());
  const lunch = form.lunch
    .map((item) => ({
      food: sanitizeFoodTriggersMobile(item.food),
      quantity: sanitizeFoodTriggersMobile(item.quantity),
    }))
    .filter((item) => item.food.trim());
  const dinner = form.dinner
    .map((item) => ({
      food: sanitizeFoodTriggersMobile(item.food),
      quantity: sanitizeFoodTriggersMobile(item.quantity),
    }))
    .filter((item) => item.food.trim());

  return {
    symptom_start_date: form.symptomStartDate || null,
    is_ongoing: form.isOngoing,
    symptom_end_date: form.symptomEndDate || null,
    severity: form.severity,
    stress_level: form.stress_level,
    normal_bathroom_frequency: form.normal_bathroom_frequency,
    bathroom_frequency_changed: form.bathroom_frequency_changed,
    bathroom_frequency_change_details: form.bathroom_frequency_change_details,
    smoker: includeLifestyleBaseline ? form.smoker : null,
    smoking_habits: includeLifestyleBaseline ? form.smoking_habits : null,
    smoked_on_symptom_day: typeof form.smoked_on_symptom_day === "boolean" ? form.smoked_on_symptom_day : false,
    smoked_amount_on_symptom_day: form.smoked_amount_on_symptom_day || null,
    alcohol: includeLifestyleBaseline ? form.alcohol : null,
    average_alcohol_units_pw: includeLifestyleBaseline ? form.average_alcohol_units_pw : null,
    drank_on_symptom_day: typeof form.drank_on_symptom_day === "boolean" ? form.drank_on_symptom_day : false,
    alcohol_units_on_symptom_day: form.alcohol_units_on_symptom_day || null,
    notes: sanitizeNotesMobile(form.notes),
    breakfast,
    lunch,
    dinner,
  };
}

export function buildSymptomInsertPayload(userId: string, form: SymptomFormData, isFirstTimeUser: boolean) {
  return {
    id: String(Date.now()),
    user_id: userId,
    ...buildSymptomLogFields(form, isFirstTimeUser),
    created_at: new Date().toISOString(),
  };
}

export function buildSymptomUpdatePayload(form: SymptomFormData, isFirstTimeUser: boolean) {
  return {
    ...buildSymptomLogFields(form, isFirstTimeUser, true),
    updated_at: new Date().toISOString(),
  };
}

export async function updateSymptomLog(
  userId: string,
  id: string,
  form: SymptomFormData,
  isFirstTimeUser: boolean,
): Promise<void> {
  const payload = buildSymptomUpdatePayload(form, isFirstTimeUser);
  const { error } = await supabase.from(TABLES.LOG_SYMPTOMS).update(payload).eq("id", id).eq("user_id", userId);
  if (error) throw error;
}

export async function fetchUserPreferencesRow(userId: string): Promise<UserPreferencesShape | null> {
  const { data, error } = await supabase
    .from(TABLES.USER_PREFERENCES)
    .select("preferences")
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data?.preferences) return null;
  return data.preferences as UserPreferencesShape;
}

export async function upsertUserPreferencesMobile(userId: string, preferences: UserPreferencesShape): Promise<void> {
  const preferencesData = {
    isSmoker: Boolean(preferences.isSmoker),
    isDrinker: Boolean(preferences.isDrinker),
    normalBathroomFrequency: preferences.normalBathroomFrequency ?? null,
    hasSetPreferences: true,
    lastUpdated: new Date().toISOString(),
    smokingPattern: preferences.smokingPattern || { consecutiveNo: 0, lastAsked: null },
    alcoholPattern: preferences.alcoholPattern || { consecutiveNo: 0, lastAsked: null },
  };
  await supabase.from(TABLES.USER_PREFERENCES).upsert(
    {
      user_id: userId,
      preferences: preferencesData,
      updated_at: preferencesData.lastUpdated,
    },
    { onConflict: "user_id" },
  );
}
