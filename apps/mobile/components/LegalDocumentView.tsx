import React from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import {
  LEGAL_FOOTER_NOTE,
  LEGAL_LAST_UPDATED,
  PRIVACY_INTRO,
  PRIVACY_SECTIONS,
  TERMS_INTRO,
  TERMS_SECTIONS,
} from "../../../src/content/legalDocuments";
import { useFlareColors } from "../theme";

export type LegalDocumentKind = "privacy" | "terms";

type LegalSection = { id: string; title: string; paragraphs: string[] };

const DOCUMENTS: Record<
  LegalDocumentKind,
  { title: string; intro: string; sections: LegalSection[] }
> = {
  privacy: { title: "Privacy Policy", intro: PRIVACY_INTRO, sections: PRIVACY_SECTIONS },
  terms: { title: "Terms of Use", intro: TERMS_INTRO, sections: TERMS_SECTIONS },
};

export function LegalDocumentView({ kind }: { kind: LegalDocumentKind }) {
  const c = useFlareColors();
  const doc = DOCUMENTS[kind];

  return (
    <View style={styles.wrap}>
      <Text style={[styles.updated, { color: c.textMuted }]}>Last updated: {LEGAL_LAST_UPDATED}</Text>
      <Text style={[styles.intro, { color: c.textMuted }]}>{doc.intro}</Text>
      {doc.sections.map((section) => (
        <View key={section.id} style={styles.section}>
          <Text style={[styles.sectionTitle, { color: c.text }]}>{section.title}</Text>
          {section.paragraphs.map((paragraph, index) => (
            <Text key={index} style={[styles.paragraph, { color: c.textMuted }]}>
              {paragraph}
            </Text>
          ))}
        </View>
      ))}
      <Text style={[styles.footerNote, { color: c.textMuted }]}>{LEGAL_FOOTER_NOTE}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Email support at support@flarecare.app"
        onPress={() => Linking.openURL("mailto:support@flarecare.app").catch(() => {})}
        hitSlop={8}
      >
        <Text style={[styles.supportLink, { color: c.primary }]}>support@flarecare.app</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 4 },
  updated: { fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: 12 },
  intro: { fontSize: 14, lineHeight: 21, fontFamily: "Inter_400Regular", marginBottom: 20 },
  section: { marginBottom: 22 },
  sectionTitle: { fontSize: 17, fontFamily: "Inter_700Bold", marginBottom: 8 },
  paragraph: { fontSize: 14, lineHeight: 21, fontFamily: "Inter_400Regular", marginBottom: 8 },
  footerNote: { fontSize: 12, lineHeight: 18, fontFamily: "Inter_400Regular", marginTop: 8, marginBottom: 16 },
  supportLink: { fontSize: 14, fontFamily: "Inter_600SemiBold", marginBottom: 8 },
});
