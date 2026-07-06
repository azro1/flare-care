import { REMINDER_WELCOME_CARD_LINE } from "./reminderSetupCopy";

export const DASHBOARD_GETTING_STARTED_INSTRUCTION = {
  title: "Getting started",
  paragraphs: [
    "Living with IBD isn't easy, especially on bad days. FlareCare helps you capture what matters, at your own pace.",
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
    "You can move at your own pace and review everything before saving.",
    "Close when you're ready, then tap Start now to begin.",
  ],
} as const;

/** My Meds hub — first visit for new accounts. */
export const MY_MEDS_INSTRUCTION = {
  title: "My Meds",
  paragraphs: [
    "Store and manage your current prescribed medications in one place.",
    "Tap + to add a medication and set a reminder so you don't miss a dose.",
    REMINDER_WELCOME_CARD_LINE,
  ],
} as const;

/** Track Medications wizard landing — first visit for new accounts. */
export const TRACK_MEDICATIONS_INSTRUCTION = {
  title: "Track Medications",
  paragraphs: [
    "This guided flow helps you record missed doses, NSAIDs, and antibiotics in one place.",
    "You can move at your own pace and review everything before saving.",
    "Close when you're ready, then tap Start now to begin.",
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

/** My Weight hub — first visit for new accounts. */
export const WEIGHT_INSTRUCTION = {
  title: "My Weight",
  paragraphs: [
    "Record your weight to help track changes over time.",
    "Tap + to add a log. Keep entries consistent when you can — it helps your care team.",
  ],
} as const;

/** Appointments hub — first visit for new accounts. */
export const APPOINTMENTS_INSTRUCTION = {
  title: "Appointments",
  paragraphs: [
    "Store and manage your appointments to keep track of past and upcoming visits.",
    "Tap + to add an appointment and set a reminder so you don't miss it.",
    REMINDER_WELCOME_CARD_LINE,
    "Use the summary to quickly generate a brief from your logs for your next appointment.",
  ],
} as const;

/** Symptom logs history — first visit for new accounts. */
export const SYMPTOM_LOGS_HISTORY_INSTRUCTION = {
  title: "Symptom logs",
  paragraphs: [
    "Events recorded through Log Symptoms will appear here.",
    "Tap a log to view details, or load more to browse older entries.",
  ],
} as const;

/** Medication logs history — first visit for new accounts. */
export const MEDICATION_LOGS_HISTORY_INSTRUCTION = {
  title: "Medication logs",
  paragraphs: [
    "Events recorded through Track Medications will appear here.",
    "Tap a log to view details, or load more to browse older entries.",
  ],
} as const;

/** Bristol Stool Chart — first visit for new accounts. */
export const BRISTOL_GUIDE_INSTRUCTION = {
  title: "Bristol Stool Chart",
  paragraphs: [
    "The Bristol Stool Chart is used to record stool consistency on a scale from 1 to 7. Select the type that best matches your stool, from 1 (firmest) to 7 (loosest). Types 3–4 are generally considered normal.",
  ],
} as const;

/** Appointment summary hub — first visit until dismissed. */
export const APPOINTMENT_BRIEF_INSTRUCTION = {
  title: "Appointment summary",
  paragraphs: [
    "Use a preset to quickly generate a health summary for your appointment.",
    "Or use the Custom date range to pick the dates you want your summary to cover.",
    'Tap "X" when you\'re ready to continue.',
  ],
} as const;
