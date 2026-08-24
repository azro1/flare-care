import { todayYmd } from "./bowelMovementShared";
import { FLARE_FEATURE_LUCIDE } from "./flareLucideIcons";
import { formatUkDate } from "./formatUkDate";
import { sanitizeNotesMobile } from "./symptomWizardShared";
import { supabase, TABLES } from "./supabase";

export const MEDICAL_SUPPLIES_FEATURE_ICON = FLARE_FEATURE_LUCIDE.supplies;

export const SUPPLY_CADENCE_OPTIONS = [
  { days: 7, label: "Weekly" },
  { days: 14, label: "Every 2 weeks" },
  { days: 28, label: "Every 4 weeks" },
] as const;

/** Preset values only — stored cadence can also be a custom day count. */
export type SupplyCadencePreset = (typeof SUPPLY_CADENCE_OPTIONS)[number]["days"];

export const SUPPLY_CADENCE_MIN_DAYS = 1;
export const SUPPLY_CADENCE_MAX_DAYS = 365;

export function isPresetCadenceDays(days: number): days is SupplyCadencePreset {
  return SUPPLY_CADENCE_OPTIONS.some((o) => o.days === days);
}

/** Named reorder order — stock + wording + cadence hang off this. */
export type MedicalSupplyKitRow = {
  id: number;
  user_id: string;
  name: string;
  cadence_days: number;
  next_due_date: string;
  recipient_email: string | null;
  email_subject: string | null;
  request_body: string | null;
  sort_order: number;
  created_at: string;
  updated_at?: string | null;
};

export type MedicalSupplyRow = {
  id: number;
  user_id: string;
  kit_id: number;
  name: string;
  quantity: string;
  sort_order: number;
  notes: string | null;
  created_at: string;
  updated_at?: string | null;
};

export type MedicalSupplyFormState = {
  name: string;
  quantity: string;
  notes: string;
};

export type SupplyDueStatus = "empty" | "upcoming" | "due" | "overdue";

export type SupplyDashboardSummary = {
  kitCount: number;
  status: SupplyDueStatus;
  dueKitName: string | null;
};

