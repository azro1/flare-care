import { FLARE_CHROME_LUCIDE, FlareLucideIcon } from "../lib/flareLucideIcons";
import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ConfirmModal } from "./ConfirmModal";
import { useFlareColors } from "../theme";

/**
 * Small help (?) icon that opens a notice modal — keeps helper copy off the page
 * until someone wants it.
 *
 * Works best for short “how to” tips next to field labels.
 * For longer explanations (what NSAIDs are, guidelines), prefer a Help link /
 * AccountHelp section instead — title-row help placement fights long/short titles.
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
        <FlareLucideIcon icon={FLARE_CHROME_LUCIDE.info} size={22} color={c.textSecondary} />
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

/** Title + trailing info hint — space-between, items end (icon at top corner of content below). */
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
    paddingVertical: 0,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: 8,
    marginBottom: 12,
  },
  titleSlot: {
    flex: 1,
    minWidth: 0,
  },
});
