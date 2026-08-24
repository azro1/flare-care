import { FLARE_CHROME_LUCIDE, FlareLucideIcon } from "../lib/flareLucideIcons";
import React, { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { logHistoryCardStyles } from "./LogHistoryList";
import { dismissHubTip, getCachedHubTipDismissed, isHubTipDismissed } from "../lib/hubTipDismiss";
import { FLARE_CAPTION_HINT, FLARE_FONT_FAMILY } from "../lib/layoutConstants";
import { useFlareColors } from "../theme";

/**
 * Dismissible hub tip — white card with an inset dark tray (icon + message + X).
 */
export function HubTipCard({ tipId, message }: { tipId: string; message: string }) {
  const c = useFlareColors();
  const [visible, setVisible] = useState<boolean | null>(() => {
    const cached = getCachedHubTipDismissed(tipId);
    if (cached === undefined) return null;
    return !cached;
  });

  useEffect(() => {
    let cancelled = false;
    void isHubTipDismissed(tipId).then((dismissed) => {
      if (!cancelled) setVisible(!dismissed);
    });
    return () => {
      cancelled = true;
    };
  }, [tipId]);

  const onDismiss = useCallback(() => {
    setVisible(false);
    void dismissHubTip(tipId);
  }, [tipId]);

  if (!visible) return null;

  return (
    <View style={[logHistoryCardStyles.trackerCard, styles.card, { backgroundColor: c.card }]}>
      <View style={[styles.tray, { backgroundColor: c.surfaceSubtle }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss tip"
          hitSlop={8}
          onPress={onDismiss}
          style={styles.closeHit}
        >
          <FlareLucideIcon icon={FLARE_CHROME_LUCIDE.close} size={16} color={c.textMuted} />
        </Pressable>
        <View style={styles.body}>
          <FlareLucideIcon icon={FLARE_CHROME_LUCIDE.info} size={20} color={c.primary} />
          <Text style={[styles.message, { color: c.textMuted }]}>{message}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 0,
    gap: 0,
  },
  tray: {
    borderRadius: 12,
    padding: 12,
    position: "relative",
  },
  closeHit: {
    position: "absolute",
    top: 10,
    right: 10,
    zIndex: 1,
    padding: 2,
  },
  body: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingRight: 28,
  },
  message: {
    ...FLARE_CAPTION_HINT,
    flex: 1,
    flexShrink: 1,
    maxWidth: "100%",
    textAlign: "left",
    fontFamily: FLARE_FONT_FAMILY.regular,
    lineHeight: 20,
  },
});
