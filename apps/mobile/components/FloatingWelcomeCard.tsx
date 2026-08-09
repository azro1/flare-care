import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import React, { type ComponentProps } from "react";
import type { InstructionCopy } from "./InstructionCard";
import { EmptySectionWelcome } from "./EmptySectionWelcome";
import { LogHistoryCard } from "./LogHistoryList";
import { WELCOME_CARD_INNER_PADDING } from "../lib/layoutConstants";
import { useFlareColors } from "../theme";

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
  showIcon = true,
  showTitle = true,
  fillHeight = true,
  onDismiss,
  dismissAccessibilityLabel = "Dismiss message",
}: {
  instruction: InstructionCopy;
  icon: MciIconName | IonIconName;
  iconFamily?: "mci" | "ion";
  /** Section welcomes hide the icon (already shown on the tile / empty state); Getting Started opts in. */
  showIcon?: boolean;
  /** Section welcomes hide the title (already in the screen header / landing); Getting Started opts in. */
  showTitle?: boolean;
  /** Section welcomes grow to cover the page behind them; Getting Started (dashboard) opts out. */
  fillHeight?: boolean;
  onDismiss: () => void;
  dismissAccessibilityLabel?: string;
}) {
  const c = useFlareColors();

  return (
    <LogHistoryCard
      style={{ marginBottom: 0, padding: WELCOME_CARD_INNER_PADDING, borderWidth: 1, borderColor: c.primary }}
    >
      <EmptySectionWelcome
        instruction={instruction}
        icon={icon}
        iconFamily={iconFamily}
        showIcon={showIcon}
        showTitle={showTitle}
        fillHeight={fillHeight}
        onDismiss={onDismiss}
        dismissAccessibilityLabel={dismissAccessibilityLabel}
      />
    </LogHistoryCard>
  );
}
