import React from "react";
import { StyleSheet, Text, type StyleProp, type TextStyle } from "react-native";
import {
  CARD_SECTION_INNER_GAP,
  FLARE_FONT_FAMILY,
  SECTION_TITLE_MARGIN_BOTTOM,
  SECTION_TITLE_MARGIN_TOP,
} from "../lib/layoutConstants";
import { useFlareColors } from "../theme";

/** Small heading on screen background — same as Account (`My account`, `Delete account`). */
export const flareScreenSectionTitleStyles = StyleSheet.create({
  title: {
    fontSize: 14,
    fontFamily: FLARE_FONT_FAMILY.bold,
    marginBottom: SECTION_TITLE_MARGIN_BOTTOM,
    marginTop: SECTION_TITLE_MARGIN_TOP,
    textAlign: "left",
  },
  titleCompact: {
    marginTop: 0,
    marginBottom: 8,
  },
  titleInline: {
    marginTop: 0,
    marginBottom: 0,
  },
});

/** Card with muted title at top-left — pair with `FlareScreenSectionTitle inCard`. */
export const flareCardSectionStyles = StyleSheet.create({
  container: { gap: CARD_SECTION_INNER_GAP },
});

export function FlareScreenSectionTitle({
  children,
  style,
  compact,
  inline,
  inCard,
}: {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
  /** Tighter spacing when label sits directly above a control in a row/column. */
  compact?: boolean;
  /** No vertical margins — e.g. label in a row beside a link. */
  inline?: boolean;
  /** Inside a card; use with `flareCardSectionStyles.container` (no title margins). */
  inCard?: boolean;
}) {
  const c = useFlareColors();
  return (
    <Text
      style={[
        flareScreenSectionTitleStyles.title,
        compact && flareScreenSectionTitleStyles.titleCompact,
        (inline || inCard) && flareScreenSectionTitleStyles.titleInline,
        { color: c.textMuted },
        style,
      ]}
    >
      {children}
    </Text>
  );
}
