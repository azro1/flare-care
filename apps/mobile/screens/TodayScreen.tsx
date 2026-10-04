import React, { useState, useCallback } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { ScrollView } from "../lib/scrollViews";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useFlareColors } from "../theme";
import { SPACING, OPACITY, DIMENSIONS } from "../designTokens";
import { Card } from "../components/MidnightLagoonCard";
import { HeroCard } from "../components/MidnightLagoonHeroCard";
import { FillStatTile } from "../components/MidnightLagoonWeekHeatTile";
import { TrayRow } from "../components/MidnightLagoonTray";
import { ScreenHeader } from "../components/MidnightLagoonScreenHeader";
import { SectionLabel } from "../components/MidnightLagoonSectionLabel";
import { supabase, TABLES } from "../lib/supabase";
import { todayYmd } from "../lib/bowelMovementShared";
import {
  fetchMedicationsForUser,
  formatMedicationReminderTime,
  nextReminderMedication,
  type MedicationRow,
} from "../lib/medicationShared";
import { HYDRATION_TARGET } from "../lib/hydrationShared";
import {
  fetchKitListEntries,
  nextDueSupplyKit,
  supplyDueListLabel,
  type KitListEntry,
} from "../lib/medicalSuppliesShared";
import { getTodayWellbeingEntry, type WellbeingScale } from "../lib/wellbeingShared";
import { formatUkGreetingDate } from "../lib/formatUkDate";
import type { SessionUser } from "../lib/supabase";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type TodayScreenProps = {
  user: SessionUser;
};

export function TodayScreen({ user }: TodayScreenProps) {
  const navigation = useNavigation<any>();
  const colors = useFlareColors();
  const insets = useSafeAreaInsets();

  const userName = (user.displayName ?? "").trim().split(/\s+/)[0] || "there";
  const todayDate = formatUkGreetingDate(new Date());
  const [medsTaken, setMedsTaken] = useState(0);
  const [medsTotal, setMedsTotal] = useState(0);
  const [hydration, setHydration] = useState(0);
  const [checkedIn, setCheckedIn] = useState(false);
  const [nextMed, setNextMed] = useState<MedicationRow | null>(null);
  const [nextSupply, setNextSupply] = useState<KitListEntry | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      const today = todayYmd();

      void (async () => {
        try {
          const [medsListRes, takenMedsRes, hydrationRes, wellbeingToday, supplyEntries] = await Promise.all([
            fetchMedicationsForUser(user.id),
            supabase
              .from(TABLES.MEDICATION_TAKEN)
              .select("medication_id")
              .eq("user_id", user.id)
              .eq("taken_date", today),
            supabase
              .from(TABLES.DAILY_HYDRATION)
              .select("glasses")
              .eq("user_id", user.id)
              .eq("date", today)
              .maybeSingle(),
            getTodayWellbeingEntry(user.id, today),
            fetchKitListEntries(user.id),
          ]);

          if (cancelled) return;
          if (takenMedsRes.error) throw takenMedsRes.error;
          if (hydrationRes.error) throw hydrationRes.error;

          const activeMeds = medsListRes.filter((m) => !m.paused && !m.archived);
          const takenSet = new Set((takenMedsRes.data ?? []).map((row) => String(row.medication_id)));
          const taken = activeMeds.filter((med) => takenSet.has(String(med.id))).length;

          setMedsTotal(activeMeds.length);
          setMedsTaken(taken);
          setHydration(hydrationRes.data?.glasses ?? 0);
          setCheckedIn(wellbeingToday != null);
          setNextMed(nextReminderMedication(activeMeds, takenSet));
          setNextSupply(nextDueSupplyKit(supplyEntries));
        } catch (error) {
          console.error("TodayScreen data fetch failed:", error);
        }
      })();

      return () => {
        cancelled = true;
      };
    }, [user.id]),
  );

  const handleMoodPress = useCallback(
    (index: number) => {
      const mood = (index + 1) as WellbeingScale;
      navigation.navigate("WellbeingWizard", { mood });
    },
    [navigation],
  );

  const moodFaces = ["😣", "😕", "😐", "🙂", "😄"];
  const medsRatio = medsTotal > 0 ? medsTaken / medsTotal : 0;
  const hydrationRatio = HYDRATION_TARGET > 0 ? hydration / HYDRATION_TARGET : 0;

  return (
    <View style={[styles.screen, { backgroundColor: colors.screen }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 100 },
        ]}
      >
        <ScreenHeader title={`Hi, ${userName}`} subtitle={todayDate} />

        <HeroCard
          title="How are you feeling today?"
          subtitle={checkedIn ? "Checked in today." : "One tap to check in. Add details if you want."}
          style={styles.hero}
        >
          <View style={styles.moodFaces}>
            {moodFaces.map((face, index) => (
              <Pressable
                key={index}
                onPress={() => handleMoodPress(index)}
                accessibilityRole="button"
                style={[styles.moodFace, { backgroundColor: `rgba(255, 255, 255, ${OPACITY.heroMood})` }]}
              >
                <Text style={styles.moodEmoji}>{face}</Text>
              </Pressable>
            ))}
          </View>
        </HeroCard>

        <View style={styles.statRings}>
          <FillStatTile
            label="My meds"
            value={String(medsTaken)}
            total={String(medsTotal)}
            caption="taken today"
            ratio={medsRatio}
            hue={colors.primary}
          />
          <FillStatTile
            label="My hydration"
            value={String(hydration)}
            total={String(HYDRATION_TARGET)}
            caption="cups today"
            ratio={hydrationRatio}
            hue={colors.hydration}
          />
        </View>

        <SectionLabel style={{ marginTop: 0 }}>Still to do</SectionLabel>

        <Card noPadding style={{ paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md }}>
          {nextMed ? (
            <TrayRow
              label={`Take ${nextMed.name}`}
              value={formatMedicationReminderTime(nextMed.time_of_day)}
              onPress={() => navigation.navigate("MedicationDetail", { medicationId: nextMed.id })}
            />
          ) : null}
          {nextSupply ? (
            <TrayRow
              label={nextSupply.kit.name}
              value={supplyDueListLabel(nextSupply.kit, nextSupply.itemCount)}
              valueColor={nextSupply.status === "overdue" ? colors.danger : colors.accent}
              onPress={() =>
                navigation.navigate("MedicalSupplyOrder", {
                  kitId: nextSupply.kit.id,
                  orderName: nextSupply.kit.name,
                })
              }
            />
          ) : null}
          <TrayRow
            label="Clinic tomorrow"
            value="10:30 am"
            onPress={() => navigation.navigate("Appointments")}
          />
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    marginBottom: SPACING.screen,
  },
  statRings: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: DIMENSIONS.statTileGap,
    marginBottom: SPACING.screen,
  },
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
  moodFaces: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: SPACING.sm,
  },
  moodFace: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  moodEmoji: {
    fontSize: 24,
  },
});
