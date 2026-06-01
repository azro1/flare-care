import React from "react";
import { StyleSheet, Text, type StyleProp, type TextStyle } from "react-native";
import {
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

export function FlareScreenSectionTitle({
  children,
  style,
  compact,
  inline,
}: {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
  /** Tighter spacing when label sits directly above a control in a row/column. */
  compact?: boolean;
  /** No vertical margins — e.g. label in a row beside a link. */
  inline?: boolean;
}) {
  const c = useFlareColors();
  return (
    <Text
      style={[
        flareScreenSectionTitleStyles.title,
        compact && flareScreenSectionTitleStyles.titleCompact,
        inline && flareScreenSectionTitleStyles.titleInline,
        { color: c.textMuted },
        style,
      ]}
    >
      {children}
    </Text>
  );
}
