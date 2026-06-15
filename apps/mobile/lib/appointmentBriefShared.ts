import { TABLES } from "./supabase";
import { supabase } from "./supabase";
import { getAppointmentDateTime, type AppointmentRow } from "./appointmentShared";
import { formatUkDate } from "./formatUkDate";

const DAY_MS = 24 * 60 * 60 * 1000;

function toYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export const BRIEF_WEEK_PRESETS = [2, 4, 6] as const;

export type BriefRangeMode = "preset" | "custom";

export type AppointmentBriefData = {
  period: {
    start: Date;
    end: Date;
    previousStart: Date;
    previousEnd: Date;
  };
  symptoms: {
    currentCount: number;
    previousCount: number;
    currentAverage: number | null;
    previousAverage: number | null;
  };
  bowel: {
    currentCount: number;
    previousCount: number;
    currentPerWeek: number;
    previousPerWeek: number;
    currentBristolAvg: number | null;
    previousBristolAvg: number | null;
  };
  weight: {
    currentCount: number;
    startWeight: number | null;
    endWeight: number | null;
    delta: number | null;
  };
  medications: {
    missedCurrent: number;
    missedPrevious: number;
    changePercent: number | null;
  };
  nextAppointment: AppointmentRow | null;
  talkingPoints: string[];
};

