import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { authenticate } from "../lib/biometricLock";
import { FULL_WIDTH_CTA_EDGE_PADDING } from "../lib/layoutConstants";
import { useFlareColors } from "../theme";

/**
 * Full-screen lock cover shown over the (already mounted) app when biometric app-lock is on.
 *
 * Auto-prompt rules (Android-sensitive):
 * - Prompt only while AppState is `active` (background authenticate fails silently).
 * - Prompt only once per mount (parent `appShellReady` re-renders must not re-fire).
 */
export function BiometricLockScreen({
  label,
  onUnlock,
  onSignOut,
}: {
  label: string;
  onUnlock: () => void;
  onSignOut: () => void;
}) {
  const c = useFlareColors();
  const insets = useSafeAreaInsets();
  const [busy, setBusy] = useState(false);
  const onUnlockRef = useRef(onUnlock);
  const promptedRef = useRef(false);
  onUnlockRef.current = onUnlock;

  const attempt = useCallback(async () => {
    setBusy(true);
    const ok = await authenticate("Unlock with fingerprint");
    setBusy(false);
    if (ok) onUnlockRef.current();
  }, []);

  useEffect(() => {
    let cancelled = false;

    const promptWhenActive = () => {
      if (cancelled || promptedRef.current) return;
      if (AppState.currentState !== "active") return;
      promptedRef.current = true;
      void attempt();
    };

    promptWhenActive();
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") promptWhenActive();
    });

    return () => {
      cancelled = true;
      sub.remove();
    };
  }, [attempt]);

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: c.screen,
          paddingTop: insets.top,
          paddingBottom: Math.max(insets.bottom, 16),
        },
      ]}
    >
      <View style={styles.center}>
        <View style={[styles.lockDisc, { backgroundColor: c.surfaceSubtle }]}>
          <Ionicons name="lock-closed" size={34} color={c.primary} accessibilityIgnoresInvertColors />
        </View>
        <Text style={[styles.title, { color: c.text }]}>FlareCare is locked</Text>
        <Text style={[styles.subtitle, { color: c.textMuted }]}>Unlock to access your account.</Text>
      </View>
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Unlock with ${label}`}
          onPress={attempt}
          disabled={busy}
          style={styles.unlock}
        >
          <View
            style={[
              styles.fingerprintDisc,
              { backgroundColor: c.surfaceSubtle, opacity: busy ? 0.6 : 1 },
            ]}
          >
            <Ionicons
              name="finger-print"
              size={34}
              color={c.primary}
              accessibilityIgnoresInvertColors
            />
          </View>
          <Text style={[styles.unlockLabel, { color: c.textMuted }]}>
            {busy ? "Unlocking…" : `Tap to unlock with ${label}`}
          </Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Sign out" onPress={onSignOut} hitSlop={8} style={styles.signOut}>
          <Text style={[styles.signOutText, { color: c.textMuted }]}>Sign out</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    paddingHorizontal: FULL_WIDTH_CTA_EDGE_PADDING,
    justifyContent: "center",
    zIndex: 50,
    elevation: 50,
  },
  center: { alignItems: "center", gap: 12, flex: 1, justifyContent: "center" },
  lockDisc: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 20, fontFamily: "Inter_700Bold", marginTop: 4 },
  subtitle: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  actions: { width: "100%", alignItems: "center", paddingBottom: 8 },
  unlock: { alignItems: "center", gap: 12 },
  fingerprintDisc: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center" },
  unlockLabel: { fontSize: 14, fontFamily: "Inter_500Medium", textAlign: "center" },
  signOut: { alignSelf: "center", marginTop: 14, paddingVertical: 6 },
  signOutText: { fontSize: 14, fontFamily: "Inter_500Medium" },
});
