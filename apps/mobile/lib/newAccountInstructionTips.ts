/**
 * New-account first-run flags. While we trial the post-login intro screen, we pause marking
 * every per-screen welcome card eligible — teach once at the start, then let the app breathe.
 * Restore the Promise.all tip marks below if we roll the intro back.
 */
import { markNewUserIntroEligible } from "./newUserIntro";

export async function markNewAccountInstructionTipsEligible(userId: string): Promise<void> {
  await markNewUserIntroEligible(userId);
}
