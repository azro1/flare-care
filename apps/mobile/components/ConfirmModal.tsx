import React from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { PrimaryButton, SecondaryButton } from "./FlareButton";
import { useFlareColors } from "../theme";

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: "center", paddingHorizontal: 20 },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 18,
  },
  title: { fontSize: 18, fontFamily: "Inter_700Bold" },
  message: { fontSize: 14, fontFamily: "Inter_400Regular", marginTop: 10, lineHeight: 20 },
  actions: { flexDirection: "row", gap: 8, marginTop: 22 },
  actionSlot: { flex: 1, minWidth: 0 },
});

/** Reusable confirm sheet — logout, destructive actions, and prompts. */
export function ConfirmModal({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel = "Cancel",
  confirmDestructive,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel?: string;
  confirmDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const c = useFlareColors();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel} statusBarTranslucent>
      <View style={styles.root}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
          onPress={onCancel}
          style={[StyleSheet.absoluteFillObject, { backgroundColor: c.modalBackdrop }]}
        />
        <View style={[styles.card, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
          <Text style={[styles.title, { color: c.text }]}>{title}</Text>
          {message ? <Text style={[styles.message, { color: c.textMuted }]}>{message}</Text> : null}
          <View style={styles.actions}>
            <View style={styles.actionSlot}>
              <SecondaryButton title={cancelLabel} onPress={onCancel} />
            </View>
            <View style={styles.actionSlot}>
              <PrimaryButton
                title={confirmLabel}
                onPress={onConfirm}
                variant={confirmDestructive ? "destructive" : "default"}
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
