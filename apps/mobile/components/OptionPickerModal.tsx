import React from "react";
import {
  Modal,
  Platform,
  PlatformColor,
  Pressable,
  StyleSheet,
  Text,
  type ColorValue,
  useColorScheme,
  View,
} from "react-native";
import { MOBILE_BRAND_PRIMARY } from "../theme";

const LIGHT_OPTIONS_PANEL = "#F2F2F7";
const BRAND_CANCEL_BG = MOBILE_BRAND_PRIMARY;
const BRAND_CANCEL_TEXT = "#FFFFFF";

type AlertDialogColors = {
  optionsPanel: ColorValue;
  cancelPanel: ColorValue;
  action: ColorValue;
  separator: ColorValue;
  backdrop: string;
};

const ALERT_DIALOG_COLORS: AlertDialogColors = Platform.select({
  ios: {
    optionsPanel: PlatformColor("secondarySystemGroupedBackground"),
    cancelPanel: PlatformColor("tertiarySystemGroupedBackground"),
    action: PlatformColor("link", "systemBlue"),
    separator: PlatformColor("separator"),
    backdrop: "rgba(0, 0, 0, 0.4)",
  },
  android: {
    optionsPanel: PlatformColor("?android:attr/colorBackgroundFloating"),
    cancelPanel: PlatformColor("?android:attr/colorBackground"),
    action: PlatformColor("?android:attr/colorAccent"),
    separator: PlatformColor("?android:attr/listDivider"),
    backdrop: "rgba(0, 0, 0, 0.5)",
  },
  default: {
    optionsPanel: LIGHT_OPTIONS_PANEL,
    cancelPanel: "#FFFFFF",
    action: "#007AFF",
    separator: "rgba(0, 0, 0, 0.12)",
    backdrop: "rgba(0, 0, 0, 0.5)",
  },
}) as AlertDialogColors;

const CANCEL_SECTION_SPACING = 8;

export function OptionPickerModal({
  visible,
  options,
  onSelect,
  onCancel,
  cancelLabel = "Cancel",
}: {
  visible: boolean;
  options: readonly string[];
  onSelect: (value: string) => void;
  onCancel: () => void;
  cancelLabel?: string;
}) {
  const systemScheme = useColorScheme();
  /** Phone/OS light mode — teal cancel to match date picker; dark uses native 2-tone panels. */
  const lightBrandChrome = systemScheme !== "dark";
  const system = ALERT_DIALOG_COLORS;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel} statusBarTranslucent>
      <View style={styles.root}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
          onPress={onCancel}
          style={[
            StyleSheet.absoluteFillObject,
            { backgroundColor: lightBrandChrome ? "rgba(0, 0, 0, 0.4)" : system.backdrop },
          ]}
        />
        <View style={[styles.shell, lightBrandChrome ? null : { backgroundColor: system.optionsPanel }]}>
          <View
            style={[
              styles.optionsBlock,
              {
                backgroundColor: lightBrandChrome ? LIGHT_OPTIONS_PANEL : system.optionsPanel,
              },
            ]}
          >
            {options.map((opt, index) => (
              <View key={opt}>
                {index > 0 && !lightBrandChrome ? (
                  <View style={[styles.separator, { backgroundColor: system.separator }]} />
                ) : null}
                <Pressable
                  accessibilityRole="button"
                  onPress={() => onSelect(opt)}
                  style={styles.actionRow}
                >
                  <Text
                    style={[
                      styles.actionLabel,
                      { color: lightBrandChrome ? BRAND_CANCEL_BG : system.action },
                    ]}
                  >
                    {opt}
                  </Text>
                </Pressable>
              </View>
            ))}
          </View>
          {!lightBrandChrome ? (
            <View
              style={{
                height: CANCEL_SECTION_SPACING,
                backgroundColor: system.optionsPanel,
              }}
            />
          ) : null}
          {lightBrandChrome ? (
            <View
              collapsable={false}
              needsOffscreenAlphaCompositing={Platform.OS === "ios"}
              style={{ width: "100%", backgroundColor: BRAND_CANCEL_BG }}
            >
              <Pressable
                accessibilityRole="button"
                onPress={onCancel}
                style={styles.actionRow}
                android_ripple={null}
              >
                <Text style={styles.lightBrandCancelLabel}>{cancelLabel}</Text>
              </Pressable>
            </View>
          ) : (
            <View style={[styles.cancelBlock, { backgroundColor: system.cancelPanel }]}>
              <Pressable accessibilityRole="button" onPress={onCancel} style={styles.actionRow}>
                <Text style={[styles.cancelLabel, { color: BRAND_CANCEL_TEXT }]}>{cancelLabel}</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const ALERT_PANEL_WIDTH = 270;

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 40 },
  shell: {
    width: ALERT_PANEL_WIDTH,
    alignSelf: "center",
    overflow: "hidden",
  },
  optionsBlock: { width: "100%" },
  cancelBlock: { width: "100%" },
  separator: { height: StyleSheet.hairlineWidth },
  actionRow: {
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  actionLabel: {
    fontSize: 17,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  cancelLabel: {
    fontSize: 17,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  lightBrandCancelLabel: {
    fontSize: 17,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    color: BRAND_CANCEL_TEXT,
  },
});
