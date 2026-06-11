import { usePaginatedLogList } from "./paginatedLogList";
import {
  LOG_HISTORY_RECENT_PREVIEW_COUNT,
  LOG_HISTORY_WIZARD_LOAD_MORE_BATCH,
} from "../components/LogHistoryList";

export type WizardLogHistoryRow = { id: string; created_at: string };

/** Symptom + Track Medications **History** screens — 3 visible initially, +3 per load-more. */
export function useWizardLogHistory(userId: string, table: string) {
  return usePaginatedLogList<WizardLogHistoryRow>({
    userId,
    table,
    initialVisible: LOG_HISTORY_RECENT_PREVIEW_COUNT,
    loadMoreBatch: LOG_HISTORY_WIZARD_LOAD_MORE_BATCH,
  });
}
