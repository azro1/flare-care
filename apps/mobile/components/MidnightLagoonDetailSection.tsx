import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Card } from "./MidnightLagoonCard";
import { SectionLabel } from "./MidnightLagoonSectionLabel";
import { SPACING, TYPOGRAPHY } from "../designTokens";
import { formatUkDate } from "../lib/formatUkDate";
import { useFlareColors } from "../theme";

export type DetailField = { label: string; value: string };

export function DetailSectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <SectionLabel style={styles.sectionLabel}>{title}</SectionLabel>
      {children}
    </Card>
  );
}

export function DetailFieldRows({ fields }: { fields: DetailField[] }) {
  const c = useFlareColors();
  const visible = fields.filter((field) => field.value !== "");
  if (!visible.length) return null;
  return (
    <View>
      {visible.map((field, index) => (
        <View key={`${field.label}-${index}`} style={index > 0 ? styles.fieldGap : undefined}>
          <View style={styles.fieldRow}>
            <Text style={[styles.fieldLabel, { color: c.textSecondary, fontFamily: TYPOGRAPHY.fontFamily.regular }]}>
              {field.label}
            </Text>
            <Text style={[styles.fieldValue, { color: c.text, fontFamily: TYPOGRAPHY.fontFamily.medium }]}>
              {field.value}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

export function DetailNotesBody({ notes }: { notes: string }) {
  const c = useFlareColors();
  return <Text style={[styles.notes, { color: c.text, fontFamily: TYPOGRAPHY.fontFamily.regular }]}>{notes}</Text>;
}

export function DetailAddedLine({ text }: { text: string }) {
  const c = useFlareColors();
  if (!text) return null;
  return (
    <Text style={[styles.added, { color: c.textSecondary, fontFamily: TYPOGRAPHY.fontFamily.regular }]}>{text}</Text>
  );
}

export function DetailMedicationEntries({
  items,
  showDosage,
}: {
  items: { medication: string; date: string; timeOfDay: string; dosage?: string }[];
  showDosage: boolean;
}) {
  const c = useFlareColors();
  return (
    <View>
      {items.map((item, index) => (
        <View key={`${index}-${item.medication}`} style={index > 0 ? styles.medGap : undefined}>
          <Text style={[styles.medName, { color: c.text, fontFamily: TYPOGRAPHY.fontFamily.medium }]}>
            {item.medication.trim() || "Medication"}
          </Text>
          <DetailFieldRows
            fields={[
              ...(showDosage ? [{ label: "Dosage", value: item.dosage || "N/A" }] : []),
              { label: "Date", value: item.date ? formatUkDate(item.date) : "N/A" },
              { label: "Time of Day", value: item.timeOfDay || "N/A" },
            ]}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionLabel: {
    marginTop: 0,
    marginBottom: SPACING.md,
    marginHorizontal: 0,
  },
  fieldRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: SPACING.md,
  },
  fieldGap: {
    marginTop: SPACING.md,
  },
  fieldLabel: {
    fontSize: TYPOGRAPHY.fontSize.md,
    flex: 1,
  },
  fieldValue: {
    fontSize: TYPOGRAPHY.fontSize.md,
    textAlign: "right",
    flex: 1,
  },
  notes: {
    fontSize: TYPOGRAPHY.fontSize.md,
    lineHeight: 22,
    fontStyle: "italic",
  },
  added: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    marginBottom: SPACING.lg,
  },
  medName: {
    fontSize: TYPOGRAPHY.fontSize.md,
    marginBottom: SPACING.sm,
  },
  medGap: {
    marginTop: SPACING.lg,
  },
});
