import React from "react";
import { StyleSheet, Text, View } from "react-native";
import {
  LogDetailFieldGroup,
  LogDetailNotesTray,
  LogDetailSectionCard,
  REVIEW_TRAY_HORIZONTAL_PADDING,
  WizardReviewShell,
} from "./LogDetailLayout";
import { formatUkDate } from "../lib/formatUkDate";
import { FLARE_FONT_FAMILY, FLARE_FONT_SIZE, FLARE_LINE_HEIGHT } from "../lib/layoutConstants";
import { useFlareColors } from "../theme";

export type WizardReviewField = {
  label: string;
  value: string;
};

export { WizardReviewShell };

/**
 * Review section — `embedded` = title + Edit + fields inside one inset tray
 * (use inside `WizardReviewShell`).
 */
export function WizardReviewSection({
  title,
  fields,
  onEdit,
  embedded,
}: {
  title: string;
  fields: WizardReviewField[];
  onEdit?: () => void;
  embedded?: boolean;
}) {
  const visible = fields.filter((f) => f.value !== "");
  if (!visible.length) return null;
  return (
    <LogDetailSectionCard
      title={title}
      onEdit={onEdit}
      editAccessibilityLabel={`Edit ${title}`}
      embedded={embedded}
    >
      <LogDetailFieldGroup fields={visible} flush={embedded} />
    </LogDetailSectionCard>
  );
}

export function WizardReviewMealsSection({
  entries,
  onEdit,
  embedded,
}: {
  entries: { label: string; skipped?: boolean; items?: { food: string; quantity: string }[] }[];
  onEdit?: () => void;
  embedded?: boolean;
}) {
  const fields = entries.map((entry) => ({
    label: entry.label,
    value: entry.skipped
      ? "Didn't eat anything"
      : (entry.items ?? [])
          .map((item) => `${item.food}${item.quantity ? ` (${item.quantity})` : ""}`)
          .join("\n"),
  }));
  if (!fields.length) return null;
  return (
    <LogDetailSectionCard title="Meals" onEdit={onEdit} editAccessibilityLabel="Edit Meals" embedded={embedded}>
      <LogDetailFieldGroup fields={fields} flush={embedded} />
    </LogDetailSectionCard>
  );
}

export function WizardReviewNotesSection({
  notes,
  onEdit,
  embedded,
}: {
  notes: string;
  onEdit?: () => void;
  embedded?: boolean;
}) {
  const trimmed = notes.trim();
  if (!trimmed) return null;
  return (
    <LogDetailSectionCard title="Notes" onEdit={onEdit} editAccessibilityLabel="Edit Notes" embedded={embedded}>
      <LogDetailNotesTray notes={trimmed} flush={embedded} />
    </LogDetailSectionCard>
  );
}

/**
 * Option 2: section title + Edit stay in the tray header (same as LS/MW).
 * Each med = name subhead (regular weight), then Dosage / Date / Time flush in that same tray.
 */
export function WizardReviewMedicationSection({
  title,
  items,
  showDosage,
  onEdit,
  embedded,
}: {
  title: string;
  items: { medication: string; date: string; timeOfDay: string; dosage?: string }[];
  showDosage: boolean;
  onEdit?: () => void;
  embedded?: boolean;
}) {
  const c = useFlareColors();
  if (!items.length) return null;

  const entries = items.map((item) => ({
    name: item.medication.trim() || "Medication",
    fields: [
      ...(showDosage ? [{ label: "Dosage", value: item.dosage || "N/A" }] : []),
      { label: "Date", value: item.date ? formatUkDate(item.date) : "N/A" },
      { label: "Time of Day", value: item.timeOfDay || "N/A" },
    ],
  }));

  return (
    <LogDetailSectionCard title={title} onEdit={onEdit} editAccessibilityLabel={`Edit ${title}`} embedded={embedded}>
      <View>
        {entries.map((entry, index) => (
          <View
            key={`${index}-${entry.name}`}
            style={
              index < entries.length - 1
                ? { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.cardBorder }
                : undefined
            }
          >
            <Text
              style={[
                styles.medName,
                {
                  color: c.text,
                  paddingHorizontal: embedded ? REVIEW_TRAY_HORIZONTAL_PADDING : 16,
                },
              ]}
            >
              {entry.name}
            </Text>
            <LogDetailFieldGroup fields={entry.fields} flush={embedded} hideFieldDividers />
          </View>
        ))}
      </View>
    </LogDetailSectionCard>
  );
}

const styles = StyleSheet.create({
  medName: {
    fontSize: FLARE_FONT_SIZE.muted,
    lineHeight: FLARE_LINE_HEIGHT.muted,
    fontFamily: FLARE_FONT_FAMILY.regular,
    paddingTop: 14,
    paddingBottom: 4,
  },
});
