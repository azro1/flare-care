/**
 * Scan-first numbered accordion — shared by legal docs and informational guides.
 */
import React, { useState, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { FLARE_CHROME_LUCIDE, FlareLucideIcon } from "../lib/flareLucideIcons";
import {
  FLARE_FONT_FAMILY,
  FLARE_FONT_SIZE,
  FLARE_LINE_HEIGHT,
  STACKED_LINE_GAP,
} from "../lib/layoutConstants";
import { useFlareColors } from "../theme";

export type NumberedAccordionSection = {
  id: string;
  title: string;
  body: ReactNode;
};

export function NumberedAccordion({
  intro,
  sections,
  footer,
  numbered = true,
}: {
  intro?: string;
  sections: NumberedAccordionSection[];
  footer?: ReactNode;
  /** When false, section titles show without leading numbers (e.g. What is IBD?). */
  numbered?: boolean;
}) {
  const c = useFlareColors();
  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set());

  const toggleSection = (id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <View style={styles.wrap}>
      {intro ? <Text style={[styles.intro, { color: c.textMuted }]}>{intro}</Text> : null}

      <View style={[styles.accordion, !footer && styles.accordionLast]}>
        {sections.map((section, index) => {
          const open = openIds.has(section.id);
          const n = index + 1;
          const label = numbered ? `${n}. ${section.title}` : section.title;
          return (
            <View
              key={section.id}
              style={[
                styles.accordionItem,
                index < sections.length - 1
                  ? { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.cardBorder }
                  : null,
              ]}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: open }}
                accessibilityLabel={label}
                onPress={() => toggleSection(section.id)}
                style={styles.accordionHeader}
                hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
              >
                <FlareLucideIcon
                  icon={open ? FLARE_CHROME_LUCIDE.down : FLARE_CHROME_LUCIDE.forward}
                  size={16}
                  color={c.text}
                />
                <Text style={[styles.accordionTitle, { color: c.text }]}>{label}</Text>
              </Pressable>
              {open ? <View style={styles.accordionBody}>{section.body}</View> : null}
            </View>
          );
        })}
      </View>

      {footer}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 4 },
  intro: {
    fontSize: FLARE_FONT_SIZE.muted,
    lineHeight: FLARE_LINE_HEIGHT.muted,
    fontFamily: FLARE_FONT_FAMILY.regular,
    marginBottom: 18,
  },
  accordion: {
    marginBottom: 18,
  },
  accordionLast: {
    marginBottom: 0,
  },
  accordionItem: {
    paddingVertical: 12,
  },
  accordionHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: 2,
  },
  accordionTitle: {
    flex: 1,
    fontSize: FLARE_FONT_SIZE.body,
    lineHeight: FLARE_LINE_HEIGHT.body,
    fontFamily: FLARE_FONT_FAMILY.bold,
  },
  accordionBody: {
    marginTop: 10,
    paddingLeft: 26,
    gap: STACKED_LINE_GAP,
  },
});
