import React from "react";
import { Text } from "react-native";
import { LogDetailCard, LogDetailFieldGroup, LogDetailFieldGroups, LogDetailNotesCard, logDetailStyles } from "./LogDetailLayout";
import { formatUkDate } from "../lib/formatUkDate";
import { useFlareColors } from "../theme";

export type WizardReviewField = { label: string; value: string };

/** Review / detail section — card title + stacked `surfaceSubtle` fields (matches log detail screens). */
export function WizardReviewSection({ title, fields }: { title: string; fields: WizardReviewField[] }) {
  const c = useFlareColors();
  const visible = fields.filter((f) => f.value !== "");
  if (!visible.length) return null;
  return (
    <LogDetailCard>
      <Text style={[logDetailStyles.notesTitle, { color: c.text }]}>{title}</Text>
      <LogDetailFieldGroup fields={visible} />
    </LogDetailCard>
  );
}

export function WizardReviewMealsSection({
  entries,
}: {
  entries: { label: string; skipped?: boolean; items?: { food: string; quantity: string }[] }[];
}) {
  const c = useFlareColors();
  if (!entries.length) return null;
  return (
    <LogDetailCard>
      <Text style={[logDetailStyles.notesTitle, { color: c.text }]}>Meals</Text>
      <LogDetailFieldGroups
        groups={entries.map((entry) => [
          {
            label: entry.label,
            value: entry.skipped
              ? "Didn't eat anything"
              : (entry.items ?? [])
                  .map((item) => `${item.food}${item.quantity ? ` (${item.quantity})` : ""}`)
                  .join("\n"),
          },
        ])}
      />
    </LogDetailCard>
  );
}

export function WizardReviewNotesSection({ notes }: { notes: string }) {
  const trimmed = notes.trim();
  if (!trimmed) return null;
  return <LogDetailNotesCard notes={trimmed} />;
}

/** Medication wizard: one card per list section, fields for each entry in sequence. */
export function WizardReviewMedicationSection({
  title,
  items,
  showDosage,
}: {
  title: string;
  items: { medication: string; date: string; timeOfDay: string; dosage?: string }[];
  showDosage: boolean;
}) {
  if (!items.length) return null;
  const c = useFlareColors();
  const groups = items.map((item) => [
    { label: "Medication", value: item.medication },
    ...(showDosage ? [{ label: "Dosage", value: item.dosage || "N/A" }] : []),
    { label: "Date", value: item.date ? formatUkDate(item.date) : "N/A" },
    { label: "Time of Day", value: item.timeOfDay || "N/A" },
  ]);
  return (
    <LogDetailCard>
      <Text style={[logDetailStyles.notesTitle, { color: c.text }]}>{title}</Text>
      <LogDetailFieldGroups groups={groups} />
    </LogDetailCard>
  );
}
