import React, { useCallback, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScrollView } from "../lib/scrollViews";
import { Card } from "../components/MidnightLagoonCard";
import { TrayRow } from "../components/MidnightLagoonTray";
import { SPACING, TYPOGRAPHY } from "../designTokens";
import { FLARE_FEATURE_LUCIDE } from "../lib/flareLucideIcons";
import { formatLogWhenLine } from "../lib/logDisplay";
import { supabase, TABLES } from "../lib/supabase";
import { useFlareColors } from "../theme";
import type { LucideIcon } from "lucide-react-native";

type SessionUser = { id: string };

type HistoryKind = "symptom" | "medication" | "bowel" | "weight";

type HistoryEntry = {
  id: string;
  kind: HistoryKind;
  label: string;
  createdAt: string;
  route: "SymptomDetail" | "MedicationLogDetail" | "BowelLogDetail" | "WeightLogDetail";
  icon: LucideIcon;
};

const KIND_META: Record<HistoryKind, Pick<HistoryEntry, "label" | "route" | "icon">> = {
  symptom: { label: "Symptom Log", route: "SymptomDetail", icon: FLARE_FEATURE_LUCIDE.symptoms },
  medication: { label: "Medication Log", route: "MedicationLogDetail", icon: FLARE_FEATURE_LUCIDE.trackMeds },
  bowel: { label: "Bowel Log", route: "BowelLogDetail", icon: FLARE_FEATURE_LUCIDE.bowel },
  weight: { label: "Weight Log", route: "WeightLogDetail", icon: FLARE_FEATURE_LUCIDE.weight },
};

function rowsToEntries(
  kind: HistoryKind,
  rows: { id: string | number; created_at?: string | null }[] | null,
): HistoryEntry[] {
  const meta = KIND_META[kind];
  return (rows ?? []).map((row) => ({
    id: String(row.id),
    kind,
    label: meta.label,
    createdAt: row.created_at ?? "",
    route: meta.route,
    icon: meta.icon,
  }));
}

export function HistoryScreen({ user }: { user: SessionUser }) {
  const navigation = useNavigation<any>();
  const colors = useFlareColors();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loadError, setLoadError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const [symptomsRes, medicationsRes, bowelRes, weightRes] = await Promise.all([
        supabase
          .from(TABLES.LOG_SYMPTOMS)
          .select("id, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from(TABLES.LOG_MEDICATIONS)
          .select("id, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from(TABLES.BOWEL_MOVEMENTS)
          .select("id, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from(TABLES.TRACK_WEIGHT)
          .select("id, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
      ]);

      const failed = [symptomsRes.error, medicationsRes.error, bowelRes.error, weightRes.error].find(Boolean);
      const next = [
        ...rowsToEntries("symptom", symptomsRes.data),
        ...rowsToEntries("medication", medicationsRes.data),
        ...rowsToEntries("bowel", bowelRes.data),
        ...rowsToEntries("weight", weightRes.data),
      ].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

      setEntries(next);
      setLoadError(failed ? "Could not load every log." : "");
    } catch {
      setEntries([]);
      setLoadError("Could not load logs.");
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  return (
    <View style={[styles.screen, { backgroundColor: colors.screen }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
      >
        {loading && entries.length === 0 ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : entries.length === 0 ? (
          <Card>
            <Text style={[styles.emptyText, { color: colors.textSecondary, fontFamily: TYPOGRAPHY.fontFamily.regular }]}>
              {loadError || "No logs yet."}
            </Text>
          </Card>
        ) : (
          <>
            {loadError ? (
              <Text style={[styles.errorText, { color: colors.textSecondary, fontFamily: TYPOGRAPHY.fontFamily.regular }]}>
                {loadError}
              </Text>
            ) : null}
            <Card noPadding style={styles.listCard}>
              {entries.map((entry) => (
                <TrayRow
                  key={`${entry.kind}-${entry.id}`}
                  icon={entry.icon}
                  label={entry.label}
                  value={formatLogWhenLine(entry.createdAt)}
                  showChevron
                  onPress={() => navigation.navigate(entry.route, { id: entry.id })}
                />
              ))}
            </Card>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.screen,
    paddingTop: SPACING.lg,
  },
  loadingWrap: {
    paddingVertical: SPACING.xl,
    alignItems: "center",
  },
  listCard: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  emptyText: {
    fontSize: TYPOGRAPHY.fontSize.md,
  },
  errorText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    marginBottom: SPACING.sm,
  },
});
