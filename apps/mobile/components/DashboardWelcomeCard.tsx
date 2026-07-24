import React from "react";
import { DASHBOARD_GETTING_STARTED_INSTRUCTION } from "../lib/instructionCardCopy";
import { FloatingWelcomeCard } from "./FloatingWelcomeCard";

/** Floating dashboard welcome — same card + scrim overlay pattern as other screens. */
export function DashboardWelcomeCard({ onDismiss }: { onDismiss: () => void }) {
  return (
    <FloatingWelcomeCard
      instruction={DASHBOARD_GETTING_STARTED_INSTRUCTION}
      icon="compass-outline"
      iconFamily="ion"
      onDismiss={onDismiss}
      dismissAccessibilityLabel="Dismiss welcome message"
    />
  );
}
