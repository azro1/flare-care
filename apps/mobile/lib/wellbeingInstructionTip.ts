import AsyncStorage from "@react-native-async-storage/async-storage";

const ELIGIBLE_PREFIX = "flarecare.wellbeingInstruction.eligible";
const DISMISSED_PREFIX = "flarecare.wellbeingInstruction.dismissed";

function eligibleKey(userId: string) {
  return `${ELIGIBLE_PREFIX}.${userId}`;
}

function dismissedKey(userId: string) {
  return `${DISMISSED_PREFIX}.${userId}`;
}

export async function markWellbeingInstructionEligible(userId: string): Promise<void> {
  try {
    await AsyncStorage.setItem(eligibleKey(userId), "1");
  } catch {
    // ignore
  }
}

export async function readWellbeingInstructionEligible(userId: string): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(eligibleKey(userId))) === "1";
  } catch {
    return false;
  }
}

export async function readWellbeingInstructionDismissed(userId: string): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(dismissedKey(userId))) === "1";
  } catch {
    return false;
  }
}

export async function markWellbeingInstructionDismissed(userId: string): Promise<void> {
  try {
    await AsyncStorage.setItem(dismissedKey(userId), "1");
    await AsyncStorage.removeItem(eligibleKey(userId));
  } catch {
    // ignore
  }
}
