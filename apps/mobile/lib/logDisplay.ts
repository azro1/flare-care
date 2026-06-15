import { formatUkTimeFromOccurred } from "./bowelMovementShared";
import { formatUkDateShort } from "./formatUkDate";

/** List row subtitle — `dd/mm/yy · HH:mm` (short year; detail screens use full `formatUkDate`). */
export function formatLogWhenLine(iso: string | null | undefined): string {
  const dateLabel = formatUkDateShort(iso);
  const timeLabel = formatUkTimeFromOccurred(iso);
  return [dateLabel, timeLabel].filter(Boolean).join(" · ");
}

/** Detail screen header — when the entry was saved. */
export function formatAddedAtHeader(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const datePart = date.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const timePart = formatUkTimeFromOccurred(iso);
  return `Added: ${datePart} at ${timePart}`;
}
