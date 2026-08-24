import { FLARE_CHROME_LUCIDE, FlareLucideIcon } from "../lib/flareLucideIcons";
import React, { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { ConfirmModal } from "./ConfirmModal";
import { useFlareColors } from "../theme";

/**
 * Small info icon that opens a notice modal — keeps helper copy off the page
 * until someone wants it. Trial pattern for replacing always-on muted body text.
 */
export function InfoHintButton({
  title,
  message,
  accessibilityLabel = "More information",
}: {
  title: string;
  message: string;
  accessibilityLabel?: string;
}) {
  const c = useFlareColors();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        onPress={() => setOpen(true)}
        style={styles.hit}
      >
        <FlareLucideIcon icon={FLARE_CHROME_LUCIDE.info} size={22} color={c.textMuted} />
      </Pressable>
      <ConfirmModal
        visible={open}
        notice
        title={title}
        message={message}
        confirmLabel="Got it"
        onConfirm={() => setOpen(false)}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}

/** Title + optional trailing info hint on one row. */
export function InfoHintTitleRow({
  children,
  hintTitle,
  hintMessage,
  hintAccessibilityLabel,
}: {
  children: React.ReactNode;
  hintTitle?: string;
  hintMessage?: string;
  hintAccessibilityLabel?: string;
}) {
  const showHint = Boolean(hintTitle && hintMessage);
  return (
    <View style={styles.titleRow}>
      <View style={styles.titleSlot}>{children}</View>
      {showHint ? (
        <InfoHintButton
          title={hintTitle!}
          message={hintMessage!}
          accessibilityLabel={hintAccessibilityLabel}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  hit: {
    paddingVertical: 2,
    paddingLeft: 4,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 12,
  },
  titleSlot: {
    flexShrink: 1,
  },
});
