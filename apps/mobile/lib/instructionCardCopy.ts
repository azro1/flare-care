/** Shared footer on inline section welcomes — + / primary actions stay blocked until dismiss. */
export const INSTRUCTION_CLOSE_TO_CONTINUE = "To continue, tap the Close (×) button.";

export const DASHBOARD_GETTING_STARTED_INSTRUCTION = {
  title: "Getting started",
  paragraphs: [
    "Living with IBD can be unpredictable, but keeping track of it doesn't have to be.",
    "FlareCare helps you build a clearer picture over time by recording your symptoms, medications, habits and more. Everything is organised into detailed reports, ready to share with your care team.",
    "Close this card to continue.",
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
    "We'll guide you through recording your symptoms, their severity, and any relevant lifestyle factors.",
    "Take your time—you can review everything before saving.",
    "Close this card to continue.",
  ],
} as const;

/** My Meds hub — first visit for new accounts. */
export const MY_MEDS_INSTRUCTION = {
  title: "My Meds",
  paragraphs: [
    "Keep your current medications organised in one place.",
    "Add your medications, set reminders, and stay on track with your doses.",
    "To receive reminders, enable notifications for FlareCare in your device settings.",
    "Close this card to continue.",
  ],
} as const;

/** Track Medications wizard landing — first visit for new accounts. */
export const TRACK_MEDICATIONS_INSTRUCTION = {
  title: "Track Medications",
  paragraphs: [
    "We'll guide you through recording your medication activity.",
    "You can review everything before saving.",
    "Close this card to continue.",
  ],
} as const;

/** My Hydration — first visit for new accounts. */
export const HYDRATION_INSTRUCTION = {
  title: "My Hydration",
  paragraphs: [
    "Track how much water you drink each day using the stepper below.",
    "Your goal is 6 glasses — tap − or + to update today's count.",
    "Close this card to continue.",
  ],
} as const;

/** Bowel Movements hub — first visit for new accounts. */
export const BOWEL_INSTRUCTION = {
  title: "Bowel Movements",
  paragraphs: [
    "Your bowel logs will appear here. Record your stool type using the Bristol Stool Chart.",
    "Add as much detail as you can — it helps your care team.",
    "Close this card to continue.",
  ],
} as const;

/** My Weight hub — first visit for new accounts. */
export const WEIGHT_INSTRUCTION = {
  title: "My Weight",
  paragraphs: [
    "Your weight logs will appear here.",
    "Record your weight over time to help track changes — keep entries consistent when you can.",
    "Close this card to continue.",
  ],
} as const;

/** Appointments hub — first visit for new accounts. */
export const APPOINTMENTS_INSTRUCTION = {
  title: "Appointments",
  paragraphs: [
    "Keep track of your appointments and stay prepared for upcoming visits.",
    "Add reminders to help you remember important dates.",
    "To receive reminders, enable notifications for FlareCare in your device settings.",
    "Close this card to continue.",
  ],
} as const;

/** Symptom logs history — first visit for new accounts. */
export const SYMPTOM_LOGS_HISTORY_INSTRUCTION = {
  title: "Symptom logs",
  paragraphs: [
    "Events recorded through Log Symptoms will appear here.",
    "Tap a log to view details, or load more to browse older entries.",
    "Close this card to continue.",
  ],
} as const;

/** Medication logs history — first visit for new accounts. */
export const MEDICATION_LOGS_HISTORY_INSTRUCTION = {
  title: "Medication logs",
  paragraphs: [
    "Events recorded through Track Medications will appear here.",
    "Tap a log to view details, or load more to browse older entries.",
    "Close this card to continue.",
  ],
} as const;

/** Wellbeing logs history — first visit for new accounts. */
export const WELLBEING_LOGS_HISTORY_INSTRUCTION = {
  title: "Wellbeing logs",
  paragraphs: [
    "Events recorded through My Wellbeing will appear here.",
    "Tap a log to view details, or load more to browse older entries.",
    "Close this card to continue.",
  ],
} as const;

/** Bristol Stool Chart — first visit for new accounts. */
export const BRISTOL_GUIDE_INSTRUCTION = {
  title: "Bristol Stool Chart",
  paragraphs: [
    "The Bristol Stool Chart is used to record stool consistency on a scale from 1 to 7. Select the type that best matches your stool, from 1 (firmest) to 7 (loosest). Types 3–4 are generally considered normal.",
    "Close this card to continue.",
  ],
} as const;

/** Daily Wellbeing check-in — first visit for new accounts. */
export const WELLBEING_INSTRUCTION = {
  title: "My Wellbeing",
  paragraphs: [
    "Check in on how you're feeling today — mood, energy, sleep, anxiety, pain and more.",
    "Complete this section daily to help build a picture of your wellbeing over time.",
    "Close this card to continue.",
  ],
} as const;

/** Appointment summary hub — first visit until dismissed. */
export const APPOINTMENT_BRIEF_INSTRUCTION = {
  title: "Appointment summary",
  paragraphs: [
    "Quickly create a summary of your health information for your next appointment.",
    "Choose a suggested time period or select your own dates to include the information you need.",
    "Close this card to continue.",
  ],
} as const;
