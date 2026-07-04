/** First-time instruction card copy — import here; do not duplicate in screens. */

export const DASHBOARD_GETTING_STARTED_INSTRUCTION = {
  title: "Getting started",
  paragraphs: [
    "Living with IBD isn't easy, especially on bad days. FlareCare helps you capture what matters, at your pace.",
    "Log symptoms, track medications, record your weight and bowel movements, and build reports to share with your care team.",
    "When you're ready, check out Daily Check-in to log your first symptom!",
  ],
} as const;

/** Reports screen — first visit for new accounts. */
export const REPORTS_INSTRUCTION = {
  title: "Reports",
  paragraphs: [
    "Build reports from your logs to share with your clinical team.",
    "Generate a report below when you have entries to include, then email it to your care team.",
  ],
} as const;

/** Log Symptoms wizard landing — first visit for new accounts. */
export const LOG_SYMPTOMS_INSTRUCTION = {
  title: "Log Symptoms",
  paragraphs: [
    "This guided flow helps you record symptoms, severity, and lifestyle factors in one place.",
    "Tap Start now when you're ready — you can move at your own pace and review everything before saving.",
  ],
} as const;

/** My Meds hub — first visit for new accounts. */
export const MY_MEDS_INSTRUCTION = {
  title: "My Meds",
  paragraphs: [
    "Store and manage your current prescribed medications in one place.",
    "Tap + to add a medication and set a reminder so you don't miss a dose.",
  ],
} as const;

/** My Meds — muted one-liner below the list after the instruction card is dismissed. */
export const MY_MEDS_HINT_LINE =
  "Tap + to add medications prescribed by your GP or healthcare team.";

/** Track Medications wizard landing — first visit for new accounts. */
export const TRACK_MEDICATIONS_INSTRUCTION = {
  title: "Track Medications",
  paragraphs: [
    "This guided flow helps you record missed doses, NSAIDs, and antibiotics in one place.",
    "Tap Start now when you're ready — you can move at your own pace and review everything before saving.",
  ],
} as const;

/** My Hydration — first visit for new accounts. */
export const HYDRATION_INSTRUCTION = {
  title: "My Hydration",
  paragraphs: [
    "Track how much water you drink each day using the stepper below.",
    "Your goal is 6 glasses — tap − or + to update today's count.",
  ],
} as const;

/** Bowel Movements hub — first visit for new accounts. */
export const BOWEL_INSTRUCTION = {
  title: "Bowel Movements",
  paragraphs: [
    "Log your bowel movements by recording stool type using the Bristol Stool Chart.",
    "Tap + to add a log. Please add as much detail as you can — it helps your care team.",
  ],
} as const;

/** Bowel Movements — lightbulb tip below the list after the instruction card is dismissed. */
export const BOWEL_HINT_LINE = "Tap + to log a bowel movement. Add as much detail as you can.";

/** My Weight hub — first visit for new accounts. */
export const WEIGHT_INSTRUCTION = {
  title: "My Weight",
  paragraphs: [
    "Record your weight to help track changes over time.",
    "Tap + to add a log. Keep entries consistent when you can — it helps your care team.",
  ],
} as const;

/** My Weight — lightbulb tip below the list after the instruction card is dismissed. */
export const WEIGHT_HINT_LINE =
  "Tap + to log your weight. Keep entries consistent to make changes easier to track over time.";

/** Appointments hub — first visit for new accounts. */
export const APPOINTMENTS_INSTRUCTION = {
  title: "Appointments",
  paragraphs: [
    "Store and manage your appointments to keep track of past and upcoming visits.",
    "Tap + to add an appointment and set a reminder so you don't miss it.",
    "Use the summary to quickly generate a brief from your logs for your next appointment.",
  ],
} as const;

/** Appointments — lightbulb tip below the list after the instruction card is dismissed. */
export const APPOINTMENTS_HINT_LINE =
  "Tap + to add an appointment and set a reminder so you don't miss it.";

/** Symptom logs history — first visit for new accounts. */
export const SYMPTOM_LOGS_HISTORY_INSTRUCTION = {
  title: "Symptom logs",
  paragraphs: ["Events recorded through Log Symptoms will appear here."],
} as const;

/** Symptom logs history — lightbulb tip after the instruction card is dismissed. */
export const SYMPTOM_LOGS_HISTORY_HINT_LINE =
  "Tap a log to view details, or load more to browse older entries.";

/** Medication logs history — first visit for new accounts. */
export const MEDICATION_LOGS_HISTORY_INSTRUCTION = {
  title: "Medication logs",
  paragraphs: ["Events recorded through Track Medications will appear here."],
} as const;

/** Medication logs history — lightbulb tip after the instruction card is dismissed. */
export const MEDICATION_LOGS_HISTORY_HINT_LINE =
  "Tap a log to view details, or load more to browse older entries.";
