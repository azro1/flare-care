import { isBowelSectionRoute, resetBowelListExpansion } from "./bowelMovementShared";
import { isMedsSectionRoute, resetMedsListExpansion } from "./medicationShared";
import { TABLES } from "./supabase";
import {
  isMedicationTrackingHistorySectionRoute,
  isSymptomHistorySectionRoute,
  resetWizardLogHistoryExpansion,
} from "./wizardLogHistory";

let lastNavigationRoute: string | undefined;

/**
 * Root navigator `onStateChange` — collapse load-more when leaving a feature section.
 * Blur on pop reads the wrong route; track prev → next route names instead.
 */
export function handleListExpansionNavigationRouteChange(userId: string, nextRoute: string | undefined) {
  if (!nextRoute || nextRoute === lastNavigationRoute) return;
  const prev = lastNavigationRoute;
  lastNavigationRoute = nextRoute;
  if (prev == null) return;

  if (isBowelSectionRoute(prev) && !isBowelSectionRoute(nextRoute)) {
    resetBowelListExpansion(userId);
  }
  if (isMedsSectionRoute(prev) && !isMedsSectionRoute(nextRoute)) {
    resetMedsListExpansion(userId);
  }
  if (isSymptomHistorySectionRoute(prev) && !isSymptomHistorySectionRoute(nextRoute)) {
    resetWizardLogHistoryExpansion(userId, TABLES.LOG_SYMPTOMS);
  }
  if (isMedicationTrackingHistorySectionRoute(prev) && !isMedicationTrackingHistorySectionRoute(nextRoute)) {
    resetWizardLogHistoryExpansion(userId, TABLES.LOG_MEDICATIONS);
  }
}