function toDayStart(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function safeNumber(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function average(nums: number[]): number | null {
  if (!nums.length) return null;
  return nums.reduce((acc, n) => acc + n, 0) / nums.length;
}

function percentage(value: number, total: number): number | null {
  if (!total) return null;
  return Math.round((value / total) * 100);
}

function inRange(date: string | Date | null | undefined, start: Date, end: Date): boolean {
  if (!date) return false;
  const d = toDayStart(new Date(date));
  if (Number.isNaN(d.getTime())) return false;
  return d >= start && d <= end;
}

export function resolveBriefPeriod(
  mode: BriefRangeMode,
  weeks: number,
  customStart: Date | null,
  customEnd: Date | null,
): { start: Date; end: Date; previousStart: Date; previousEnd: Date; error?: string } | null {
  const today = toDayStart(new Date());
  let currentStart: Date;
  let currentEnd: Date;

  if (mode === "custom") {
    if (!customStart || !customEnd) return null;
    currentStart = toDayStart(customStart);
    currentEnd = toDayStart(customEnd);
    if (currentStart.getTime() > currentEnd.getTime()) {
      return {
        start: currentStart,
        end: currentEnd,
        previousStart: currentStart,
        previousEnd: currentEnd,
        error: "Please ensure the start date is before the end date.",
      };
    }
  } else {
    currentEnd = today;
    const days = weeks * 7;
    currentStart = new Date(currentEnd.getTime() - (days - 1) * DAY_MS);
  }

  const spanDays = Math.max(1, Math.round((currentEnd.getTime() - currentStart.getTime()) / DAY_MS) + 1);
  const previousStart = new Date(currentStart.getTime() - spanDays * DAY_MS);
  const previousEnd = new Date(currentStart.getTime() - DAY_MS);

  return { start: currentStart, end: currentEnd, previousStart, previousEnd };
}

export async function buildAppointmentBrief(
  userId: string,
  period: { start: Date; end: Date; previousStart: Date; previousEnd: Date },
  weeks: number,
): Promise<AppointmentBriefData> {
  const { start: currentStart, end: currentEnd, previousStart, previousEnd } = period;
  const spanDays = Math.max(1, Math.round((currentEnd.getTime() - currentStart.getTime()) / DAY_MS) + 1);
  const today = toDayStart(new Date());

  const [symptomsRes, bowelRes, weightRes, medTrackRes, appointmentsRes] = await Promise.all([
    supabase
      .from(TABLES.LOG_SYMPTOMS)
      .select("severity, symptom_start_date, created_at")
      .eq("user_id", userId)
      .gte("created_at", previousStart.toISOString())
      .order("created_at", { ascending: false }),
    supabase
      .from(TABLES.BOWEL_MOVEMENTS)
      .select("occurred_at, bristol_type")
      .eq("user_id", userId)
      .gte("occurred_at", previousStart.toISOString())
      .order("occurred_at", { ascending: false }),
    supabase
      .from(TABLES.TRACK_WEIGHT)
      .select("date, value_kg")
      .eq("user_id", userId)
      .gte("date", previousStart.toISOString().split("T")[0])
      .order("date", { ascending: false }),
    supabase
      .from(TABLES.LOG_MEDICATIONS)
      .select("created_at, missed_medications_list")
      .eq("user_id", userId)
      .gte("created_at", previousStart.toISOString())
      .order("created_at", { ascending: false }),
    supabase
      .from(TABLES.APPOINTMENTS)
      .select("*")
      .eq("user_id", userId)
      .gte("date", toYmd(today))
      .order("date", { ascending: true })
      .order("time", { ascending: true }),
  ]);

  if (symptomsRes.error) throw symptomsRes.error;
  if (bowelRes.error) throw bowelRes.error;
  if (weightRes.error) throw weightRes.error;
  if (medTrackRes.error) throw medTrackRes.error;
  if (appointmentsRes.error) throw appointmentsRes.error;

  const symptoms = symptomsRes.data ?? [];
  const symptomsCurrent = symptoms.filter((row) => {
    const eventDate = row.symptom_start_date || row.created_at;
    return inRange(eventDate, currentStart, currentEnd);
  });
  const symptomsPrevious = symptoms.filter((row) => {
    const eventDate = row.symptom_start_date || row.created_at;
    return inRange(eventDate, previousStart, previousEnd);
  });
  const severityCurrent = average(
    symptomsCurrent.map((row) => safeNumber(row.severity)).filter((n): n is number => n != null),
  );
  const severityPrevious = average(
    symptomsPrevious.map((row) => safeNumber(row.severity)).filter((n): n is number => n != null),
  );

  const bowelLogs = bowelRes.data ?? [];
  const bowelCurrent = bowelLogs.filter((row) => inRange(row.occurred_at, currentStart, currentEnd));
  const bowelPrevious = bowelLogs.filter((row) => inRange(row.occurred_at, previousStart, previousEnd));
  const currentWeeks = Math.max(1, spanDays / 7);
  const bowelCurrentPerWeek = Number((bowelCurrent.length / currentWeeks).toFixed(1));
  const bowelPreviousPerWeek = Number((bowelPrevious.length / currentWeeks).toFixed(1));
  const bristolCurrentAvg = average(
    bowelCurrent.map((row) => safeNumber(row.bristol_type)).filter((n): n is number => n != null),
  );
  const bristolPreviousAvg = average(
    bowelPrevious.map((row) => safeNumber(row.bristol_type)).filter((n): n is number => n != null),
  );

  const weightRows = (weightRes.data ?? [])
    .map((row) => ({ ...row, parsedDate: new Date(row.date) }))
    .filter((row) => !Number.isNaN(row.parsedDate.getTime()));
  const weightCurrent = weightRows
    .filter((row) => row.parsedDate >= currentStart && row.parsedDate <= currentEnd)
    .sort((a, b) => a.parsedDate.getTime() - b.parsedDate.getTime());
  const startWeight = safeNumber(weightCurrent[0]?.value_kg);
  const endWeight = safeNumber(weightCurrent[weightCurrent.length - 1]?.value_kg);
  const weightDelta =
    startWeight != null && endWeight != null ? Number((endWeight - startWeight).toFixed(1)) : null;

  const medicationTrackingRows = medTrackRes.data ?? [];
  const countMissedInRange = (start: Date, end: Date) => {
    let total = 0;
    medicationTrackingRows.forEach((entry) => {
      const list = Array.isArray(entry.missed_medications_list) ? entry.missed_medications_list : [];
      list.forEach((item: { date?: string; date_taken?: string }) => {
        const itemDate = item?.date || item?.date_taken || entry.created_at;
        if (inRange(itemDate, start, end)) total += 1;
      });
    });
    return total;
  };
  const missedCurrent = countMissedInRange(currentStart, currentEnd);
  const missedPrevious = countMissedInRange(previousStart, previousEnd);

  const now = new Date();
  const upcomingAppointments = ((appointmentsRes.data ?? []) as AppointmentRow[]).filter((apt) => {
    const aptDateTime = getAppointmentDateTime(apt);
    return aptDateTime && aptDateTime.getTime() >= now.getTime();
  });
  const nextAppointment = upcomingAppointments[0] ?? null;

  const talkingPoints: string[] = [];
  if (severityCurrent != null && severityPrevious != null) {
    const diff = severityCurrent - severityPrevious;
    if (Math.abs(diff) >= 0.5) {
      talkingPoints.push(
        diff > 0
          ? `Average symptom severity increased by ${diff.toFixed(1)} points.`
          : `Average symptom severity decreased by ${Math.abs(diff).toFixed(1)} points.`,
      );
    }
  }
  if (Math.abs(bowelCurrentPerWeek - bowelPreviousPerWeek) >= 1) {
    talkingPoints.push(
      bowelCurrentPerWeek > bowelPreviousPerWeek
        ? `Bowel logs increased to ${bowelCurrentPerWeek}/week from ${bowelPreviousPerWeek}/week.`
        : `Bowel logs dropped to ${bowelCurrentPerWeek}/week from ${bowelPreviousPerWeek}/week.`,
    );
  }
  if (weightDelta != null && Math.abs(weightDelta) >= 0.5) {
    talkingPoints.push(
      weightDelta > 0
        ? `Weight is up by ${weightDelta} kg in this period.`
        : `Weight is down by ${Math.abs(weightDelta)} kg in this period.`,
    );
  }
  if (missedCurrent > missedPrevious) {
    talkingPoints.push(`More missed medication events were logged (${missedCurrent} vs ${missedPrevious}).`);
  } else if (missedPrevious > missedCurrent) {
    talkingPoints.push(`Fewer missed medication events were logged (${missedCurrent} vs ${missedPrevious}).`);
  }
  if (!talkingPoints.length) {
    talkingPoints.push("No major shifts detected in logged data over this period.");
  }

  return {
    period: { start: currentStart, end: currentEnd, previousStart, previousEnd },
    symptoms: {
      currentCount: symptomsCurrent.length,
      previousCount: symptomsPrevious.length,
      currentAverage: severityCurrent,
      previousAverage: severityPrevious,
    },
    bowel: {
      currentCount: bowelCurrent.length,
      previousCount: bowelPrevious.length,
      currentPerWeek: bowelCurrentPerWeek,
      previousPerWeek: bowelPreviousPerWeek,
      currentBristolAvg: bristolCurrentAvg,
      previousBristolAvg: bristolPreviousAvg,
    },
    weight: {
      currentCount: weightCurrent.length,
      startWeight,
      endWeight,
      delta: weightDelta,
    },
    medications: {
      missedCurrent,
      missedPrevious,
      changePercent: percentage(Math.max(missedCurrent - missedPrevious, 0), Math.max(missedPrevious, 1)),
    },
    nextAppointment,
    talkingPoints,
  };
}

export function formatAppointmentBriefText(brief: AppointmentBriefData, weeks: number): string {
  const startYmd = toYmd(brief.period.start);
  const endYmd = toYmd(brief.period.end);
  const lines = [
    `Appointment Brief (${weeks} weeks)`,
    `${formatUkDate(startYmd)} to ${formatUkDate(endYmd)}`,
    "",
    `Symptoms: ${brief.symptoms.currentCount} logs, avg severity ${brief.symptoms.currentAverage != null ? brief.symptoms.currentAverage.toFixed(1) : "N/A"}/10`,
    `Bowel: ${brief.bowel.currentCount} logs (${brief.bowel.currentPerWeek}/week), avg Bristol ${brief.bowel.currentBristolAvg != null ? brief.bowel.currentBristolAvg.toFixed(1) : "N/A"}`,
    `Weight: ${brief.weight.startWeight != null && brief.weight.endWeight != null ? `${brief.weight.startWeight}kg -> ${brief.weight.endWeight}kg (${brief.weight.delta != null && brief.weight.delta >= 0 ? "+" : ""}${brief.weight.delta}kg)` : "Insufficient logs"}`,
    `Missed doses in selected period: ${brief.medications.missedCurrent}`,
    "",
    "What changed:",
    ...brief.talkingPoints.map((point) => `- ${point}`),
  ];
  return lines.join("\n");
}

export type AppointmentBriefRouteParams = {
  mode: BriefRangeMode;
  weeks?: number;
  startYmd?: string;
  endYmd?: string;
};

export function formatBriefPeriodChoiceLabel(params: AppointmentBriefRouteParams): string {
  if (params.mode === "custom") return "Custom";
  return `Last ${params.weeks ?? 4} weeks`;
}

export function briefWeeksFromPeriod(period: { start: Date; end: Date }): number {
  const spanDays = Math.max(1, Math.round((period.end.getTime() - period.start.getTime()) / DAY_MS) + 1);
  return Math.max(1, Math.round(spanDays / 7));
}

export function getBriefCacheKey(userId: string, params: AppointmentBriefRouteParams): string {
  if (params.mode === "preset") return `${userId}:preset:${params.weeks ?? 4}`;
  return `${userId}:custom:${params.startYmd ?? ""}:${params.endYmd ?? ""}`;
}

type BriefCacheEntry = { data: AppointmentBriefData; weeks: number };
const briefCacheByKey: Record<string, BriefCacheEntry> = {};

export function getCachedAppointmentBrief(key: string): BriefCacheEntry | null {
  return briefCacheByKey[key] ?? null;
}

export function setCachedAppointmentBrief(key: string, entry: BriefCacheEntry) {
  briefCacheByKey[key] = entry;
}

export function invalidateAppointmentBriefCache(userId?: string) {
  if (!userId) {
    for (const key of Object.keys(briefCacheByKey)) delete briefCacheByKey[key];
    return;
  }
  for (const key of Object.keys(briefCacheByKey)) {
    if (key.startsWith(`${userId}:`)) delete briefCacheByKey[key];
  }
}

export function resolveBriefRoutePeriod(
  params: AppointmentBriefRouteParams,
): { period: { start: Date; end: Date; previousStart: Date; previousEnd: Date }; weeks: number; error?: string } | null {
  if (params.mode === "preset") {
    const weeks = params.weeks ?? 4;
    const resolved = resolveBriefPeriod("preset", weeks, null, null);
    if (!resolved) return null;
    if (resolved.error) return { period: resolved, weeks, error: resolved.error };
    return { period: resolved, weeks };
  }
  if (!params.startYmd || !params.endYmd) return null;
  const customStart = new Date(`${params.startYmd}T12:00:00`);
  const customEnd = new Date(`${params.endYmd}T12:00:00`);
  const resolved = resolveBriefPeriod("custom", 4, customStart, customEnd);
  if (!resolved) return null;
  if (resolved.error) return { period: resolved, weeks: briefWeeksFromPeriod(resolved), error: resolved.error };
  return { period: resolved, weeks: briefWeeksFromPeriod(resolved) };
}
