import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Device-local record that Terms + Privacy were accepted on a completed sign-in.
 * Checkbox stays visible for the whole first auth flow; only after they finish signing in
 * do later visits (including after logout) skip it.
 */
const KEY = "flarecare.authLegalAccepted.v2";

export async function readAuthLegalAccepted(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(KEY)) === "1";
  } catch {
    return false;
  }
}

export async function setAuthLegalAccepted(accepted: boolean): Promise<void> {
  try {
    if (accepted) {
      await AsyncStorage.setItem(KEY, "1");
    } else {
      await AsyncStorage.removeItem(KEY);
    }
  } catch {
    // non-fatal: worst case they see the checkbox again next launch
  }
}
