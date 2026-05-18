/**
 * Medication wizard "Next" navigation — ported from `src/app/medications/track/page.js` `nextStep`.
 */

import {
  cleanMedicationForm,
  cleanedMedicationHasNoData,
  getVisibleMedicationSteps,
  isDosageRowComplete,
  isMissedRowComplete,
  type MedicationTrackingFormData,
} from "./medicationWizardShared";

export type MedicationWizardAdvanceResult =
  | { ok: false; fieldErrors: Record<string, string>; noData?: boolean }
  | { ok: true; nextStep: number };

export function medicationWizardTryAdvance(input: {
  currentStep: number;
  form: MedicationTrackingFormData;
}): MedicationWizardAdvanceResult {
  const { currentStep, form } = input;
  const fieldErrors: Record<string, string> = {};

  if (currentStep === 1) {
    if (form.missedMedications !== true && form.missedMedications !== false) {
      return { ok: false, fieldErrors: { missedMedications: "Please select Yes or No" } };
    }
  }

  if (currentStep === 3) {
    if (form.nsaidUsage !== true && form.nsaidUsage !== false) {
      return { ok: false, fieldErrors: { nsaidUsage: "Please select Yes or No" } };
    }
  }

  if (currentStep === 5) {
    if (form.antibioticUsage !== true && form.antibioticUsage !== false) {
      return { ok: false, fieldErrors: { antibioticUsage: "Please select Yes or No" } };
    }
  }

  if (currentStep === 2) {
    if (!form.missedMedicationsList.some(isMissedRowComplete)) {
      return { ok: false, fieldErrors: { missedMedicationsList: "Please enter at least one medication" } };
    }
  }

  if (currentStep === 4) {
    if (!form.nsaidList.some(isDosageRowComplete)) {
      return { ok: false, fieldErrors: { nsaidList: "Please enter at least one NSAID" } };
    }
  }

  if (currentStep === 6) {
    if (!form.antibioticList.some(isDosageRowComplete)) {
      return { ok: false, fieldErrors: { antibioticList: "Please enter at least one antibiotic" } };
    }
  }

  const visibleSteps = getVisibleMedicationSteps(form);
  const currentIndex = visibleSteps.indexOf(currentStep);
  if (currentIndex < 0 || currentIndex >= visibleSteps.length - 1) {
    return { ok: false, fieldErrors: {} };
  }

  const nextStepValue = visibleSteps[currentIndex + 1];
  if (nextStepValue === 7) {
    const cleaned = cleanMedicationForm(form);
    if (cleanedMedicationHasNoData(cleaned)) {
      return { ok: false, fieldErrors: {}, noData: true };
    }
  }

  return { ok: true, nextStep: nextStepValue };
}
