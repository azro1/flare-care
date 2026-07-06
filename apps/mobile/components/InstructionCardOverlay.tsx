import React from "react";
import { View } from "react-native";
import { INSTRUCTION_CARD_FLOAT_STYLE, INSTRUCTION_CARD_SCRIM_STYLE } from "../lib/layoutConstants";
import { useFlareColors } from "../theme";

/**
 * Floating instruction card + soft dim scrim (visual only — `pointerEvents="none"`).
 * Scroll passes through; taps on page content blocked via `InstructionInteractionBlock`.
 * Dismiss via card X only.
 */
export function InstructionCardOverlay({ children }: { children: React.ReactNode }) {
  const c = useFlareColors();

  return (
    <>
      <View
        pointerEvents="none"
        style={[INSTRUCTION_CARD_SCRIM_STYLE, { backgroundColor: c.instructionScrim }]}
      />
      <View pointerEvents="box-none" style={INSTRUCTION_CARD_FLOAT_STYLE}>
        {children}
      </View>
    </>
  );
}
