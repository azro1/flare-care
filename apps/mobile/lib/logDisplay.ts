import { formatUkTimeFromOccurred } from "./bowelMovementShared";
import { formatUkDate } from "./formatUkDate";

/** List row subtitle — `dd/mm/yyyy · HH:mm`. */
export function formatLogWhenLine(iso: string | null | undefined): string {
  const dateLabel = formatUkDate(iso);
  const timeLabel = formatUkTimeFromOccurred(iso);
  return [dateLabel, timeLabel].filter(Boolean).join(" · ");
}

/** Detail screen header — when the entry was saved. */
export function formatAddedAtHeader(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const datePart = date.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const timePart = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return `Added ${datePart} at ${timePart}`;
}
