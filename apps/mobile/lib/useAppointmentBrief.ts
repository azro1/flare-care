import { useCallback, useEffect, useState } from "react";
import {
  buildAppointmentBrief,
  getBriefCacheKey,
  getCachedAppointmentBrief,
  resolveBriefRoutePeriod,
  setCachedAppointmentBrief,
  type AppointmentBriefData,
  type AppointmentBriefRouteParams,
} from "./appointmentBriefShared";

export function useAppointmentBrief(userId: string, params: AppointmentBriefRouteParams | undefined) {
  const [brief, setBrief] = useState<AppointmentBriefData | null>(null);
  const [weeks, setWeeks] = useState(4);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!userId || !params) {
      setLoading(false);
      return;
    }

    const resolved = resolveBriefRoutePeriod(params);
    if (!resolved) {
      setLoading(false);
      setError("Choose a date range to continue.");
      setBrief(null);
      return;
    }
    if (resolved.error) {
      setLoading(false);
      setError(resolved.error);
      setBrief(null);
      return;
    }

    const cacheKey = getBriefCacheKey(userId, params);
    const cached = getCachedAppointmentBrief(cacheKey);
    if (cached) {
      setBrief(cached.data);
      setWeeks(cached.weeks);
      setError("");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const data = await buildAppointmentBrief(userId, resolved.period, resolved.weeks);
      setCachedAppointmentBrief(cacheKey, { data, weeks: resolved.weeks });
      setBrief(data);
      setWeeks(resolved.weeks);
    } catch (err: unknown) {
      console.error("Error building appointment brief:", err);
      setError("Could not generate your appointment summary. Please try again.");
      setBrief(null);
    } finally {
      setLoading(false);
    }
  }, [params, userId]);

  useEffect(() => {
    void load();
  }, [load]);

  return { brief, weeks, loading, error, reload: load };
}
