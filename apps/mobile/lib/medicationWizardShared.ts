/** Medication tracking wizard — aligned with `src/app/medications/track/page.js` (web). */

import { TABLES, supabase } from "./supabase";

export const TIME_OF_DAY_OPTIONS = ["Morning", "Afternoon", "Evening", "Night"] as const;

export type MedicationListRow = {
  medication: string;
  /** `YYYY-MM-DD` */
  date: string;
  timeOfDay: string;
  /** Digits only in the form; `mg` appended on save */
  dosage?: string;
  dateTouched?: boolean;
};

export type MedicationTrackingFormData = {
  missedMedications: boolean | null;
  missedMedicationsList: MedicationListRow[];
  nsaidUsage: boolean | null;
  nsaidList: MedicationListRow[];
  antibioticUsage: boolean | null;
  antibioticList: MedicationListRow[];
};

export type CleanedMedicationData = {
  missedMedicationsList: { medication: string; date: string; timeOfDay: string }[];
  nsaidList: { medication: string; date: string; timeOfDay: string; dosage: string }[];
  antibioticList: { medication: string; date: string; timeOfDay: string; dosage: string }[];
};

export function createEmptyMedicationRow(withDosage = false): MedicationListRow {
  return {
    medication: "",
    date: "",
    timeOfDay: "",
    ...(withDosage ? { dosage: "" } : {}),
    dateTouched: false,
  };
}

export function createEmptyMedicationForm(): MedicationTrackingFormData {
  return {
    missedMedications: null,
    missedMedicationsList: [createEmptyMedicationRow(false)],
    nsaidUsage: null,
    nsaidList: [createEmptyMedicationRow(true)],
    antibioticUsage: null,
    antibioticList: [createEmptyMedicationRow(true)],
  };
}

export function normalizeDosage(raw: string): string {
  return (raw || "").replace(/\D/g, "").slice(0, 5);
}

/** Wizard step id → section name (steps 1–2 missed, 3–4 NSAIDs, 5–6 antibiotics, 7 review). */
export function medicationStepPhaseLabel(step: number): string {
  if (step <= 0) return "";
  if (step <= 2) return "Missed medications";
  if (step <= 4) return "NSAIDs";
  if (step <= 6) return "Antibiotics";
  return "Review";
}

export function getVisibleMedicationSteps(form: MedicationTrackingFormData): number[] {
  const steps = [0, 1];
  if (form.missedMedications) steps.push(2);
  steps.push(3);
  if (form.nsaidUsage) steps.push(4);
  steps.push(5);
  if (form.antibioticUsage) steps.push(6);
  steps.push(7);
  return steps;
}

export type MedicationWizardHistoryEntry = {
  step: number;
  form: MedicationTrackingFormData;
};

/** Previous step in the visible path (fallback when history was not restored). */
export function getPreviousMedicationStep(
  currentStep: number,
  form: MedicationTrackingFormData,
): number | null {
  const visible = getVisibleMedicationSteps(form);
  const idx = visible.indexOf(currentStep);
  if (idx <= 0) return null;
  return visible[idx - 1] ?? null;
}

function medicationPhaseBreadcrumbsForWizardSteps(stepIds: number[]) {
  const names: string[] = [];
  const entrySteps: number[] = [];
  for (const s of stepIds) {
    const label = medicationStepPhaseLabel(s);
    if (names[names.length - 1] !== label) {
      names.push(label);
      entrySteps.push(s);
    }
  }
  return { names, entrySteps };
}

/** Progress snapshot for the current step only (avoids flicker when Yes/No toggles). */
export function getMedicationWizardPhaseProgress(currentStep: number, form: MedicationTrackingFormData) {
  const visible = getVisibleMedicationSteps(form);
  const wizardOnly = visible.filter((s) => s > 0);
  const idx = wizardOnly.indexOf(currentStep);
  if (idx < 0 || wizardOnly.length === 0) {
    return { sectionStep: 0, sectionTotal: 0, currentPhaseLabel: "", phaseNames: [] as string[], phaseEntrySteps: [] as number[] };
  }
  const { names: phaseNames, entrySteps: phaseEntrySteps } = medicationPhaseBreadcrumbsForWizardSteps(wizardOnly);
  return {
    sectionStep: idx + 1,
    sectionTotal: wizardOnly.length,
    currentPhaseLabel: medicationStepPhaseLabel(currentStep),
    phaseNames,
    phaseEntrySteps,
  };
}

