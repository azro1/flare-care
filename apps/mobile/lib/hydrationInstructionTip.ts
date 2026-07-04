import AsyncStorage from "@react-native-async-storage/async-storage";

const ELIGIBLE_PREFIX = "flarecare.hydrationInstruction.eligible";
const DISMISSED_PREFIX = "flarecare.hydrationInstruction.dismissed";

function eligibleKey(userId: string) {
  return `${ELIGIBLE_PREFIX}.${userId}`;
}

function dismissedKey(userId: string) {
  return `${DISMISSED_PREFIX}.${userId}`;
}

export async function markHydrationInstructionEligible(userId: string): Promise<void> {
  try {
    await AsyncStorage.setItem(eligibleKey(userId), "1");
  } catch {
    // ignore write errors
  }
}

export async function readHydrationInstructionEligible(userId: string): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(eligibleKey(userId))) === "1";
  } catch {
    return false;
  }
}

export async function readHydrationInstructionDismissed(userId: string): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(dismissedKey(userId))) === "1";
  } catch {
    return false;
  }
}

export async function markHydrationInstructionDismissed(userId: string): Promise<void> {
  try {
    await AsyncStorage.setItem(dismissedKey(userId), "1");
    await AsyncStorage.removeItem(eligibleKey(userId));
  } catch {
    // ignore write errors
  }
}
