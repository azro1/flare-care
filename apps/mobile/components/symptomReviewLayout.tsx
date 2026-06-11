import React from "react";
import {
  LogDetailFieldGroup,
  LogDetailFieldGroups,
  LogDetailNotesTray,
  LogDetailSectionCard,
} from "./LogDetailLayout";
import { formatUkDate } from "../lib/formatUkDate";

export type WizardReviewField = { label: string; value: string };

/** Review — muted in-card section title + `surfaceSubtle` fields. */
export function WizardReviewSection({ title, fields }: { title: string; fields: WizardReviewField[] }) {
  const visible = fields.filter((f) => f.value !== "");
  if (!visible.length) return null;
  return (
    <LogDetailSectionCard title={title}>
      <LogDetailFieldGroup fields={visible} />
    </LogDetailSectionCard>
  );
}

export function WizardReviewMealsSection({
  entries,
}: {
  entries: { label: string; skipped?: boolean; items?: { food: string; quantity: string }[] }[];
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
    <LogDetailSectionCard title="Meals">
      <LogDetailFieldGroup fields={fields} />
    </LogDetailSectionCard>
  );
}

export function WizardReviewNotesSection({ notes }: { notes: string }) {
  const trimmed = notes.trim();
  if (!trimmed) return null;
  return (
    <LogDetailSectionCard title="Notes" last>
      <LogDetailNotesTray notes={trimmed} />
    </LogDetailSectionCard>
  );
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
  const groups = items.map((item) => [
    { label: "Medication", value: item.medication },
    ...(showDosage ? [{ label: "Dosage", value: item.dosage || "N/A" }] : []),
    { label: "Date", value: item.date ? formatUkDate(item.date) : "N/A" },
    { label: "Time of Day", value: item.timeOfDay || "N/A" },
  ]);
  return (
    <LogDetailSectionCard title={title}>
      <LogDetailFieldGroups groups={groups} />
    </LogDetailSectionCard>
  );
}
