import React from "react";
import {
  Modal,
  Platform,
  PlatformColor,
  Pressable,
  StyleSheet,
  Text,
  type ColorValue,
  View,
} from "react-native";

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
    optionsPanel: "#F2F2F7",
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
  const colors = ALERT_DIALOG_COLORS;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel} statusBarTranslucent>
      <View style={styles.root}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
          onPress={onCancel}
          style={[StyleSheet.absoluteFillObject, { backgroundColor: colors.backdrop }]}
        />
        <View style={[styles.shell, { backgroundColor: colors.optionsPanel }]}>
          <View style={[styles.optionsBlock, { backgroundColor: colors.optionsPanel }]}>
            {options.map((opt, index) => (
              <View key={opt}>
                {index > 0 ? <View style={[styles.separator, { backgroundColor: colors.separator }]} /> : null}
                <Pressable
                  accessibilityRole="button"
                  onPress={() => onSelect(opt)}
                  style={styles.actionRow}
                >
                  <Text style={[styles.actionLabel, { color: colors.action }]}>{opt}</Text>
                </Pressable>
              </View>
            ))}
          </View>
          <View style={{ height: CANCEL_SECTION_SPACING, backgroundColor: colors.optionsPanel }} />
          <View style={[styles.cancelBlock, { backgroundColor: colors.cancelPanel }]}>
            <Pressable accessibilityRole="button" onPress={onCancel} style={styles.actionRow}>
              <Text style={[styles.cancelLabel, { color: colors.action }]}>{cancelLabel}</Text>
            </Pressable>
          </View>
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
});
