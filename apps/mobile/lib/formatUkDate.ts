/**
 * Display calendar dates as dd/mm/yyyy (UK order).
 * Plain `YYYY-MM-DD` (DB / forms) is split without UTC midnight shifting the day.
 */
function pad2(n: number) {
  return String(n).padStart(2, "0");
}

export function formatUkDate(input: string | Date | null | undefined): string {
  if (input == null) return "";
  if (input instanceof Date) {
    if (Number.isNaN(input.getTime())) return "";
    return `${pad2(input.getDate())}/${pad2(input.getMonth() + 1)}/${input.getFullYear()}`;
  }
  const s = String(input).trim();
  if (!s) return "";
  const dateOnly = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnly) return `${dateOnly[3]}/${dateOnly[2]}/${dateOnly[1]}`;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "";
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/** List row subtitles — `dd/mm/yy` to save space; use `formatUkDate` on detail screens. */
export function formatUkDateShort(input: string | Date | null | undefined): string {
  const full = formatUkDate(input);
  if (!full) return "";
  const parts = full.split("/");
  if (parts.length !== 3 || parts[2].length !== 4) return full;
  return `${parts[0]}/${parts[1]}/${parts[2].slice(-2)}`;
}