export type KitListEntry = {
  kit: MedicalSupplyKitRow;
  itemCount: number;
  status: SupplyDueStatus;
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

const KIT_SELECT =
  "id, user_id, name, cadence_days, next_due_date, recipient_email, email_subject, request_body, sort_order, created_at, updated_at";

const SUPPLY_SELECT = "id, user_id, kit_id, name, quantity, sort_order, notes, created_at, updated_at";

export function emptyMedicalSupplyFormState(): MedicalSupplyFormState {
  return { name: "", quantity: "", notes: "" };
}

export function medicalSupplyFormFromRow(row: MedicalSupplyRow): MedicalSupplyFormState {
  return {
    name: row.name || "",
    quantity: row.quantity || "",
    notes: row.notes || "",
  };
}

export function sanitizeSupplyName(name: string): string {
  if (typeof name !== "string") return "";
  return name.replace(/<[^>]*>/g, "").trim().slice(0, 100);
}

/** User-facing order name (e.g. “Stoma – Charter”). */
export function sanitizeKitName(name: string): string {
  if (typeof name !== "string") return "";
  return name.replace(/<[^>]*>/g, "").trim().slice(0, 80);
}

export function sanitizeSupplyQuantity(quantity: string): string {
  if (typeof quantity !== "string") return "";
  return quantity.replace(/<[^>]*>/g, "").trim().slice(0, 40);
}

export function parseYmdLocal(ymd: string): Date {
  const m = String(ymd).trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return new Date();
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

export function formatYmdLocal(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function addDaysToYmd(ymd: string, days: number): string {
  const d = parseYmdLocal(ymd);
  d.setDate(d.getDate() + days);
  return formatYmdLocal(d);
}

export function cadenceLabel(days: number): string {
  const match = SUPPLY_CADENCE_OPTIONS.find((o) => o.days === days);
  if (match) return match.label;
  if (days % 7 === 0) {
    const weeks = days / 7;
    return weeks === 1 ? "Weekly" : `Every ${weeks} weeks`;
  }
  return `Every ${days} days`;
}

/** Clamp to a usable day count. Does not force presets — 56 (8 weeks) stays 56. */
export function normalizeCadenceDays(value: number | null | undefined): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 7;
  const days = Math.round(n);
  if (days < SUPPLY_CADENCE_MIN_DAYS) return SUPPLY_CADENCE_MIN_DAYS;
  if (days > SUPPLY_CADENCE_MAX_DAYS) return SUPPLY_CADENCE_MAX_DAYS;
  return days;
}

export function weeksToCadenceDays(weeks: number): number {
  return normalizeCadenceDays(Math.round(weeks) * 7);
}

export function cadenceDaysToWeeks(days: number): number {
  const d = normalizeCadenceDays(days);
  return Math.max(1, Math.round(d / 7));
}

export function supplyDueStatus(kit: MedicalSupplyKitRow | null, itemCount: number): SupplyDueStatus {
  if (itemCount <= 0) return "empty";
  if (!kit?.next_due_date) return "upcoming";
  const today = todayYmd();
  if (kit.next_due_date < today) return "overdue";
  if (kit.next_due_date === today) return "due";
  return "upcoming";
}

export function supplyDueHeadline(kit: MedicalSupplyKitRow | null, itemCount: number): string {
  if (itemCount <= 0) return "Add items to this order";
  if (!kit?.next_due_date) return "Set when this order is due";
  const today = todayYmd();
  if (kit.next_due_date < today) return `Order overdue: ${formatUkDate(kit.next_due_date)}`;
  if (kit.next_due_date === today) return `Order due today: ${formatUkDate(kit.next_due_date)}`;
  return `Next order due: ${formatUkDate(kit.next_due_date)}`;
}

/** Short due line for hub order cards — detail screen keeps the fuller headline. */
export function supplyDueListLabel(kit: MedicalSupplyKitRow, itemCount: number): string {
  if (itemCount <= 0) return "Add items";
  if (!kit.next_due_date) return "Set next due date";
  const today = todayYmd();
  if (kit.next_due_date < today) return `Overdue · ${formatUkDate(kit.next_due_date)}`;
  if (kit.next_due_date === today) return "Due today";
  return `Due ${formatUkDate(kit.next_due_date)}`;
}

/** First open — no named orders yet. */
export function needsMedicalSuppliesSetup(kitCount: number): boolean {
  return kitCount <= 0;
}

export function buildSupplyRequestText(items: MedicalSupplyRow[]): string {
  if (items.length === 0) return "";
  return items
    .map((item) => {
      const qty = item.quantity?.trim() || "—";
      const note = item.notes?.trim();
      return `    • ${item.name} — ${qty}${note ? ` (${note})` : ""}`;
    })
    .join("\n");
}

export const DEFAULT_SUPPLY_REQUEST_SUBJECT = "Medical supply request";

export async function fetchMedicalSupplyKitsForUser(userId: string): Promise<MedicalSupplyKitRow[]> {
  const { data, error } = await supabase
    .from(TABLES.MEDICAL_SUPPLY_KITS)
    .select(KIT_SELECT)
    .eq("user_id", userId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data || []) as MedicalSupplyKitRow[];
}

export async function fetchMedicalSupplyKit(userId: string, kitId: number): Promise<MedicalSupplyKitRow | null> {
  const { data, error } = await supabase
    .from(TABLES.MEDICAL_SUPPLY_KITS)
    .select(KIT_SELECT)
    .eq("user_id", userId)
    .eq("id", kitId)
    .maybeSingle();
  if (error) throw error;
  return (data as MedicalSupplyKitRow | null) ?? null;
}

export async function fetchMedicalSuppliesForKit(userId: string, kitId: number): Promise<MedicalSupplyRow[]> {
  const { data, error } = await supabase
    .from(TABLES.MEDICAL_SUPPLIES)
    .select(SUPPLY_SELECT)
    .eq("user_id", userId)
    .eq("kit_id", kitId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data || []) as MedicalSupplyRow[];
}

export async function fetchKitListEntries(userId: string): Promise<KitListEntry[]> {
  const kits = await fetchMedicalSupplyKitsForUser(userId);
  if (kits.length === 0) {
    setMedicalSupplyKitListCache(userId, []);
    return [];
  }
  const { data, error } = await supabase.from(TABLES.MEDICAL_SUPPLIES).select("kit_id").eq("user_id", userId);
  if (error) throw error;
  const counts = new Map<number, number>();
  for (const row of data || []) {
    const kid = Number((row as { kit_id: number }).kit_id);
    if (!Number.isFinite(kid)) continue;
    counts.set(kid, (counts.get(kid) || 0) + 1);
  }
  const entries = kits.map((kit) => {
    const itemCount = counts.get(kit.id) || 0;
    return { kit, itemCount, status: supplyDueStatus(kit, itemCount) };
  });
  setMedicalSupplyKitListCache(userId, entries);
  return entries;
}

/** Seed hub/setup first paint — same pattern as appointments list cache. */
const medicalSupplyKitListCacheByUserId: Record<string, KitListEntry[]> = {};

export function getMedicalSupplyKitListCache(userId: string): KitListEntry[] | undefined {
  return medicalSupplyKitListCacheByUserId[userId];
}

export function setMedicalSupplyKitListCache(userId: string, entries: KitListEntry[]): void {
  medicalSupplyKitListCacheByUserId[userId] = entries;
}

export function clearMedicalSupplyKitListCache(userId: string): void {
  delete medicalSupplyKitListCacheByUserId[userId];
}

export function supplyDueStatusFromKitListCache(userId: string): SupplyDueStatus | null {
  const entries = getMedicalSupplyKitListCache(userId);
  if (entries === undefined) return null;
  if (entries.length === 0) return "empty";
  if (entries.some((e) => e.status === "overdue")) return "overdue";
  if (entries.some((e) => e.status === "due")) return "due";
  return "upcoming";
}

export async function fetchSupplyDashboardSummary(userId: string): Promise<SupplyDashboardSummary> {
  const entries = await fetchKitListEntries(userId);
  const kitCount = entries.length;
  if (kitCount === 0) {
    return { kitCount: 0, status: "empty", dueKitName: null };
  }
  const overdue = entries.find((e) => e.status === "overdue");
  if (overdue) {
    return { kitCount, status: "overdue", dueKitName: overdue.kit.name };
  }
  const due = entries.find((e) => e.status === "due");
  if (due) {
    return { kitCount, status: "due", dueKitName: due.kit.name };
  }
  return { kitCount, status: "upcoming", dueKitName: null };
}

export async function insertMedicalSupplyKit(
  userId: string,
  input: {
    name: string;
    cadence_days: number;
    next_due_date: string;
  },
): Promise<MedicalSupplyKitRow> {
  const existing = await fetchMedicalSupplyKitsForUser(userId);
  const sortOrder = existing.length === 0 ? 0 : Math.max(...existing.map((k) => k.sort_order ?? 0)) + 1;
  const { data, error } = await supabase
    .from(TABLES.MEDICAL_SUPPLY_KITS)
    .insert([
      {
        user_id: userId,
        name: sanitizeKitName(input.name),
        cadence_days: normalizeCadenceDays(input.cadence_days),
        next_due_date: input.next_due_date,
        sort_order: sortOrder,
      },
    ])
    .select(KIT_SELECT)
    .single();
  if (error) throw error;
  clearMedicalSupplyKitListCache(userId);
  return data as MedicalSupplyKitRow;
}

export async function updateMedicalSupplyKit(
  userId: string,
  kitId: number,
  patch: {
    name?: string;
    cadence_days?: number;
    next_due_date?: string;
    recipient_email?: string | null;
    email_subject?: string | null;
    request_body?: string | null;
  },
): Promise<MedicalSupplyKitRow> {
  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.name !== undefined) payload.name = sanitizeKitName(patch.name);
  if (patch.cadence_days !== undefined) payload.cadence_days = normalizeCadenceDays(patch.cadence_days);
  if (patch.next_due_date !== undefined) payload.next_due_date = patch.next_due_date;
  if (patch.recipient_email !== undefined) payload.recipient_email = patch.recipient_email?.trim() || null;
  if (patch.email_subject !== undefined) {
    payload.email_subject = String(patch.email_subject).trim().slice(0, 200) || null;
  }
  if (patch.request_body !== undefined) {
    payload.request_body = String(patch.request_body).trim().slice(0, 8000) || null;
  }

  const { data, error } = await supabase
    .from(TABLES.MEDICAL_SUPPLY_KITS)
    .update(payload)
    .eq("user_id", userId)
    .eq("id", kitId)
    .select(KIT_SELECT)
    .single();
  if (error) throw error;
  return data as MedicalSupplyKitRow;
}

export async function deleteMedicalSupplyKit(userId: string, kitId: number): Promise<void> {
  const { error: itemsError } = await supabase
    .from(TABLES.MEDICAL_SUPPLIES)
    .delete()
    .eq("user_id", userId)
    .eq("kit_id", kitId);
  if (itemsError) throw itemsError;
  const { error } = await supabase
    .from(TABLES.MEDICAL_SUPPLY_KITS)
    .delete()
    .eq("user_id", userId)
    .eq("id", kitId);
  if (error) throw error;
  clearMedicalSupplyKitListCache(userId);
}

export async function advanceMedicalSupplyKitDueDate(
  userId: string,
  kitId: number,
): Promise<MedicalSupplyKitRow> {
  const kit = await fetchMedicalSupplyKit(userId, kitId);
  if (!kit) throw new Error("Order not found.");
  const cadence = normalizeCadenceDays(kit.cadence_days);
  const base = kit.next_due_date && kit.next_due_date > todayYmd() ? kit.next_due_date : todayYmd();
  const next = addDaysToYmd(base, cadence);
  return updateMedicalSupplyKit(userId, kitId, {
    cadence_days: cadence,
    next_due_date: next,
  });
}

export function medicalSupplyInsertPayload(
  form: MedicalSupplyFormState,
  userId: string,
  kitId: number,
  sortOrder: number,
) {
  return {
    user_id: userId,
    kit_id: kitId,
    name: sanitizeSupplyName(form.name),
    quantity: sanitizeSupplyQuantity(form.quantity),
    sort_order: sortOrder,
    notes: sanitizeNotesMobile(form.notes) || null,
  };
}

export function medicalSupplyUpdatePayload(form: MedicalSupplyFormState) {
  return {
    name: sanitizeSupplyName(form.name),
    quantity: sanitizeSupplyQuantity(form.quantity),
    notes: sanitizeNotesMobile(form.notes) || null,
    updated_at: new Date().toISOString(),
  };
}

export async function insertMedicalSupply(
  userId: string,
  kitId: number,
  form: MedicalSupplyFormState,
): Promise<MedicalSupplyRow> {
  const existing = await fetchMedicalSuppliesForKit(userId, kitId);
  const sortOrder = existing.length === 0 ? 0 : Math.max(...existing.map((r) => r.sort_order ?? 0)) + 1;
  const { data, error } = await supabase
    .from(TABLES.MEDICAL_SUPPLIES)
    .insert([medicalSupplyInsertPayload(form, userId, kitId, sortOrder)])
    .select(SUPPLY_SELECT)
    .single();
  if (error) throw error;
  return data as MedicalSupplyRow;
}

export async function updateMedicalSupply(
  userId: string,
  id: number,
  form: MedicalSupplyFormState,
): Promise<MedicalSupplyRow> {
  const { data, error } = await supabase
    .from(TABLES.MEDICAL_SUPPLIES)
    .update(medicalSupplyUpdatePayload(form))
    .eq("id", id)
    .eq("user_id", userId)
    .select(SUPPLY_SELECT)
    .single();
  if (error) throw error;
  return data as MedicalSupplyRow;
}

export async function deleteMedicalSuppliesForUser(userId: string, ids: string[]): Promise<void> {
  const numericIds = ids.map((id) => Number(id)).filter((n) => Number.isFinite(n));
  if (numericIds.length === 0) return;
  const { error } = await supabase
    .from(TABLES.MEDICAL_SUPPLIES)
    .delete()
    .eq("user_id", userId)
    .in("id", numericIds);
  if (error) throw error;
  clearMedicalSupplyKitListCache(userId);
}

export function defaultKitFormValues(kit: MedicalSupplyKitRow | null): {
  name: string;
  cadenceDays: number;
  nextDueDate: string;
} {
  return {
    name: kit?.name || "",
    cadenceDays: normalizeCadenceDays(kit?.cadence_days ?? 7),
    nextDueDate: kit?.next_due_date || todayYmd(),
  };
}
