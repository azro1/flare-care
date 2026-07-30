import { REMINDER_WELCOME_CARD_LINE } from "./reminderSetupCopy";

/** Shared footer on inline section welcomes — + / primary actions stay blocked until dismiss. */
export const INSTRUCTION_CLOSE_TO_CONTINUE = "To continue, tap the Close (×) button.";

export const DASHBOARD_GETTING_STARTED_INSTRUCTION = {
  title: "Getting started",
  paragraphs: [
    "Living with IBD isn't easy, especially on bad days. FlareCare helps you capture what matters, at your own pace.",
    "Log symptoms, medications, habits and more over time — FlareCare organises everything into detailed reports you can share with your care team.",
    "Ready to begin? Start by exploring Daily Check-in to log your first symptom.",
    INSTRUCTION_CLOSE_TO_CONTINUE,
  ],
} as const;

/** Reports screen — first visit for new accounts. */
export const REPORTS_INSTRUCTION = {
  title: "Reports",
  paragraphs: [
    "Build reports from your logs to share with your clinical team.",
    "Generate a report below when you have entries to include, then email it to your care team.",
    INSTRUCTION_CLOSE_TO_CONTINUE,
  ],
} as const;

/** Log Symptoms wizard landing — first visit for new accounts. */
export const LOG_SYMPTOMS_INSTRUCTION = {
  title: "Log Symptoms",
  paragraphs: [
    "This guided flow helps you record symptoms, severity, and lifestyle factors in one place.",
    "You can move at your own pace and review everything before saving.",
    INSTRUCTION_CLOSE_TO_CONTINUE,
  ],
} as const;

/** My Meds hub — first visit for new accounts. */
export const MY_MEDS_INSTRUCTION = {
  title: "My Meds",
  paragraphs: [
    "Store and manage your current prescribed medications in one place.",
    "Tap + to add a medication and set a reminder so you don't miss a dose.",
    REMINDER_WELCOME_CARD_LINE,
    INSTRUCTION_CLOSE_TO_CONTINUE,
  ],
} as const;

/** Track Medications wizard landing — first visit for new accounts. */
export const TRACK_MEDICATIONS_INSTRUCTION = {
  title: "Track Medications",
  paragraphs: [
    "This guided flow helps you record missed doses, NSAIDs, and antibiotics in one place.",
    "You can move at your own pace and review everything before saving.",
    INSTRUCTION_CLOSE_TO_CONTINUE,
  ],
} as const;

/** My Hydration — first visit for new accounts. */
export const HYDRATION_INSTRUCTION = {
  title: "My Hydration",
  paragraphs: [
    "Track how much water you drink each day using the stepper below.",
    "Your goal is 6 glasses — tap − or + to update today's count.",
    INSTRUCTION_CLOSE_TO_CONTINUE,
  ],
} as const;

/** Bowel Movements hub — first visit for new accounts. */
export const BOWEL_INSTRUCTION = {
  title: "Bowel Movements",
  paragraphs: [
    "Add bowel movements by recording stool type using the Bristol Stool Chart.",
    "Tap + to add a log. Please add as much detail as you can — it helps your care team.",
    INSTRUCTION_CLOSE_TO_CONTINUE,
  ],
} as const;

/** My Weight hub — first visit for new accounts. */
export const WEIGHT_INSTRUCTION = {
  title: "My Weight",
  paragraphs: [
    "Record your weight to help track changes over time.",
    "Tap + to add a log. Keep entries consistent when you can — it helps your care team.",
    INSTRUCTION_CLOSE_TO_CONTINUE,
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
    INSTRUCTION_CLOSE_TO_CONTINUE,
  ],
} as const;

/** Symptom logs history — first visit for new accounts. */
export const SYMPTOM_LOGS_HISTORY_INSTRUCTION = {
  title: "Symptom logs",
  paragraphs: [
    "Events recorded through Log Symptoms will appear here.",
    "Tap a log to view details, or load more to browse older entries.",
    INSTRUCTION_CLOSE_TO_CONTINUE,
  ],
} as const;

/** Medication logs history — first visit for new accounts. */
export const MEDICATION_LOGS_HISTORY_INSTRUCTION = {
  title: "Medication logs",
  paragraphs: [
    "Events recorded through Track Medications will appear here.",
    "Tap a log to view details, or load more to browse older entries.",
    INSTRUCTION_CLOSE_TO_CONTINUE,
  ],
} as const;

/** Bristol Stool Chart — first visit for new accounts. */
export const BRISTOL_GUIDE_INSTRUCTION = {
  title: "Bristol Stool Chart",
  paragraphs: [
    "The Bristol Stool Chart is used to record stool consistency on a scale from 1 to 7. Select the type that best matches your stool, from 1 (firmest) to 7 (loosest). Types 3–4 are generally considered normal.",
    INSTRUCTION_CLOSE_TO_CONTINUE,
  ],
} as const;

/** Daily Wellbeing check-in — first visit for new accounts. */
export const WELLBEING_INSTRUCTION = {
  title: "My Wellbeing",
  paragraphs: [
    "Check in on how you're feeling today — mood, energy, sleep, anxiety, pain and more.",
    "Complete this section daily to help build a picture of your wellbeing over time.",
    INSTRUCTION_CLOSE_TO_CONTINUE,
  ],
} as const;

/** Appointment summary hub — first visit until dismissed. */
export const APPOINTMENT_BRIEF_INSTRUCTION = {
  title: "Appointment summary",
  paragraphs: [
    "Use a preset to quickly generate a health summary for your next appointment.",
    "Or use the Custom date range to pick the dates you want your summary to cover.",
    INSTRUCTION_CLOSE_TO_CONTINUE,
  ],
} as const;
