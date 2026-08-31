import { useSafeAreaInsets } from "react-native-safe-area-context";
import React from "react";
import { InstructionScreenShell } from "../components/InstructionScreenShell";
import { AppointmentBriefContent } from "./AppointmentBriefContent";

type SessionUser = { id: string };

/** Stack route — same content as Appointments → Summary tab. */
export function AppointmentBriefScreen({ user: _user }: { user: SessionUser }) {
  const insets = useSafeAreaInsets();
  const contentPaddingBottom = Math.max(insets.bottom, 16) + 24;

  return (
    <InstructionScreenShell
      showInstruction={false}
      contentPaddingBottom={contentPaddingBottom}
      instruction={null}
    >
      <AppointmentBriefContent />
    </InstructionScreenShell>
  );
}
