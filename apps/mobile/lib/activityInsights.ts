import { todayYmd } from "./bowelMovementShared";

/** Oldest → newest (index 6 = today). */
export function last7YmdDates(today = todayYmd()): string[] {
  const [y, m, d] = today.split("-").map(Number);
  const base = new Date(y, m - 1, d);
  const out: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const dt = new Date(base);
    dt.setDate(base.getDate() - i);
    const yy = dt.getFullYear();
    const mm = String(dt.getMonth() + 1).padStart(2, "0");
    const dd = String(dt.getDate()).padStart(2, "0");
    out.push(`${yy}-${mm}-${dd}`);
  }
  return out;
}

export type ActivityInsight = {
  /** Oldest → newest; length 7; last entry is today. */
  daysLogged: boolean[];
  loggedCount: number;
};

export const EMPTY_ACTIVITY_INSIGHT: ActivityInsight = {
  daysLogged: [false, false, false, false, false, false, false],
  loggedCount: 0,
};

/** Mark a day logged if any daily activity happened. */
export function buildActivityInsight(loggedDates: Iterable<string>, today = todayYmd()): ActivityInsight {
  const window = last7YmdDates(today);
  const set = new Set(loggedDates);
  const daysLogged = window.map((ymd) => set.has(ymd));
  return {
    daysLogged,
    loggedCount: daysLogged.filter(Boolean).length,
  };
}

export function activityInsightCopy(insight: ActivityInsight): string {
  const { loggedCount, daysLogged } = insight;
  if (loggedCount === 0) return "Nothing logged this week yet";
  let streak = 0;
  for (let i = daysLogged.length - 1; i >= 0; i--) {
    if (!daysLogged[i]) break;
    streak += 1;
  }
  if (streak === 7) return "7-day streak";
  if (streak >= 3) return `${streak}-day streak`;
  return `Logged on ${loggedCount} of the last 7 days`;
}

/** YMD from an ISO timestamp (local calendar day). */
export function ymdFromIso(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}
