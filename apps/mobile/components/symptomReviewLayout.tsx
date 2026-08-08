import React from "react";
import {
  LogDetailFieldGroup,
  LogDetailFieldGroups,
  LogDetailNotesTray,
  LogDetailSectionCard,
} from "./LogDetailLayout";
import { formatUkDate } from "../lib/formatUkDate";

export type WizardReviewField = {
  label: string;
  value: string;
  /** Default muted (13). Pass caption only where decided. */
  valueSize?: "muted" | "caption";
};

/** Review — muted in-card section title + `surfaceSubtle` fields. */
export function WizardReviewSection({
  title,
  fields,
  onEdit,
}: {
  title: string;
  fields: WizardReviewField[];
  onEdit?: () => void;
}) {
  const visible = fields.filter((f) => f.value !== "");
  if (!visible.length) return null;
  return (
    <LogDetailSectionCard title={title} onEdit={onEdit} editAccessibilityLabel={`Edit ${title}`}>
      <LogDetailFieldGroup fields={visible} />
    </LogDetailSectionCard>
  );
}

export function WizardReviewMealsSection({
  entries,
  onEdit,
}: {
  entries: { label: string; skipped?: boolean; items?: { food: string; quantity: string }[] }[];
  onEdit?: () => void;
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
    <LogDetailSectionCard title="Meals" onEdit={onEdit} editAccessibilityLabel="Edit Meals">
      <LogDetailFieldGroup fields={fields} />
    </LogDetailSectionCard>
  );
}

export function WizardReviewNotesSection({ notes, onEdit }: { notes: string; onEdit?: () => void }) {
  const trimmed = notes.trim();
  if (!trimmed) return null;
  return (
    <LogDetailSectionCard title="Notes" onEdit={onEdit} editAccessibilityLabel="Edit Notes">
      <LogDetailNotesTray notes={trimmed} />
    </LogDetailSectionCard>
  );
}

/** Medication wizard: one card per list section, fields for each entry in sequence. */
export function WizardReviewMedicationSection({
  title,
  items,
  showDosage,
  onEdit,
}: {
  title: string;
  items: { medication: string; date: string; timeOfDay: string; dosage?: string }[];
  showDosage: boolean;
  onEdit?: () => void;
}) {
  if (!items.length) return null;
  const groups = items.map((item) => [
    { label: "Medication", value: item.medication },
    ...(showDosage ? [{ label: "Dosage", value: item.dosage || "N/A" }] : []),
    { label: "Date", value: item.date ? formatUkDate(item.date) : "N/A", valueSize: "caption" as const },
    { label: "Time of Day", value: item.timeOfDay || "N/A", valueSize: "caption" as const },
  ]);
  return (
    <LogDetailSectionCard title={title} onEdit={onEdit} editAccessibilityLabel={`Edit ${title}`}>
      <LogDetailFieldGroups groups={groups} />
    </LogDetailSectionCard>
  );
}
