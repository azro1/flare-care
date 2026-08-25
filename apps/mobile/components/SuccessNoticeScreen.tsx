import { Ionicons } from "@expo/vector-icons";
import { FLARE_CHROME_LUCIDE, FlareLucideIcon } from "../lib/flareLucideIcons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { initialWindowMetrics, SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { PrimaryButton } from "./FlareButton";
import {
  bottomTabBarHeight,
  FLARE_FONT_FAMILY,
  FLARE_FONT_SIZE,
  FLARE_LINE_HEIGHT,
  FULL_WIDTH_CTA_EDGE_PADDING,
  wizardLandingMinHeight,
  WIZARD_LANDING_BELOW_SAFE_TOP,
  WIZARD_LANDING_BLOCK_PADDING_BOTTOM,
  WIZARD_LANDING_BLOCK_PADDING_TOP,
} from "../lib/layoutConstants";
import { useFlareColors } from "../theme";

/** Stable on first frame — avoids SafeAreaView inset updates that shift centered content. */
const FULL_SCREEN_SAFE_INSETS = {
  top: initialWindowMetrics?.insets.top ?? 0,
  bottom: initialWindowMetrics?.insets.bottom ?? 0,
};

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: FULL_WIDTH_CTA_EDGE_PADDING,
  },
  /** Wizard `scrollPad` top inset below stack header (full-screen logout has no header). */
  wizardLandingScrollOffset: {
    paddingTop: WIZARD_LANDING_BELOW_SAFE_TOP,
  },
  /** Wizard `styles.landing` — minHeight applied at runtime. */
  wizardLandingBlock: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: WIZARD_LANDING_BLOCK_PADDING_TOP,
    paddingBottom: WIZARD_LANDING_BLOCK_PADDING_BOTTOM,
  },
  /** Logout / full-screen success — same edge→CTA inset as sign-in / wizard landing. */
  fullScreenLandingPad: {
    paddingHorizontal: FULL_WIDTH_CTA_EDGE_PADDING,
    paddingTop: 96,
  },
  card: { width: "100%", maxWidth: 360, alignItems: "center", gap: 16 },
  title: {
    fontSize: FLARE_FONT_SIZE.pageTitle,
    fontFamily: FLARE_FONT_FAMILY.bold,
    textAlign: "center",
    marginTop: 8,
  },
  message: {
    fontSize: FLARE_FONT_SIZE.subhead,
    fontFamily: FLARE_FONT_FAMILY.regular,
    textAlign: "center",
    lineHeight: FLARE_LINE_HEIGHT.sectionTitle,
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

  const card = (
    <View style={styles.card}>
      {fullScreen ? (
        // Logout / account-deleted only — sole allowed filled glyph in the app.
        <Ionicons name="checkmark-circle" size={72} color={c.primary} accessibilityIgnoresInvertColors />
      ) : (
        <FlareLucideIcon icon={FLARE_CHROME_LUCIDE.checkCircle} size={72} color={c.primary} />
      )}
      <Text style={[styles.title, { color: c.text }]}>{title}</Text>
      <Text style={[styles.message, { color: c.textMuted }]}>{message}</Text>
      <View style={styles.actions}>
        <PrimaryButton title={buttonTitle} onPress={onPress} />
      </View>
    </View>
  );

  if (fullScreen) {
    return (
      <View
        style={[
          styles.safeArea,
          {
            backgroundColor: c.screen,
            paddingTop: FULL_SCREEN_SAFE_INSETS.top,
            paddingBottom: FULL_SCREEN_SAFE_INSETS.bottom,
          },
        ]}
      >
        <View style={styles.wizardLandingScrollOffset}>
          <View
            style={[
              styles.wizardLandingBlock,
              styles.fullScreenLandingPad,
              { minHeight: wizardLandingMinHeight() },
            ]}
          >
            {card}
          </View>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: c.screen }]} edges={[]}>
      <View style={[styles.content, tabBarHeight ? { paddingBottom: tabBarHeight } : null]}>{card}</View>
    </SafeAreaView>
  );
}
