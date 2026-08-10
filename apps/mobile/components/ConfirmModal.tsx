import React, { useEffect } from "react";
import { BackHandler, Pressable, StyleSheet, Text, View } from "react-native";
import { PrimaryButton, SecondaryButton } from "./FlareButton";
import {
  CONFIRM_MODAL_ACTIONS_GAP,
  CONFIRM_MODAL_MESSAGE,
  CONFIRM_MODAL_STACK_GAP,
  CONFIRM_MODAL_TITLE,
} from "../lib/layoutConstants";
import { Portal } from "../lib/overlayPortal";
import { useFlareColors } from "../theme";

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    paddingHorizontal: 20,
    // Sit above everything in the same layer (no native Modal → no window slide).
    zIndex: 9999,
    elevation: 9999,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 20,
  },
  title: { ...CONFIRM_MODAL_TITLE },
  message: {
    ...CONFIRM_MODAL_MESSAGE,
    marginTop: CONFIRM_MODAL_STACK_GAP,
  },
  actions: { flexDirection: "row", gap: 12, marginTop: CONFIRM_MODAL_ACTIONS_GAP },
  actionSlot: { flex: 1, minWidth: 0 },
});

/**
 * App-themed confirm / notice sheet — use instead of `Alert.alert` (follows in-app light/dark).
 *
 * Renders as an in-app absolute overlay, NOT a native `Modal`. React Native's Android `Modal`
 * animates its dialog window on show regardless of `animationType="none"` (and toggling `visible`
 * on a mounted Modal re-triggers it), which read as a slide-down. An in-app overlay simply
 * appears/disappears. It must be mounted in the top-most layer to cover the app — the root alert
 * host (`FlareAlertHost`) is rendered last under the app root; inline usages cover their screen.
 */
export function ConfirmModal({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel = "Cancel",
  confirmDestructive,
  /** True red fill (`MOBILE_DESTRUCTIVE_FILL`) — account delete only; other confirms stay cadet. */
  confirmDanger,
  /** Single primary button (OK / dismiss) — same card as confirm flows. */
  notice = false,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel?: string;
  confirmDestructive?: boolean;
  confirmDanger?: boolean;
  notice?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const c = useFlareColors();

  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      onCancel();
      return true;
    });
    return () => sub.remove();
  }, [visible, onCancel]);

  const confirmVariant = confirmDanger ? "danger" : confirmDestructive ? "destructive" : "default";

  // Keep Portal mounted while host is mounted — sync `null` into the outlet on dismiss so the
  // absoluteFill Pressable cannot linger and block the verification TextInput (unmount races /
  // Fast Refresh left ghost overlays in the registry).
  return (
    <Portal>
      {visible ? (
        <View style={styles.overlay}>
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
              {!notice ? (
                <View style={styles.actionSlot}>
                  <SecondaryButton noTopMargin title={cancelLabel} onPress={onCancel} />
                </View>
              ) : null}
              <View style={styles.actionSlot}>
                <PrimaryButton
                  noTopMargin
                  title={confirmLabel}
                  onPress={onConfirm}
                  variant={confirmVariant}
                />
              </View>
            </View>
          </View>
        </View>
      ) : null}
    </Portal>
  );
}
