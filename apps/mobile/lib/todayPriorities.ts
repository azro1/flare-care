import {
  type AppointmentRow,
  getAppointmentDateTime,
} from "./appointmentShared";
import { todayYmd } from "./bowelMovementShared";
import type { DashboardTodaySummary } from "./dashboardSnapshotCache";
import { HYDRATION_TARGET } from "./hydrationShared";
import type { SupplyDueStatus } from "./medicalSuppliesShared";

export const TODAY_PRIORITIES_COLLAPSED_COUNT = 3;

export type TodayPriorityItem = {
  id: string;
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

/** Earliest still-upcoming appointment on today or tomorrow (calendar). */
export function findNearTermAppointment(
  rows: AppointmentRow[],
  today: string = todayYmd(),
  nowMs: number = Date.now(),
): AppointmentRow | null {
  const tomorrow = addDaysToYmd(today, 1);
  const candidates = rows
    .map((apt) => {
      const date = appointmentDateOnly(apt);
      if (date !== today && date !== tomorrow) return null;
      const dt = getAppointmentDateTime(apt);
      if (!dt) return null;
      // Today's appointment drops once its time has passed (e.g. 8am shouldn't linger all day).
      if (date === today && dt.getTime() < nowMs) return null;
      return { apt, date, sortKey: dt.getTime() };
    })
    .filter((x): x is { apt: AppointmentRow; date: string; sortKey: number } => x != null)
    .sort((a, b) => a.sortKey - b.sortKey);
  return candidates[0]?.apt ?? null;
}

export function buildTodayPriorities(input: {
  todaySummary: DashboardTodaySummary;
  nearAppointment: AppointmentRow | null;
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
    items.push({
      id: "meds",
      text: "Take meds",
    });
  }

  if (todaySummary.hydration < hydrationTarget) {
    items.push({
      id: "hydration",
      text: "Stay hydrated",
    });
  }

  const hasCheckedIn =
    todaySummary.symptoms > 0 ||
    todaySummary.wellbeingLogged ||
    todaySummary.medicationTrackingLogged;
  if (!hasCheckedIn) {
    items.push({
      id: "check-in",
      text: "Check-in",
    });
  }

  if (nearAppointment) {
    const date = appointmentDateOnly(nearAppointment) || today;
    const dt = getAppointmentDateTime(nearAppointment);
    const stillUpcoming = date !== today || !dt || dt.getTime() >= Date.now();
    if (stillUpcoming) {
      const when = date === today ? "today" : "tomorrow";
      items.push({
        id: `appointment-${nearAppointment.id}`,
        text: `Appointment ${when}`,
      });
    }
  }

  if (input.suppliesStatus === "due" || input.suppliesStatus === "overdue") {
    items.push({
      id: "supplies",
      text: input.suppliesStatus === "overdue" ? "Supplies overdue" : "Supplies due",
    });
  }

  return items;
}
