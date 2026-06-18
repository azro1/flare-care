import AsyncStorage from "@react-native-async-storage/async-storage";

const ELIGIBLE_PREFIX = "flarecare.dashboardWelcome.eligible";
const DISMISSED_PREFIX = "flarecare.dashboardWelcome.dismissed";

/** Account must have been created within this window at sign-in to count as new. */
export const NEW_ACCOUNT_WELCOME_MAX_AGE_MS = 15 * 60 * 1000;

function eligibleKey(userId: string) {
  return `${ELIGIBLE_PREFIX}.${userId}`;
}

function dismissedKey(userId: string) {
  return `${DISMISSED_PREFIX}.${userId}`;
}

export function isNewAuthUser(user: { created_at?: string | null }, now = Date.now()) {
  if (!user.created_at) return false;
  const created = new Date(user.created_at).getTime();
  if (Number.isNaN(created)) return false;
  return now - created < NEW_ACCOUNT_WELCOME_MAX_AGE_MS;
}

export async function markDashboardWelcomeEligible(userId: string): Promise<void> {
  try {
    await AsyncStorage.setItem(eligibleKey(userId), "1");
  } catch {
    // ignore write errors
  }
}

export async function readDashboardWelcomeEligible(userId: string): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(eligibleKey(userId))) === "1";
  } catch {
    return false;
  }
}

export async function readDashboardWelcomeDismissed(userId: string): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(dismissedKey(userId))) === "1";
  } catch {
    return false;
  }
}

export async function markDashboardWelcomeDismissed(userId: string): Promise<void> {
  try {
    await AsyncStorage.setItem(dismissedKey(userId), "1");
    await AsyncStorage.removeItem(eligibleKey(userId));
  } catch {
    // ignore write errors
  }
}
