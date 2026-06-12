import { LOG_HISTORY_LOAD_MORE_BATCH } from "./logHistoryConstants";
import { TIME_PICKER_MINUTE_INTERVAL } from "./layoutConstants";

/** MaterialCommunityIcons — no bowel/intestine glyph; `toilet` is the closest match in the set. */
export const BOWEL_FEATURE_MCI_ICON = "toilet" as const;

/** Tri-state form values — match web `bowel-movements/page.js`. */
export type TriStateValue = "" | "skip" | "true" | "false";

export const TRI_STATE_PICKER_LABELS = ["Prefer not to say", "No", "Yes"] as const;

export function parseTriState(value: TriStateValue): boolean | null {
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
}

export function boolToTri(value: boolean | null | undefined): TriStateValue {
  if (value === true) return "true";
  if (value === false) return "false";
  return "skip";
}

export function triStateDisplayLabel(value: TriStateValue): string {
  if (value === "true") return "Yes";
  if (value === "false") return "No";
  if (value === "skip") return "Prefer not to say";
  return "—";
}

export function triStateFromPickerLabel(label: string): TriStateValue {
  if (label === "Yes") return "true";
  if (label === "No") return "false";
  return "skip";
}

export function generateTimeOptions(): string[] {
  const options: string[] = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += TIME_PICKER_MINUTE_INTERVAL) {
      options.push(`${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`);
    }
  }
  return options;
}

export const BOWEL_TIME_OPTIONS = generateTimeOptions();

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

/** Local calendar today as YYYY-MM-DD. */
export function todayYmd(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** Default date (today) and empty time — user must pick time (matches web `emptyFormState`). */
export function defaultDateTimeParts(): { date: string; time: string } {
  const d = new Date();
  const date = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  return { date, time: "" };
}

function snapTimeToPickerInterval(d: Date): string {
  let totalMins = d.getHours() * 60 + d.getMinutes();
  totalMins = Math.round(totalMins / TIME_PICKER_MINUTE_INTERVAL) * TIME_PICKER_MINUTE_INTERVAL;
  if (totalMins >= 24 * 60) totalMins = 24 * 60 - TIME_PICKER_MINUTE_INTERVAL;
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  return `${pad2(h)}:${pad2(m)}`;
}

/** HH:mm snapped to native picker steps — for form state and time picker commits. */
export function snapTimeHmFromDate(d: Date): string {
  return snapTimeToPickerInterval(d);
}

/** Local YYYY-MM-DD + HH:mm (picker snap) from stored instant. */
export function occurredAtToFormParts(iso: string | null | undefined): { date: string; time: string } {
  if (!iso) return defaultDateTimeParts();
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return defaultDateTimeParts();
  const date = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  return { date, time: snapTimeToPickerInterval(d) };
}

export function formatUkTimeFromOccurred(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/** Newest saved log first — matches web sort. */
export function sortBowelByCreatedAtDesc<T extends { created_at?: string | null; occurred_at?: string | null }>(
  rows: T[],
): T[] {
  return [...rows].sort((a, b) => {
    const byCreated = new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    if (byCreated !== 0) return byCreated;
    return new Date(b.occurred_at || 0).getTime() - new Date(a.occurred_at || 0).getTime();
  });
}

export type BowelFormState = {
  date: string;
  dateTouched: boolean;
  time: string;
  bristolType: number | null;
  blood: TriStateValue;
  strain: TriStateValue;
  urgency: TriStateValue;
  notes: string;
};

export function emptyBowelFormState(): BowelFormState {
  const { date } = defaultDateTimeParts();
  return {
    date,
    dateTouched: false,
    time: "",
    bristolType: null,
    blood: "",
    strain: "",
    urgency: "",
    notes: "",
  };
}

/** New log sheet — empty date/time until the user picks. */
export function quickBowelFormState(): BowelFormState {
  return {
    date: "",
    dateTouched: false,
    time: "",
    bristolType: null,
    blood: "",
    strain: "",
    urgency: "",
    notes: "",
  };
}

export function bowelFormHasOptionalDetails(form: BowelFormState): boolean {
  return Boolean(form.blood || form.strain || form.urgency || form.notes.trim());
}

export type BowelMovementRow = {
  id: string;
  user_id: string;
  occurred_at: string;
  bristol_type: number;
  blood: boolean | null;
  strain: boolean | null;
  urgency: boolean | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export function bowelFormFromRow(row: BowelMovementRow): BowelFormState {
  const { date, time } = occurredAtToFormParts(row.occurred_at);
  return {
    date,
    dateTouched: true,
    time,
    bristolType: row.bristol_type,
    blood: boolToTri(row.blood),
    strain: boolToTri(row.strain),
    urgency: boolToTri(row.urgency),
    notes: row.notes || "",
  };
}

export function buildOccurredAtIso(date: string, time: string): Date | null {
  const occurred = new Date(`${date}T${time}:00`);
  if (Number.isNaN(occurred.getTime())) return null;
  return occurred;
}

export function validateBowelForm(form: BowelFormState): string | null {
  if (form.bristolType == null) return "Please select a Bristol chart type.";
  if (!form.date) return "Please select a date.";
  if (!form.time) return "Please select a time.";
  const occurred = buildOccurredAtIso(form.date, form.time);
  if (!occurred) return "Please enter a valid date and time.";
  if (form.date === todayYmd() && occurred.getTime() > Date.now()) return "Can't be in the future";
  return null;
}

export function bowelPayloadFromForm(form: BowelFormState) {
  const occurred = buildOccurredAtIso(form.date, form.time)!;
  return {
    occurred_at: occurred.toISOString(),
    bristol_type: form.bristolType!,
    blood: parseTriState(form.blood),
    strain: parseTriState(form.strain),
    urgency: parseTriState(form.urgency),
    notes: form.notes.trim() || null,
    updated_at: new Date().toISOString(),
  };
}

type BowelListCacheSnapshot = {
  rows: BowelMovementRow[];
  totalCount: number;
  visibleCount: number;
};

const bowelListCacheByUserId: Record<string, BowelListCacheSnapshot> = {};

export function getBowelListCache(userId: string): BowelListCacheSnapshot | undefined {
  return bowelListCacheByUserId[userId];
}

export function setBowelListCache(userId: string, snapshot: BowelListCacheSnapshot) {
  bowelListCacheByUserId[userId] = snapshot;
}

export function invalidateBowelListCache(userId: string) {
  delete bowelListCacheByUserId[userId];
}

/** Stack routes that count as the bowel feature — list expansion survives detail ↔ chart, not leaving here. */
export const BOWEL_SECTION_ROUTE_NAMES = ["Bowel", "BowelLogDetail", "BristolGuide"] as const;

export function isBowelSectionRoute(routeName: string | undefined): boolean {
  return (BOWEL_SECTION_ROUTE_NAMES as readonly string[]).includes(routeName ?? "");
}

export function resetBowelListExpansion(userId: string, initialVisible = LOG_HISTORY_LOAD_MORE_BATCH) {
  const cached = bowelListCacheByUserId[userId];
  if (cached) {
    bowelListCacheByUserId[userId] = { ...cached, visibleCount: initialVisible };
  }
}
