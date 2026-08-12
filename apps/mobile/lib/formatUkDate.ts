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

function dayOrdinal(day: number): string {
  const mod100 = day % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${day}th`;
  switch (day % 10) {
    case 1:
      return `${day}st`;
    case 2:
      return `${day}nd`;
    case 3:
      return `${day}rd`;
    default:
      return `${day}th`;
  }
}

/** Short readable date — e.g. `Wed 4th Aug`. Accepts Date or `YYYY-MM-DD` / ISO strings. */
export function formatUkGreetingDate(input: string | Date = new Date()): string {
  let d: Date;
  if (input instanceof Date) {
    d = input;
  } else {
    const s = String(input).trim();
    if (!s) return "";
    const dateOnly = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (dateOnly) {
      d = new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]));
    } else {
      d = new Date(s);
    }
  }
  if (Number.isNaN(d.getTime())) return "";
  const weekday = d.toLocaleDateString("en-GB", { weekday: "short" });
  const month = d.toLocaleDateString("en-GB", { month: "short" });
  return `${weekday} ${dayOrdinal(d.getDate())} ${month}`;
}
