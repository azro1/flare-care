import { Linking } from "react-native";

/** Best-effort: opens this app's page in system Settings (exact screen varies by phone). */
export async function openAppNotificationSettings(): Promise<void> {
  await Linking.openSettings();
}
