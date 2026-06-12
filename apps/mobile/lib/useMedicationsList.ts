import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useRef, useState } from "react";
import { InteractionManager } from "react-native";
import {
  fetchMedicationsForUser,
  getMedicationsListCache,
  medicationsListCacheKey,
  type MedicationRow,
} from "./medicationShared";

export function useMedicationsList(userId: string) {
  const [meds, setMeds] = useState<MedicationRow[]>(() => getMedicationsListCache(userId) ?? []);
  const medsListKeyRef = useRef(medicationsListCacheKey(meds));
  const [loading, setLoading] = useState(false);

  const applyMeds = useCallback((rows: MedicationRow[]) => {
    const nextKey = medicationsListCacheKey(rows);
    if (nextKey === medsListKeyRef.current) return;
    medsListKeyRef.current = nextKey;
    setMeds(rows);
  }, []);

  const load = useCallback(async () => {
    const hasCache = getMedicationsListCache(userId) !== undefined;
    if (!hasCache) setLoading(true);
    try {
      const rows = await fetchMedicationsForUser(userId);
      applyMeds(rows);
      return rows;
    } catch (err) {
      console.error("Error loading medications:", err);
      applyMeds([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, [applyMeds, userId]);

  useFocusEffect(
    useCallback(() => {
      const cached = getMedicationsListCache(userId);
      if (cached !== undefined) {
        applyMeds(cached);
        setLoading(false);
      }
      const task = InteractionManager.runAfterInteractions(() => {
        void load();
      });
      return () => task.cancel();
    }, [applyMeds, load, userId]),
  );

  return { meds, loading, load };
}
