import { isBowelSectionRoute, resetBowelListExpansion } from "./bowelMovementShared";
import { isMedsSectionRoute, resetMedsListExpansion } from "./medicationShared";
import { isAppointmentsSectionRoute, resetApptsListExpansion } from "./appointmentShared";
import { isOutputSectionRoute, resetOutputListExpansion } from "./outputShared";
import { isIntakeSectionRoute, resetIntakeListExpansion } from "./intakeShared";
import { isWeightSectionRoute, resetWeightListExpansion } from "./weightShared";
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
  if (isWeightSectionRoute(prev) && !isWeightSectionRoute(nextRoute)) {
    resetWeightListExpansion(userId);
  }
  if (isOutputSectionRoute(prev) && !isOutputSectionRoute(nextRoute)) {
    resetOutputListExpansion(userId);
  }
  if (isIntakeSectionRoute(prev) && !isIntakeSectionRoute(nextRoute)) {
    resetIntakeListExpansion(userId);
  }
  if (isAppointmentsSectionRoute(prev) && !isAppointmentsSectionRoute(nextRoute)) {
    resetApptsListExpansion(userId);
  }
  if (isSymptomHistorySectionRoute(prev) && !isSymptomHistorySectionRoute(nextRoute)) {
    resetWizardLogHistoryExpansion(userId, TABLES.LOG_SYMPTOMS);
  }
  if (isMedicationTrackingHistorySectionRoute(prev) && !isMedicationTrackingHistorySectionRoute(nextRoute)) {
    resetWizardLogHistoryExpansion(userId, TABLES.LOG_MEDICATIONS);
  }
}
