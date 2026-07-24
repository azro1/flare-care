import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import React, { type ComponentProps } from "react";
import type { InstructionCopy } from "./InstructionCard";
import { EmptySectionWelcome } from "./EmptySectionWelcome";
import { LogHistoryCard } from "./LogHistoryList";

type MciIconName = ComponentProps<typeof MaterialCommunityIcons>["name"];
type IonIconName = ComponentProps<typeof Ionicons>["name"];

/**
 * New-style welcome for floating overlays (dashboard scrim + on-top card).
 * Same chrome as empty-section welcomes (e.g. My Meds).
 */
export function FloatingWelcomeCard({
  instruction,
  icon,
  iconFamily = "mci",
  onDismiss,
  dismissAccessibilityLabel = "Dismiss message",
}: {
  instruction: InstructionCopy;
  icon: MciIconName | IonIconName;
  iconFamily?: "mci" | "ion";
  onDismiss: () => void;
  dismissAccessibilityLabel?: string;
}) {
  return (
    <LogHistoryCard style={{ marginBottom: 0 }}>
      <EmptySectionWelcome
        instruction={instruction}
        icon={icon}
        iconFamily={iconFamily}
        onDismiss={onDismiss}
        dismissAccessibilityLabel={dismissAccessibilityLabel}
      />
    </LogHistoryCard>
  );
}
