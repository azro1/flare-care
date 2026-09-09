/**
 * Privacy / Terms body — scan-first numbered accordion (DrDoctor-style progressive disclosure).
 * Copy from shared `src/content/legalDocuments`.
 */
import React from "react";
import { Linking, StyleSheet, Text } from "react-native";
import {
  LEGAL_FOOTER_NOTE,
  LEGAL_LAST_UPDATED,
  PRIVACY_INTRO,
  PRIVACY_SECTIONS,
  TERMS_INTRO,
  TERMS_SECTIONS,
} from "../../../src/content/legalDocuments";
import {
  FLARE_FONT_FAMILY,
  FLARE_FONT_SIZE,
  FLARE_LINE_HEIGHT,
} from "../lib/layoutConstants";
import { useFlareColors } from "../theme";
import { NumberedAccordion } from "./NumberedAccordion";

export type LegalDocumentKind = "privacy" | "terms";

type LegalSection = { id: string; title: string; paragraphs: string[] };

const DOCUMENTS: Record<
  LegalDocumentKind,
  { title: string; intro: string; sections: LegalSection[] }
> = {
  privacy: { title: "Privacy Policy", intro: PRIVACY_INTRO, sections: PRIVACY_SECTIONS },
  terms: { title: "Terms of Use", intro: TERMS_INTRO, sections: TERMS_SECTIONS },
};

const SUPPORT_EMAIL = "support@flarecare.app";

/** Renders a paragraph string, making any support email a tappable cadet link. */
function LegalParagraph({ text, c }: { text: string; c: ReturnType<typeof useFlareColors> }) {
  const idx = text.indexOf(SUPPORT_EMAIL);
  if (idx < 0) {
    return <Text style={[styles.paragraph, { color: c.textMuted }]}>{text}</Text>;
  }
  const before = text.slice(0, idx);
  const after = text.slice(idx + SUPPORT_EMAIL.length);
  return (
    <Text style={[styles.paragraph, { color: c.textMuted }]}>
      {before}
      <Text
        style={{ color: c.primary, fontFamily: "Inter_600SemiBold" }}
        onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`).catch(() => {})}
        accessibilityRole="link"
        accessibilityLabel={`Email ${SUPPORT_EMAIL}`}
      >
        {SUPPORT_EMAIL}
      </Text>
      {after}
    </Text>
  );
}

export function LegalDocumentView({ kind }: { kind: LegalDocumentKind }) {
  const c = useFlareColors();
  const doc = DOCUMENTS[kind];

  return (
    <NumberedAccordion
      intro={doc.intro}
      sections={doc.sections.map((section) => ({
        id: section.id,
        title: section.title,
        body: section.paragraphs.map((paragraph, pIndex) => (
          <LegalParagraph key={pIndex} text={paragraph} c={c} />
        )),
      }))}
      footer={
        <>
          <Text style={[styles.updated, { color: c.textMuted }]}>Last updated: {LEGAL_LAST_UPDATED}</Text>
          <Text style={[styles.footerNote, { color: c.textMuted }]}>{LEGAL_FOOTER_NOTE}</Text>
        </>
      }
    />
  );
}

const styles = StyleSheet.create({
  paragraph: {
    fontSize: FLARE_FONT_SIZE.muted,
    lineHeight: FLARE_LINE_HEIGHT.muted,
    fontFamily: FLARE_FONT_FAMILY.regular,
  },
  updated: {
    fontSize: FLARE_FONT_SIZE.caption,
    fontFamily: FLARE_FONT_FAMILY.regular,
    lineHeight: FLARE_LINE_HEIGHT.caption,
    marginBottom: 12,
  },
  footerNote: {
    fontSize: FLARE_FONT_SIZE.caption,
    lineHeight: FLARE_LINE_HEIGHT.caption,
    fontFamily: FLARE_FONT_FAMILY.regular,
    marginBottom: 16,
  },
});
