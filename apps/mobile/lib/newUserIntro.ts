import AsyncStorage from "@react-native-async-storage/async-storage";

const ELIGIBLE_PREFIX = "flarecare.newUserIntro.eligible";
const DISMISSED_PREFIX = "flarecare.newUserIntro.dismissed";

/** Account must have been created within this window at sign-in to count as new. */
export const NEW_ACCOUNT_WELCOME_MAX_AGE_MS = 15 * 60 * 1000;

export function isNewAuthUser(user: { created_at?: string | null }, now = Date.now()) {
  if (!user.created_at) return false;
  const created = new Date(user.created_at).getTime();
  if (Number.isNaN(created)) return false;
  return now - created < NEW_ACCOUNT_WELCOME_MAX_AGE_MS;
}

function eligibleKey(userId: string) {
  return `${ELIGIBLE_PREFIX}.${userId}`;
}
function dismissedKey(userId: string) {
  return `${DISMISSED_PREFIX}.${userId}`;
}

export async function markNewUserIntroEligible(userId: string): Promise<void> {
  try {
    await AsyncStorage.setItem(eligibleKey(userId), "1");
  } catch {
    // non-fatal
  }
}

export async function readNewUserIntroEligible(userId: string): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(eligibleKey(userId))) === "1";
  } catch {
    return false;
  }
}

export async function readNewUserIntroDismissed(userId: string): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(dismissedKey(userId))) === "1";
  } catch {
    return false;
  }
}

export async function markNewUserIntroDismissed(userId: string): Promise<void> {
  try {
    await AsyncStorage.setItem(dismissedKey(userId), "1");
  } catch {
    // non-fatal
  }
}

/** Clear intro flags on account delete so the next account on this device starts clean. */
export async function clearNewUserIntroState(userId: string): Promise<void> {
  try {
    await AsyncStorage.multiRemove([eligibleKey(userId), dismissedKey(userId)]);
  } catch {
    // non-fatal
  }
}

/**
 * Post-login intro for brand-new accounts only.
 * - Must not have dismissed it.
 * - Must still be within the new-account window (`isNewAuthUser`).
 * Returning users (logout → sign-in) never qualify once the account is older than that window,
 * even if a stale "eligible" flag was left behind by an earlier race.
 */
export async function resolveNewUserIntroPending(
  userId: string,
  accountCreatedAt?: string | null,
): Promise<boolean> {
  if (await readNewUserIntroDismissed(userId)) return false;
  if (!isNewAuthUser({ created_at: accountCreatedAt })) return false;
  await markNewUserIntroEligible(userId);
  return true;
}

/** @deprecated Prefer `resolveNewUserIntroPending` — eligible-only checks resurface for returning users. */
export async function shouldShowNewUserIntro(userId: string): Promise<boolean> {
  const [eligible, dismissed] = await Promise.all([
    readNewUserIntroEligible(userId),
    readNewUserIntroDismissed(userId),
  ]);
  return eligible && !dismissed;
}
