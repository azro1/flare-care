import { getVisibleWellbeingSteps, WELLBEING_WIZARD_REVIEW_STEP } from "./wellbeingWizardShared";
import type { WellbeingFormState } from "./wellbeingShared";

export type WellbeingWizardAdvanceResult =
  | { ok: false; fieldErrors: Record<string, string> }
  | { ok: true; nextStep: number };

export function wellbeingWizardTryAdvance(input: {
  currentStep: number;
  form: WellbeingFormState;
}): WellbeingWizardAdvanceResult {
  const { currentStep, form } = input;
  const fieldErrors: Record<string, string> = {};

  if (currentStep === 1 && form.mood == null) {
    fieldErrors.mood = "Please choose your mood.";
  } else if (currentStep === 2 && form.energy == null) {
    fieldErrors.energy = "Please choose your energy level.";
  } else if (currentStep === 3 && form.sleep_quality == null) {
    fieldErrors.sleep_quality = "Please choose your sleep quality.";
  } else if (currentStep === 4 && form.anxiety == null) {
    fieldErrors.anxiety = "Please choose your anxiety level.";
  } else if (currentStep === 5 && form.pain == null) {
    fieldErrors.pain = "Please choose your pain or discomfort level.";
  } else if (currentStep === 6 && form.ibd_impact == null) {
    fieldErrors.ibd_impact = "Please choose how much IBD affected your day.";
  } else if (currentStep === 7 && form.brain_fog == null) {
    fieldErrors.brain_fog = "Please choose your brain fog level.";
  } else if (currentStep === 8 && form.exercised == null) {
    fieldErrors.exercised = "Please select Yes or No.";
  } else if (currentStep === 9 && form.social_connection == null) {
    fieldErrors.social_connection = "Please select Yes or No.";
  } else if (currentStep === 10 && form.time_outdoors == null) {
    fieldErrors.time_outdoors = "Please select Yes or No.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }

  const visibleSteps = getVisibleWellbeingSteps();
  const currentIndex = visibleSteps.indexOf(currentStep);
  if (currentIndex < 0 || currentIndex >= visibleSteps.length - 1) {
    return { ok: false, fieldErrors: {} };
  }

  return { ok: true, nextStep: visibleSteps[currentIndex + 1] ?? WELLBEING_WIZARD_REVIEW_STEP };
}
