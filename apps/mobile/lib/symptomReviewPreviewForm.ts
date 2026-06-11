import { createEmptySymptomForm, type SymptomFormData } from "./symptomWizardShared";

function toYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Sample symptom log for dev review styling — not used in production builds. */
export function createSymptomReviewPreviewForm(): SymptomFormData {
  const symptomStart = new Date();
  symptomStart.setDate(symptomStart.getDate() - 3);
  const symptomEnd = new Date();
  symptomEnd.setDate(symptomEnd.getDate() - 1);

  return {
    ...createEmptySymptomForm(),
    symptomStartDate: toYmd(symptomStart),
    isOngoing: false,
    symptomEndDate: toYmd(symptomEnd),
    severity: "6",
    stress_level: "4",
    normal_bathroom_frequency: "5",
    bathroom_frequency_changed: "yes",
    bathroom_frequency_change_details: "Increased to 8–10 times per day, looser stools",
    notes: "Felt worse after lunch. Rest helped in the evening.",
    breakfast: [
      { food: "Porridge", quantity: "1 bowl" },
      { food: "Tea", quantity: "1 cup" },
    ],
    lunch: [{ food: "", quantity: "" }],
    lunch_skipped: true,
    dinner: [
      { food: "Grilled chicken", quantity: "1 portion" },
      { food: "Rice", quantity: "small" },
    ],
    smoked_on_symptom_day: true,
    smoked_amount_on_symptom_day: "2 cigarettes",
    drank_on_symptom_day: false,
  };
}
