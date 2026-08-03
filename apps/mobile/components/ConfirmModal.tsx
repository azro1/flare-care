import React, { useEffect, useRef, useState } from "react";
import { Animated, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { PrimaryButton, SecondaryButton } from "./FlareButton";
import {
  CONFIRM_MODAL_ACTIONS_GAP,
  CONFIRM_MODAL_STACK_GAP,
  FLARE_FONT_SIZE,
  FLARE_LINE_HEIGHT,
} from "../lib/layoutConstants";
import { useFlareColors } from "../theme";

const FADE_IN_MS = 180;
const FADE_OUT_MS = 140;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 18,
  },
  title: { fontSize: 18, fontFamily: "Inter_700Bold" },
  message: {
    fontSize: FLARE_FONT_SIZE.body,
    fontFamily: "Inter_400Regular",
    marginTop: CONFIRM_MODAL_STACK_GAP,
    lineHeight: FLARE_LINE_HEIGHT.body,
  },
  actions: { flexDirection: "row", gap: 8, marginTop: CONFIRM_MODAL_ACTIONS_GAP },
  actionSlot: { flex: 1, minWidth: 0 },
});

/** App-themed confirm / notice sheet — use instead of `Alert.alert` (follows in-app light/dark). */
export function ConfirmModal({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel = "Cancel",
  confirmDestructive,
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
  notice?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const c = useFlareColors();
  const opacity = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(visible);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      opacity.setValue(0);
      Animated.timing(opacity, {
        toValue: 1,
        duration: FADE_IN_MS,
        useNativeDriver: true,
      }).start();
      return;
    }
    if (!mounted) return;
    Animated.timing(opacity, {
      toValue: 0,
      duration: FADE_OUT_MS,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setMounted(false);
    });
  }, [visible, mounted, opacity]);

  if (!mounted) return null;

  return (
    <Modal visible transparent animationType="none" onRequestClose={onCancel} statusBarTranslucent>
      <Animated.View style={[styles.root, { opacity }]}>
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
                variant={confirmDestructive ? "destructive" : "default"}
              />
            </View>
          </View>
        </View>
      </Animated.View>
    </Modal>
  );
}
