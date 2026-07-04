import { markMedicationHistoryInstructionEligible } from "./medicationHistoryInstructionTip";
import { markAppointmentsInstructionEligible } from "./appointmentsInstructionTip";
import { markBowelInstructionEligible } from "./bowelInstructionTip";
import { markDashboardWelcomeEligible } from "./dashboardWelcome";
import { markHydrationInstructionEligible } from "./hydrationInstructionTip";
import { markMyMedsInstructionEligible } from "./myMedsInstructionTip";
import { markReportsInstructionEligible } from "./reportsInstructionTip";
import { markSymptomHistoryInstructionEligible } from "./symptomHistoryInstructionTip";
import { markSymptomLogInstructionEligible } from "./symptomLogInstructionTip";
import { markTrackMedicationsInstructionEligible } from "./trackMedicationsInstructionTip";
import { markWeightInstructionEligible } from "./weightInstructionTip";

export async function markNewAccountInstructionTipsEligible(userId: string): Promise<void> {
  await Promise.all([
    markDashboardWelcomeEligible(userId),
    markReportsInstructionEligible(userId),
    markSymptomLogInstructionEligible(userId),
    markSymptomHistoryInstructionEligible(userId),
    markMyMedsInstructionEligible(userId),
    markTrackMedicationsInstructionEligible(userId),
    markMedicationHistoryInstructionEligible(userId),
    markHydrationInstructionEligible(userId),
    markBowelInstructionEligible(userId),
    markWeightInstructionEligible(userId),
    markAppointmentsInstructionEligible(userId),
  ]);
}
