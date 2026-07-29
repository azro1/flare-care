import type { WellbeingFormState, WellbeingRow, WellbeingScale } from "./wellbeingShared";

export const WELLBEING_WIZARD_REVIEW_STEP = 12;

export type WellbeingReviewSectionId = "feelings" | "activities" | "notes";

export type WellbeingWizardHistoryEntry = {
  step: number;
  form: WellbeingFormState;
};

export function cloneWellbeingForm(form: WellbeingFormState): WellbeingFormState {
  return JSON.parse(JSON.stringify(form)) as WellbeingFormState;
}

export function getWellbeingReviewEditStep(section: WellbeingReviewSectionId): number {
  if (section === "feelings") return 1;
  if (section === "activities") return 8;
  return 11;
}

export function getWellbeingReviewSectionLastStep(section: WellbeingReviewSectionId): number {
  if (section === "feelings") return 7;
  if (section === "activities") return 10;
  return 11;
}

export function wellbeingStepPhaseLabel(step: number): string {
  if (step <= 0) return "";
  if (step <= 7) return "Feelings";
  if (step <= 10) return "Activities";
  if (step === 11) return "Notes";
  return "Review";
}

export function getVisibleWellbeingSteps(): number[] {
  return [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, WELLBEING_WIZARD_REVIEW_STEP];
}

export function getPreviousWellbeingStep(currentStep: number): number | null {
  const visible = getVisibleWellbeingSteps();
  const idx = visible.indexOf(currentStep);
  if (idx <= 0) return null;
  return visible[idx - 1] ?? null;
}

export function getWellbeingWizardPhaseProgress(currentStep: number) {
  const wizardOnly = getVisibleWellbeingSteps().filter(
    (step) => step > 0 && step < WELLBEING_WIZARD_REVIEW_STEP,
  );
  const idx = wizardOnly.indexOf(currentStep);
  if (idx < 0 || wizardOnly.length === 0) {
    return { sectionStep: 0, sectionTotal: 0, currentPhaseLabel: "" };
  }
  return {
    sectionStep: idx + 1,
    sectionTotal: wizardOnly.length,
    currentPhaseLabel: wellbeingStepPhaseLabel(currentStep),
  };
}

export function wellbeingFormFromRow(row: WellbeingRow): WellbeingFormState {
  const scale = (value: number | null): WellbeingScale | null =>
    value != null && value >= 1 && value <= 5 ? (value as WellbeingScale) : null;

  return {
    date: row.date,
    mood: scale(row.mood),
    energy: scale(row.energy),
    sleep_quality: scale(row.sleep_quality),
    anxiety: scale(row.anxiety),
    ibd_impact: scale(row.ibd_impact),
    pain: scale(row.pain),
    brain_fog: scale(row.brain_fog),
    exercised: row.exercised,
    exercise_minutes: row.exercise_minutes != null ? String(row.exercise_minutes) : "",
    social_connection: row.social_connection,
    time_outdoors: row.time_outdoors,
    notes: row.notes ?? "",
  };
}

export function formatWellbeingScaleDisplay(value: WellbeingScale | null): string {
  return value == null ? "Not set" : String(value);
}

export function formatWellbeingYesNoDisplay(
  value: boolean | null,
  minutes?: string | number | null,
): string {
  if (value == null) return "Not set";
  if (!value) return "No";
  const mins = typeof minutes === "string" ? parseInt(minutes, 10) : minutes;
  if (Number.isFinite(mins) && mins! > 0) return `Yes (${mins} min)`;
  return "Yes";
}
