import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { PrimaryButton } from "./FlareButton";
import { bottomTabBarHeight, SCREEN_EDGE_PADDING } from "../lib/layoutConstants";
import { useFlareColors } from "../theme";

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: SCREEN_EDGE_PADDING,
  },
  card: { width: "100%", maxWidth: 360, alignItems: "center", gap: 16 },
  title: { fontSize: 22, fontFamily: "Inter_700Bold", textAlign: "center", marginTop: 8 },
  message: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 320,
  },
  actions: { width: "100%" },
});

/** Full-screen success state — checkmark, title, message, primary button.
 *  Use for post-action confirmations (logout, reminders enabled, etc.).
 *  See DEV_NOTES.md § Success & confirm screens — do not duplicate this layout elsewhere.
 *  Pass `offsetForBottomTabBar` whenever MainBottomTabBar is visible (Dashboard / Reminders / Account). */
export function SuccessNoticeScreen({
  title,
  message,
  buttonTitle,
  onPress,
  fullScreen = false,
  offsetForBottomTabBar = false,
}: {
  title: string;
  message: string;
  buttonTitle: string;
  onPress: () => void;
  /** Root-level screen (logout) — include top safe area. Omit for stack/tab screens. */
  fullScreen?: boolean;
  /** Subtract bottom tab bar height from the centering area so content looks centered above the nav. */
  offsetForBottomTabBar?: boolean;
}) {
  const c = useFlareColors();
  const insets = useSafeAreaInsets();
  // Overlay tab bar: stack is full height, but keep the extra inset that flex layout used to
  // provide implicitly so centered success content matches the pre-overlay position.
  const tabBarHeight = offsetForBottomTabBar ? bottomTabBarHeight(insets.bottom) * 2 : 0;

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: c.screen }]}
      edges={fullScreen ? ["top", "bottom"] : []}
    >
      <View style={[styles.content, tabBarHeight ? { paddingBottom: tabBarHeight } : null]}>
        <View style={styles.card}>
          <Ionicons name="checkmark-circle" size={72} color={c.primary} accessibilityIgnoresInvertColors />
          <Text style={[styles.title, { color: c.text }]}>{title}</Text>
          <Text style={[styles.message, { color: c.textMuted }]}>{message}</Text>
          <View style={styles.actions}>
            <PrimaryButton title={buttonTitle} onPress={onPress} />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
