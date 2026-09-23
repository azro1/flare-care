/**
 * Going Out — user-authored prep profile + outing checklist.
 * Short suggestion list to start; users add their own items. Not medical advice.
 * Stored in Supabase (`going_out_profiles`) so the list follows the account.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { FLARE_FEATURE_LUCIDE } from "./flareLucideIcons";
import { supabase, TABLES } from "./supabase";

/** Out & About / Going Out / Edit checklist — open door (leaving the house). */
export const OUT_ABOUT_ICON = FLARE_FEATURE_LUCIDE.outAbout;
/** Short starting suggestions shown on the profile form. */
export const GOING_OUT_SUGGESTIONS = [
  { id: "toilet", label: "Toilet access" },
  { id: "medication", label: "Medication" },
  { id: "spare-clothes", label: "Spare clothes" },
  { id: "wipes", label: "Wipes / tissues" },
  { id: "food-drink", label: "Food / drink" },
  { id: "hand-sanitiser", label: "Hand sanitiser" },
] as const;

export type GoingOutSuggestionId = (typeof GOING_OUT_SUGGESTIONS)[number]["id"];

const SUGGESTION_ID_SET = new Set<string>(GOING_OUT_SUGGESTIONS.map((i) => i.id));

/** Labels for older saved preset ids (no longer shown as suggestions). */
const LEGACY_PRESET_LABELS: Record<string, string> = {
  supplies: "Stoma bags",
  "disposal-bags": "Disposal bags",
  "spare-underwear": "Spare underwear",
  "barrier-cream": "Barrier cream",
  "small-mirror": "Small mirror",
  "emergency-contact": "Emergency contact",
};

export function isGoingOutSuggestionId(id: string): id is GoingOutSuggestionId {
  return SUGGESTION_ID_SET.has(id);
}

export function isGoingOutCustomId(id: string): boolean {
  return id.startsWith("custom_");
}

/** First-time draft — all short suggestions on. */
export const GOING_OUT_DEFAULT_SELECTED_IDS: readonly GoingOutSuggestionId[] =
  GOING_OUT_SUGGESTIONS.map((i) => i.id);

export type GoingOutCustomItem = {
  id: string;
  label: string;
};

/** Keep custom item names short — checklist rows, not essays. */
export const GOING_OUT_CUSTOM_LABEL_MAX = 80;

export function clampGoingOutCustomLabel(raw: string): string {
  return raw.replace(/\s+/g, " ").trim().slice(0, GOING_OUT_CUSTOM_LABEL_MAX);
}

export type GoingOutProfile = {
  /** Checklist membership — suggestion ids and/or custom ids. */
  selectedIds: string[];
  customItems: GoingOutCustomItem[];
};

type GoingOutProfileRow = {
  user_id: string;
  selected_ids: unknown;
  custom_items: unknown;
};

/** Legacy device key — migrated once into Supabase then cleared. */
const legacyStorageKey = (userId: string) => `flarecare.goingOut.profile.${userId}`;

export function emptyGoingOutProfile(): GoingOutProfile {
  return { selectedIds: [], customItems: [] };
}

export function defaultGoingOutProfile(): GoingOutProfile {
  return {
    selectedIds: [...GOING_OUT_DEFAULT_SELECTED_IDS],
    customItems: [],
  };
}

export function newGoingOutCustomId(): string {
  return `custom_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function labelForGoingOutItem(profile: GoingOutProfile, id: string): string {
  const suggestion = GOING_OUT_SUGGESTIONS.find((i) => i.id === id);
  if (suggestion) return suggestion.label;
  const custom = profile.customItems.find((i) => i.id === id);
  if (custom?.label.trim()) return custom.label.trim();
  return LEGACY_PRESET_LABELS[id] ?? id;
}

function normalizeProfile(parsed: Partial<GoingOutProfile> & { emergencyContactNote?: string }): GoingOutProfile {
  const customItems: GoingOutCustomItem[] = [];
  const seenCustom = new Set<string>();

  for (const raw of parsed.customItems ?? []) {
    if (!raw || typeof raw !== "object") continue;
    const id = typeof raw.id === "string" ? raw.id.trim() : "";
    const label = typeof raw.label === "string" ? clampGoingOutCustomLabel(raw.label) : "";
    if (!id || !isGoingOutCustomId(id) || !label || seenCustom.has(id)) continue;
    seenCustom.add(id);
    customItems.push({ id, label });
  }

  const selectedRaw = Array.isArray(parsed.selectedIds) ? parsed.selectedIds : [];
  const selectedIds: string[] = [];

  for (const id of selectedRaw) {
    if (typeof id !== "string" || !id) continue;
    if (isGoingOutSuggestionId(id)) {
      if (!selectedIds.includes(id)) selectedIds.push(id);
      continue;
    }
    if (isGoingOutCustomId(id) && customItems.some((c) => c.id === id)) {
      if (!selectedIds.includes(id)) selectedIds.push(id);
      continue;
    }
    // Legacy preset → custom item so old saves keep working.
    const legacyLabel = LEGACY_PRESET_LABELS[id];
    if (legacyLabel) {
      const customId = `custom_legacy_${id}`;
      if (!seenCustom.has(customId)) {
        seenCustom.add(customId);
        customItems.push({ id: customId, label: legacyLabel });
      }
      if (!selectedIds.includes(customId)) selectedIds.push(customId);
    }
  }

  // Drop custom items that are never selected? Keep them — user may re-tick later.
  return { selectedIds, customItems };
}

function profileFromRow(row: GoingOutProfileRow): GoingOutProfile {
  return normalizeProfile({
    selectedIds: Array.isArray(row.selected_ids) ? (row.selected_ids as string[]) : [],
    customItems: Array.isArray(row.custom_items) ? (row.custom_items as GoingOutCustomItem[]) : [],
  });
}

async function readLegacyLocalProfile(userId: string): Promise<GoingOutProfile | null> {
  try {
    const raw = await AsyncStorage.getItem(legacyStorageKey(userId));
    if (!raw) return null;
    return normalizeProfile(JSON.parse(raw) as Partial<GoingOutProfile>);
  } catch {
    return null;
  }
}

async function clearLegacyLocalProfile(userId: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(legacyStorageKey(userId));
  } catch {
    // non-fatal
  }
}

export async function loadGoingOutProfile(userId: string): Promise<GoingOutProfile> {
  const { data, error } = await supabase
    .from(TABLES.GOING_OUT_PROFILES)
    .select("user_id, selected_ids, custom_items")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;

  if (data) {
    await clearLegacyLocalProfile(userId);
    return profileFromRow(data as GoingOutProfileRow);
  }

  // One-time lift from the old device-only store into the account table.
  const legacy = await readLegacyLocalProfile(userId);
  if (legacy && goingOutProfileIsSet(legacy)) {
    await saveGoingOutProfile(userId, legacy);
    await clearLegacyLocalProfile(userId);
    return legacy;
  }

  await clearLegacyLocalProfile(userId);
  return emptyGoingOutProfile();
}

export async function saveGoingOutProfile(userId: string, profile: GoingOutProfile): Promise<void> {
  const next = normalizeProfile(profile);
  const { error } = await supabase.from(TABLES.GOING_OUT_PROFILES).upsert(
    {
      user_id: userId,
      selected_ids: next.selectedIds,
      custom_items: next.customItems,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) throw error;
  await clearLegacyLocalProfile(userId);
}

export function goingOutProfileIsSet(profile: GoingOutProfile): boolean {
  return profile.selectedIds.length > 0;
}
