/**
 * Wizard "Next" navigation — ported from `src/app/symptoms/page.js` `nextStep`.
 */

import type { SymptomFormData, UserPreferencesShape } from "./symptomWizardShared";
import { resolveAlcoholStep12Phase, resolveSmokingStep10Phase } from "./symptomWizardShared";

const TOTAL_STEPS = 18;

export type DateErrorsState = {
  day: string;
  month: string;
  year: string;
  endDay: string;
  endMonth: string;
  endYear: string;
};

const emptyDateErrors = (): DateErrorsState => ({
  day: "",
  month: "",
  year: "",
  endDay: "",
  endMonth: "",
  endYear: "",
});

const ALCOHOL_UNITS_RANGE_ERR = "Enter a number between 0 and 30";

/** Web alcohol fields use min=0 max=30. Use after non-empty checks. */
function isValidAlcoholUnits0To30(raw: string): boolean {
  const n = parseFloat(String(raw ?? "").trim());
  return Number.isFinite(n) && n >= 0 && n <= 30;
}

export type SymptomWizardAdvanceResult =
  | { ok: false; fieldErrors: Record<string, string>; dateErrors: DateErrorsState }
  | { ok: true; nextStep: number; form: SymptomFormData; clearDateErrors: boolean };

export function symptomWizardTryAdvance(input: {
  currentStep: number;
  form: SymptomFormData;
  isFirstTimeUser: boolean;
  userPreferences: UserPreferencesShape | null;
}): SymptomWizardAdvanceResult {
  const { currentStep, isFirstTimeUser, userPreferences } = input;
  let form: SymptomFormData = { ...input.form };
  const fieldErrors: Record<string, string> = {};

  const fail = (fe: Record<string, string>, de?: Partial<DateErrorsState>): SymptomWizardAdvanceResult => ({
    ok: false,
    fieldErrors: { ...fieldErrors, ...fe },
    dateErrors: { ...emptyDateErrors(), ...de },
  });

  const smokingStep10Phase = resolveSmokingStep10Phase(form);
  const alcoholStep12Phase = resolveAlcoholStep12Phase(form);

  if (currentStep === 1) {
    if (!form.symptomStartDate) {
      return fail({}, { day: "Please select a date" });
    }
  }

  if (currentStep === 2 && typeof form.isOngoing !== "boolean") {
    return fail({ isOngoing: "Please answer Yes or No" });
  }

  if (currentStep === 3) {
    if (!form.symptomEndDate) {
      return fail({}, { endDay: "Please select a date" });
    }
    const testEndDate = new Date(form.symptomEndDate + "T12:00:00");
    if (Number.isNaN(testEndDate.getTime())) {
      return fail({}, { endDay: "Please select a valid date" });
    }
    if (testEndDate > new Date()) {
      return fail({}, { endDay: "Date cannot be in the future" });
    }
  }

  if (currentStep === 2 && form.isOngoing === true) {
    return { ok: true, nextStep: 4, form, clearDateErrors: true };
  }

  if (currentStep === 4) {
    if (!form.severity || form.severity === "") {
      return fail({ severity: "Please rate your symptom severity" });
    }
  }

  if (currentStep === 5) {
    if (!form.stress_level || form.stress_level === "") {
      return fail({ stress_level: "Please rate your stress level" });
    }
  }

  if (currentStep === 6) {
    if (!form.normal_bathroom_frequency || form.normal_bathroom_frequency === "") {
      return fail({ normal_bathroom_frequency: "Please enter your normal bathroom frequency" });
    }
    if (parseInt(form.normal_bathroom_frequency, 10) === 0) {
      return { ok: true, nextStep: 9, form, clearDateErrors: true };
    }
  }

  if (currentStep === 7 && form.bathroom_frequency_changed !== "yes" && form.bathroom_frequency_changed !== "no") {
    return fail({ bathroom_frequency_changed: "Please answer Yes or No" });
  }

  if (currentStep === 7 && form.bathroom_frequency_changed === "no") {
    if (!isFirstTimeUser && userPreferences && !userPreferences.isSmoker && !userPreferences.isDrinker) {
      form = {
        ...form,
        smoker: false,
        smoking_habits: "",
        alcohol: false,
        average_alcohol_units_pw: "",
      };
      return { ok: true, nextStep: 13, form, clearDateErrors: true };
    }
    if (!isFirstTimeUser && userPreferences && !userPreferences.isSmoker) {
      form = { ...form, smoker: false, smoking_habits: "" };
      return { ok: true, nextStep: 11, form, clearDateErrors: true };
    }
    return { ok: true, nextStep: 9, form, clearDateErrors: true };
  }

  if (currentStep === 8) {
    if (!form.bathroom_frequency_change_details || form.bathroom_frequency_change_details.trim() === "") {
      return fail({ bathroom_frequency_change_details: "Please describe your bathroom frequency change" });
    }
    if (!isFirstTimeUser && userPreferences && !userPreferences.isSmoker && !userPreferences.isDrinker) {
      form = {
        ...form,
        smoker: false,
        smoking_habits: "",
        alcohol: false,
        average_alcohol_units_pw: "",
      };
      return { ok: true, nextStep: 13, form, clearDateErrors: true };
    }
    if (!isFirstTimeUser && userPreferences && !userPreferences.isSmoker) {
      form = { ...form, smoker: false, smoking_habits: "" };
      return { ok: true, nextStep: 11, form, clearDateErrors: true };
    }
    if (!isFirstTimeUser && userPreferences && userPreferences.isSmoker && !userPreferences.isDrinker) {
      return { ok: true, nextStep: 9, form, clearDateErrors: true };
    }
  }

  if (currentStep === 9 && !isFirstTimeUser && userPreferences?.isSmoker) {
    if (typeof form.smoked_on_symptom_day !== "boolean") {
      return fail({ smoked_on_symptom_day: "Please answer Yes or No" });
    }
  }

  if (currentStep === 9 && isFirstTimeUser && typeof form.smoker !== "boolean") {
    return fail({ smoker: "Please answer Yes or No" });
  }

  if (
    currentStep === 9 &&
    ((!isFirstTimeUser && userPreferences?.isSmoker && form.smoked_on_symptom_day === false) ||
      ((isFirstTimeUser || !userPreferences?.isSmoker) && form.smoker === false))
  ) {
    if (!isFirstTimeUser && userPreferences && !userPreferences.isDrinker) {
      form = { ...form, alcohol: false, average_alcohol_units_pw: "" };
      return { ok: true, nextStep: 13, form, clearDateErrors: true };
    }
    return { ok: true, nextStep: 11, form, clearDateErrors: true };
  }

  if (currentStep === 10) {
    if (isFirstTimeUser && form.smoker === true) {
      if (!form.smoking_habits || form.smoking_habits.trim() === "") {
        return fail({ smoking_habits: "Please describe your smoking habits" });
      }
      if (smokingStep10Phase === "details") {
        form = { ...form, smoking_step10_phase: "dayYesNo" };
        return { ok: true, nextStep: 10, form, clearDateErrors: true };
      }
      if (smokingStep10Phase === "dayYesNo") {
        if (typeof form.smoked_on_symptom_day !== "boolean") {
          return fail({ smoked_on_symptom_day: "Please answer Yes or No" });
        }
        if (form.smoked_on_symptom_day) {
          form = { ...form, smoking_step10_phase: "dayAmount" };
          return { ok: true, nextStep: 10, form, clearDateErrors: true };
        }
      }
      if (smokingStep10Phase === "dayAmount" && (!form.smoked_amount_on_symptom_day || form.smoked_amount_on_symptom_day.trim() === "")) {
        return fail({ smoked_amount_on_symptom_day: "Please describe how much you smoked on this day" });
      }
    } else if (!isFirstTimeUser) {
      if (!form.smoked_amount_on_symptom_day || form.smoked_amount_on_symptom_day.trim() === "") {
        return fail({ smoked_amount_on_symptom_day: "Please describe how much you smoked on this day" });
      }
    }
  }

  if (currentStep === 11 && !isFirstTimeUser && userPreferences?.isDrinker) {
    if (typeof form.drank_on_symptom_day !== "boolean") {
      return fail({ drank_on_symptom_day: "Please answer Yes or No" });
    }
  }

  if (currentStep === 11 && isFirstTimeUser && typeof form.alcohol !== "boolean") {
    return fail({ alcohol: "Please answer Yes or No" });
  }

  if (
    currentStep === 11 &&
    ((!isFirstTimeUser && userPreferences?.isDrinker && form.drank_on_symptom_day === false) ||
      ((isFirstTimeUser || !userPreferences?.isDrinker) && form.alcohol === false))
  ) {
    return { ok: true, nextStep: 13, form, clearDateErrors: true };
  }

  if (currentStep === 12) {
    if (isFirstTimeUser && form.alcohol === true) {
      if (!form.average_alcohol_units_pw || form.average_alcohol_units_pw === "") {
        return fail({ average_alcohol_units_pw: "Please enter how many units of alcohol you drink per week" });
      }
      if (!isValidAlcoholUnits0To30(form.average_alcohol_units_pw)) {
        return fail({ average_alcohol_units_pw: ALCOHOL_UNITS_RANGE_ERR });
      }
      if (alcoholStep12Phase === "baseline") {
        form = { ...form, alcohol_step12_phase: "dayYesNo" };
        return { ok: true, nextStep: 12, form, clearDateErrors: true };
      }
      if (alcoholStep12Phase === "dayYesNo") {
        if (typeof form.drank_on_symptom_day !== "boolean") {
          return fail({ drank_on_symptom_day: "Please answer Yes or No" });
        }
        if (form.drank_on_symptom_day) {
          form = { ...form, alcohol_step12_phase: "dayAmount" };
          return { ok: true, nextStep: 12, form, clearDateErrors: true };
        }
      }
      if (alcoholStep12Phase === "dayAmount" && (!form.alcohol_units_on_symptom_day || form.alcohol_units_on_symptom_day === "")) {
        return fail({ alcohol_units_on_symptom_day: "Please enter how many units you drank on this day" });
      }
      if (alcoholStep12Phase === "dayAmount" && !isValidAlcoholUnits0To30(form.alcohol_units_on_symptom_day)) {
        return fail({ alcohol_units_on_symptom_day: ALCOHOL_UNITS_RANGE_ERR });
      }
    } else if (!isFirstTimeUser) {
      if (!form.alcohol_units_on_symptom_day || form.alcohol_units_on_symptom_day === "") {
        return fail({ alcohol_units_on_symptom_day: "Please enter how many units you drank on this day" });
      }
      if (!isValidAlcoholUnits0To30(form.alcohol_units_on_symptom_day)) {
        return fail({ alcohol_units_on_symptom_day: ALCOHOL_UNITS_RANGE_ERR });
      }
    }
  }

  if (currentStep === 13) {
    const hasBreakfast = form.breakfast.some((meal) => meal.food.trim()) || form.breakfast_skipped;
    if (!hasBreakfast) {
      return fail({ breakfast: "Please enter what you ate for breakfast or check \"I didn't eat anything\"" });
    }
  }

  if (currentStep === 14) {
    const hasLunch = form.lunch.some((meal) => meal.food.trim()) || form.lunch_skipped;
    if (!hasLunch) {
      return fail({ lunch: "Please enter what you ate for lunch or check \"I didn't eat anything\"" });
    }
  }

  if (currentStep === 15) {
    const hasDinner = form.dinner.some((meal) => meal.food.trim()) || form.dinner_skipped;
    if (!hasDinner) {
      return fail({ dinner: "Please enter what you ate for dinner or check \"I didn't eat anything\"" });
    }
  }

  if (currentStep < TOTAL_STEPS) {
    let nextStepNumber = currentStep + 1;
    if (!isFirstTimeUser && userPreferences) {
      if (currentStep === 5 && userPreferences.normalBathroomFrequency) {
        nextStepNumber = 7;
        form = {
          ...form,
          normal_bathroom_frequency: String(userPreferences.normalBathroomFrequency),
        };
      } else if (currentStep === 9 && !userPreferences.isSmoker) {
        nextStepNumber = 11;
        form = { ...form, smoker: false, smoking_habits: "" };
      } else if (currentStep === 11 && !userPreferences.isDrinker) {
        nextStepNumber = 13;
        form = { ...form, alcohol: false, average_alcohol_units_pw: "" };
      } else if (currentStep === 10 && !userPreferences.isDrinker) {
        nextStepNumber = 13;
        form = { ...form, alcohol: false, average_alcohol_units_pw: "" };
      }
    }
    return { ok: true, nextStep: nextStepNumber, form, clearDateErrors: true };
  }

  return { ok: true, nextStep: currentStep, form, clearDateErrors: true };
}
