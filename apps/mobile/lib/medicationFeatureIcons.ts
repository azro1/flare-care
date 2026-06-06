/**
 * Dashboard / feature icons — MaterialCommunityIcons only (@expo/vector-icons).
 *
 * **My Meds** — user's prescribed medication list (GP / hospital team).
 * **Track Medications** — wizard for missed prescribed meds, NSAIDs, antibiotics (`log_medications`).
 * These flows are separate; icons must stay distinct.
 */
export const MY_MEDS_MCI_ICON = "pill" as const;

/** Adherence logging — chart/patterns (matches web track page `ChartLine`); not the prescribed-med list. */
export const TRACK_MEDICATIONS_MCI_ICON = "chart-line" as const;
