import AsyncStorage from "@react-native-async-storage/async-storage";

const ELIGIBLE_PREFIX = "flarecare.newUserIntro.eligible";
const DISMISSED_PREFIX = "flarecare.newUserIntro.dismissed";

function eligibleKey(userId: string) {
  return `${ELIGIBLE_PREFIX}.${userId}`;
}
function dismissedKey(userId: string) {
  return `${DISMISSED_PREFIX}.${userId}`;
}

export async function markNewUserIntroEligible(userId: string): Promise<void> {
  await AsyncStorage.setItem(eligibleKey(userId), "1");
}

export async function readNewUserIntroEligible(userId: string): Promise<boolean> {
  return (await AsyncStorage.getItem(eligibleKey(userId))) === "1";
}

export async function readNewUserIntroDismissed(userId: string): Promise<boolean> {
  return (await AsyncStorage.getItem(dismissedKey(userId))) === "1";
}

export async function markNewUserIntroDismissed(userId: string): Promise<void> {
  await AsyncStorage.setItem(dismissedKey(userId), "1");
}

/** True when this new account should see the post-login intro before the dashboard. */
export async function shouldShowNewUserIntro(userId: string): Promise<boolean> {
  const [eligible, dismissed] = await Promise.all([
    readNewUserIntroEligible(userId),
    readNewUserIntroDismissed(userId),
  ]);
  return eligible && !dismissed;
}