export function isMissedRowComplete(item: MedicationListRow): boolean {
  return Boolean(item.medication.trim() && item.date && item.timeOfDay);
}

export function isDosageRowComplete(item: MedicationListRow): boolean {
  return Boolean(item.medication.trim() && item.date && item.timeOfDay && item.dosage?.trim());
}

export function cleanMedicationForm(form: MedicationTrackingFormData): CleanedMedicationData {
  return {
    missedMedicationsList: form.missedMedications
      ? form.missedMedicationsList
          .filter((item) => item.medication.trim())
          .map((item) => ({
            medication: item.medication.trim(),
            date: item.date,
            timeOfDay: item.timeOfDay,
          }))
      : [],
    nsaidList: form.nsaidUsage
      ? form.nsaidList
          .filter((item) => item.medication.trim())
          .map((item) => ({
            medication: item.medication.trim(),
            date: item.date,
            timeOfDay: item.timeOfDay,
            dosage: item.dosage ? `${item.dosage}mg` : "",
          }))
      : [],
    antibioticList: form.antibioticUsage
      ? form.antibioticList
          .filter((item) => item.medication.trim())
          .map((item) => ({
            medication: item.medication.trim(),
            date: item.date,
            timeOfDay: item.timeOfDay,
            dosage: item.dosage ? `${item.dosage}mg` : "",
          }))
      : [],
  };
}

export function cleanedMedicationHasNoData(cleaned: CleanedMedicationData): boolean {
  return (
    cleaned.missedMedicationsList.length === 0 &&
    cleaned.nsaidList.length === 0 &&
    cleaned.antibioticList.length === 0
  );
}

export function buildMedicationTrackingInsertPayload(userId: string, cleaned: CleanedMedicationData) {
  return {
    id: `medication-tracking-${Date.now()}`,
    user_id: userId,
    name: "Medication Tracking",
    missed_medications_list: cleaned.missedMedicationsList,
    nsaid_list: cleaned.nsaidList,
    antibiotic_list: cleaned.antibioticList,
    created_at: new Date().toISOString(),
  };
}

export async function insertMedicationTrackingLog(userId: string, cleaned: CleanedMedicationData) {
  const payload = buildMedicationTrackingInsertPayload(userId, cleaned);
  const { error } = await supabase.from(TABLES.LOG_MEDICATIONS).insert([payload]);
  if (error) throw error;
}

/** Restore form from AsyncStorage JSON (dates as YMD strings). */
export function parseStoredMedicationForm(raw: unknown): MedicationTrackingFormData {
  const base = createEmptyMedicationForm();
  if (!raw || typeof raw !== "object") return base;
  const p = raw as Partial<MedicationTrackingFormData>;

  const reviveList = (list: unknown, withDosage: boolean): MedicationListRow[] => {
    if (!Array.isArray(list) || list.length === 0) return [createEmptyMedicationRow(withDosage)];
    return list.map((item) => {
      const row = item as Partial<MedicationListRow> & { date?: unknown };
      let date = "";
      const rawDate = row.date;
      if (typeof rawDate === "string" && rawDate.trim()) {
        const iso = rawDate.match(/^(\d{4}-\d{2}-\d{2})/);
        date = iso ? iso[1] : rawDate;
      } else if (rawDate != null) {
        const parsed = new Date(String(rawDate));
        if (!Number.isNaN(parsed.getTime())) {
          date = `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(parsed.getDate()).padStart(2, "0")}`;
        }
      }
      const dosageRaw = row.dosage ?? "";
      const dosageDigits = typeof dosageRaw === "string" ? dosageRaw.replace(/\D/g, "").replace(/mg$/i, "") : "";
      const dateTouched = row.dateTouched === true;
      return {
        medication: String(row.medication ?? ""),
        date: dateTouched ? date : "",
        timeOfDay: String(row.timeOfDay ?? ""),
        ...(withDosage ? { dosage: dosageDigits } : {}),
        dateTouched,
      };
    });
  };

  const boolOrNull = (v: unknown): boolean | null =>
    v === true || v === false ? v : null;

  return {
    ...base,
    ...p,
    missedMedications: boolOrNull(p.missedMedications),
    nsaidUsage: boolOrNull(p.nsaidUsage),
    antibioticUsage: boolOrNull(p.antibioticUsage),
    missedMedicationsList: reviveList(p.missedMedicationsList, false),
    nsaidList: reviveList(p.nsaidList, true),
    antibioticList: reviveList(p.antibioticList, true),
  };
}
