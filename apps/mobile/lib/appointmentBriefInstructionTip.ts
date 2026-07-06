import AsyncStorage from "@react-native-async-storage/async-storage";

const ELIGIBLE_PREFIX = "flarecare.appointmentBriefInstruction.eligible";
const DISMISSED_PREFIX = "flarecare.appointmentBriefInstruction.dismissed";

function eligibleKey(userId: string) {
  return `${ELIGIBLE_PREFIX}.${userId}`;
}

function dismissedKey(userId: string) {
  return `${DISMISSED_PREFIX}.${userId}`;
}

export async function markAppointmentBriefInstructionEligible(userId: string): Promise<void> {
  try {
    await AsyncStorage.setItem(eligibleKey(userId), "1");
  } catch {
    // ignore write errors
  }
}

export async function readAppointmentBriefInstructionEligible(userId: string): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(eligibleKey(userId))) === "1";
  } catch {
    return false;
  }
}

export async function readAppointmentBriefInstructionDismissed(userId: string): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(dismissedKey(userId))) === "1";
  } catch {
    return false;
  }
}

export async function markAppointmentBriefInstructionDismissed(userId: string): Promise<void> {
  try {
    await AsyncStorage.setItem(dismissedKey(userId), "1");
    await AsyncStorage.removeItem(eligibleKey(userId));
  } catch {
    // ignore write errors
  }
}
