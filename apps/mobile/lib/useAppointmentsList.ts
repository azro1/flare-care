import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useRef, useState } from "react";
import { InteractionManager } from "react-native";
import {
  fetchAppointmentsForUser,
  getAppointmentsListCache,
  type AppointmentRow,
} from "./appointmentShared";

function appointmentsListCacheKey(rows: AppointmentRow[]): string {
  return rows.map((row) => `${row.id}:${row.updated_at ?? row.created_at}`).join("|");
}

export type AppointmentsListState = ReturnType<typeof useAppointmentsList>;

export function useAppointmentsList(userId: string) {
  const [appointments, setAppointments] = useState<AppointmentRow[]>(
    () => getAppointmentsListCache(userId) ?? [],
  );
  const cacheKeyRef = useRef(appointmentsListCacheKey(appointments));
  const [loading, setLoading] = useState(false);

  const applyRows = useCallback((rows: AppointmentRow[]) => {
    const nextKey = appointmentsListCacheKey(rows);
    if (nextKey === cacheKeyRef.current) return;
    cacheKeyRef.current = nextKey;
    setAppointments(rows);
  }, []);

  const load = useCallback(async () => {
    const hasCache = getAppointmentsListCache(userId) !== undefined;
    if (!hasCache) setLoading(true);
    try {
      const rows = await fetchAppointmentsForUser(userId);
      applyRows(rows);
      return rows;
    } catch (err) {
      console.error("Error loading appointments:", err);
      applyRows([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, [applyRows, userId]);

  useFocusEffect(
    useCallback(() => {
      const cached = getAppointmentsListCache(userId);
      if (cached !== undefined) {
        applyRows(cached);
        setLoading(false);
      }
      const task = InteractionManager.runAfterInteractions(() => {
        void load();
      });
      return () => task.cancel();
    }, [applyRows, load, userId]),
  );

  return { appointments, loading, load };
}
