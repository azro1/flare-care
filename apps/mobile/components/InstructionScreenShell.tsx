import React from "react";
import { StyleSheet, View } from "react-native";
import { ScrollView } from "../lib/scrollViews";
import { SCREEN_EDGE_PADDING } from "../lib/layoutConstants";
import { useFlareColors } from "../theme";
import { InstructionCardOverlay } from "./InstructionCardOverlay";

/**
 * While instruction shows: block taps on wrapped content (lists, buttons, FAB targets).
 * Scroll still works — scrim uses `pointerEvents="none"`. Place help links outside this wrapper.
 */
export function InstructionInteractionBlock({
  active,
  children,
}: {
  active: boolean;
  children: React.ReactNode;
}) {
  if (!active) return <>{children}</>;
  return <View pointerEvents="none">{children}</View>;
}

/**
 * Scroll + floating instruction card. Convention: scroll + help links stay usable;
 * primary CTAs and thumb FAB stay visible but blocked until dismiss (X on card).
 */
export function InstructionScreenShell({
  children,
  showInstruction,
  instruction,
  contentPaddingBottom = 0,
  floatingAction,
  footer,
  interactiveWhileInstruction,
}: {
  children: React.ReactNode;
  showInstruction: boolean;
  instruction: React.ReactNode;
  contentPaddingBottom?: number;
  floatingAction?: React.ReactNode;
  footer?: React.ReactNode;
  /** Help links etc. — stay tappable while instruction shows (sibling outside interaction block). */
  interactiveWhileInstruction?: React.ReactNode;
}) {
  const c = useFlareColors();

  return (
    <>
      <View style={{ flex: 1, backgroundColor: c.screen }}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            padding: SCREEN_EDGE_PADDING,
            paddingBottom: contentPaddingBottom,
          }}
          showsVerticalScrollIndicator={false}
        >
          <InstructionInteractionBlock active={showInstruction}>{children}</InstructionInteractionBlock>
          {interactiveWhileInstruction}
        </ScrollView>
        {floatingAction ? (
          <InstructionInteractionBlock active={showInstruction}>
            <View
              style={showInstruction ? styles.floatingActionUnderScrim : undefined}
              pointerEvents="box-none"
            >
              {floatingAction}
            </View>
          </InstructionInteractionBlock>
        ) : null}
        {showInstruction ? <InstructionCardOverlay>{instruction}</InstructionCardOverlay> : null}
      </View>
      {footer}
    </>
  );
}

/** Below instruction scrim (z 19) so the thumb FAB dims with the page but stays visible. */
const styles = StyleSheet.create({
  floatingActionUnderScrim: {
    zIndex: 18,
  },
});
