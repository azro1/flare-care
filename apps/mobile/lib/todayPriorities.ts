import {
  type AppointmentRow,
  getAppointmentDateTime,
} from "./appointmentShared";
import { todayYmd } from "./bowelMovementShared";
import type { DashboardTodaySummary } from "./dashboardSnapshotCache";
import { HYDRATION_TARGET } from "./hydrationShared";
import {
  formatMedicationReminderTime,
  type MedicationRow,
} from "./medicationShared";

import type { SupplyDueStatus } from "./medicalSuppliesShared";

export const TODAY_PRIORITIES_COLLAPSED_COUNT = 3;

export type TodayPriorityItem = {
  id: string;
  emoji: string;
  text: string;
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function addDaysToYmd(ymd: string, days: number): string {
  const m = String(ymd).trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const d = m
    ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
    : new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function appointmentDateOnly(row: AppointmentRow): string | null {
  return String(row.date || "").match(/^(\d{4}-\d{2}-\d{2})/)?.[1] ?? null;
}

function timeOfDaySortKey(timeOfDay: string | null | undefined): number {
  const t = (timeOfDay || "").trim();
  if (!/^\d{2}:\d{2}$/.test(t)) return Number.MAX_SAFE_INTEGER;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

/** Earliest appointment on today or tomorrow (calendar). */
export function findNearTermAppointment(
  rows: AppointmentRow[],
  today: string = todayYmd(),
): AppointmentRow | null {
  const tomorrow = addDaysToYmd(today, 1);
  const candidates = rows
    .map((apt) => {
      const date = appointmentDateOnly(apt);
      if (date !== today && date !== tomorrow) return null;
      const dt = getAppointmentDateTime(apt);
      return { apt, date, sortKey: dt?.getTime() ?? 0 };
    })
    .filter((x): x is { apt: AppointmentRow; date: string; sortKey: number } => x != null)
    .sort((a, b) => a.sortKey - b.sortKey);
  return candidates[0]?.apt ?? null;
}

/** Next untaken prescribed med with a clock time — for “Take medication at 6:00 PM”. */
export function nextUntakenMedicationTimeLabel(
  meds: MedicationRow[],
  takenMedicationIds: Iterable<number | string>,
): string | null {
  const taken = new Set([...takenMedicationIds].map((id) => String(id)));
  const untaken = meds
    .filter((med) => med.name !== "Medication Tracking")
    .filter((med) => !taken.has(String(med.id)))
    .filter((med) => {
      const t = med.time_of_day?.trim();
      return Boolean(t && t !== "as-needed" && /^\d{2}:\d{2}$/.test(t));
    })
    .sort((a, b) => timeOfDaySortKey(a.time_of_day) - timeOfDaySortKey(b.time_of_day));
  if (untaken.length === 0) return null;
  const label = formatMedicationReminderTime(untaken[0].time_of_day);
  return label === "Not set" ? null : label;
}

export function buildTodayPriorities(input: {
  todaySummary: DashboardTodaySummary;
  nearAppointment: AppointmentRow | null;
  nextMedicationTimeLabel?: string | null;
  today?: string;
  hydrationTarget?: number;
  /** From supplies kit — show nudge when due or overdue and the list isn’t empty. */
  suppliesStatus?: SupplyDueStatus | null;
}): TodayPriorityItem[] {
  const today = input.today ?? todayYmd();
  const hydrationTarget = input.hydrationTarget ?? HYDRATION_TARGET;
  const { todaySummary, nearAppointment } = input;
  const items: TodayPriorityItem[] = [];

  const remainingMeds = Math.max(0, todaySummary.medsTotal - todaySummary.medsTaken);
  if (todaySummary.medsTotal > 0 && remainingMeds > 0) {
    const time = input.nextMedicationTimeLabel?.trim();
    items.push({
      id: "meds",
      emoji: "💊",
      text: time ? `Take medication at ${time}` : "Take medication",
    });
  }

  if (todaySummary.hydration < hydrationTarget) {
    items.push({
      id: "hydration",
      emoji: "💧",
      text: "Stay hydrated",
    });
  }

  const needsSymptoms = todaySummary.symptoms <= 0;
  const needsWellbeing = !todaySummary.wellbeingLogged;
  if (needsSymptoms || needsWellbeing) {
    items.push({
      id: "check-in",
      emoji: "📝",
      text: "Check-in not completed",
    });
  }

  if (nearAppointment) {
    const date = appointmentDateOnly(nearAppointment) || today;
    const when = date === today ? "today" : "tomorrow";
    items.push({
      id: `appointment-${nearAppointment.id}`,
      emoji: "📅",
      text: `Appointment ${when}`,
    });
  }

  if (input.suppliesStatus === "due" || input.suppliesStatus === "overdue") {
    items.push({
      id: "supplies",
      emoji: "📦",
      text: input.suppliesStatus === "overdue" ? "Supplies overdue" : "Supplies due",
    });
  }

  return items;
}
