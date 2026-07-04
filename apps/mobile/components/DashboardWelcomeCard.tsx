import React from "react";
import { DASHBOARD_GETTING_STARTED_INSTRUCTION } from "../lib/instructionCardCopy";
import { InstructionCard } from "./InstructionCard";

export function DashboardWelcomeCard({ onDismiss }: { onDismiss: () => void }) {
  return (
    <InstructionCard
      instruction={DASHBOARD_GETTING_STARTED_INSTRUCTION}
      onDismiss={onDismiss}
      dismissAccessibilityLabel="Dismiss welcome message"
    />
  );
}
