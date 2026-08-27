import { useMemo } from "react";
import {
  LOG_HISTORY_RECENT_PREVIEW_COUNT,
  LOG_HISTORY_WIZARD_LOAD_MORE_BATCH,
} from "./logHistoryConstants";
import type { PaginatedLogListCache, PaginatedLogListCacheSnapshot } from "./paginatedLogList";
import { usePaginatedLogList } from "./paginatedLogList";

export type WizardLogHistoryRow = { id: string; created_at: string };

/** Symptom wizard **History** — list ↔ detail only. */
export const SYMPTOM_HISTORY_SECTION_ROUTE_NAMES = ["SymptomHistory", "SymptomDetail"] as const;

/** Track Medications wizard **History** — list ↔ detail only. */
export const MEDICATION_TRACKING_HISTORY_SECTION_ROUTE_NAMES = [
  "MedicationTrackingHistory",
  "MedicationLogDetail",
] as const;

export function isSymptomHistorySectionRoute(routeName: string | undefined): boolean {
  return (SYMPTOM_HISTORY_SECTION_ROUTE_NAMES as readonly string[]).includes(routeName ?? "");
}

export function isMedicationTrackingHistorySectionRoute(routeName: string | undefined): boolean {
  return (MEDICATION_TRACKING_HISTORY_SECTION_ROUTE_NAMES as readonly string[]).includes(routeName ?? "");
}

const wizardLogHistoryCacheByKey: Record<string, PaginatedLogListCacheSnapshot<WizardLogHistoryRow>> = {};

function wizardHistoryCacheKey(userId: string, table: string) {
  return `${userId}::${table}`;
}

export function getWizardLogHistoryCache(
  userId: string,
  table: string,
): PaginatedLogListCacheSnapshot<WizardLogHistoryRow> | undefined {
  return wizardLogHistoryCacheByKey[wizardHistoryCacheKey(userId, table)];
}

export function setWizardLogHistoryCache(
  userId: string,
  table: string,
  snapshot: PaginatedLogListCacheSnapshot<WizardLogHistoryRow>,
) {
  wizardLogHistoryCacheByKey[wizardHistoryCacheKey(userId, table)] = snapshot;
}

function createWizardLogHistoryCache(table: string): PaginatedLogListCache<WizardLogHistoryRow> {
  return {
    get: (userId) => getWizardLogHistoryCache(userId, table),
    set: (userId, snapshot) => {
      setWizardLogHistoryCache(userId, table, snapshot);
    },
  };
}

export function resetWizardLogHistoryExpansion(
  userId: string,
  table: string,
  initialVisible = LOG_HISTORY_RECENT_PREVIEW_COUNT,
) {
  const key = wizardHistoryCacheKey(userId, table);
  const cached = wizardLogHistoryCacheByKey[key];
  if (cached) {
    wizardLogHistoryCacheByKey[key] = { ...cached, visibleCount: initialVisible };
  }
}

/** Symptom + Track Medications **History** screens — 3 visible initially, +3 per load-more. */
export function useWizardLogHistory(userId: string, table: string) {
  const cache = useMemo(() => createWizardLogHistoryCache(table), [table]);
  return usePaginatedLogList<WizardLogHistoryRow>({
    userId,
    table,
    initialVisible: LOG_HISTORY_RECENT_PREVIEW_COUNT,
    loadMoreBatch: LOG_HISTORY_WIZARD_LOAD_MORE_BATCH,
    cache,
  });
}
