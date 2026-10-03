import React, { useState, useCallback, useEffect, useMemo } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { ScrollView } from "../lib/scrollViews";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useFlareColors } from "../theme";
import { SPACING, TYPOGRAPHY, RADIUS, OPACITY } from "../designTokens";
import { Card } from "../components/MidnightLagoonCard";
import { HeroCard } from "../components/MidnightLagoonHeroCard";
import { StatRing } from "../components/MidnightLagoonStatRing";
import { TrayRow } from "../components/MidnightLagoonTray";
import { ScreenHeader } from "../components/MidnightLagoonScreenHeader";
import { SectionLabel } from "../components/MidnightLagoonSectionLabel";
import { supabase, TABLES } from "../lib/supabase";
import { todayYmd } from "../lib/bowelMovementShared";
import { fetchMedicationsForUser } from "../lib/medicationShared";
import { formatUkGreetingDate } from "../lib/formatUkDate";
import type { SessionUser } from "../lib/supabase";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type TodayScreenProps = {
  user: SessionUser;
};

const HYDRATION_TARGET = 6;

export function TodayScreen({ user }: TodayScreenProps) {
  const navigation = useNavigation<any>();
  const colors = useFlareColors();
  const insets = useSafeAreaInsets();

  const [userName, setUserName] = useState("there");
  const [todayDate, setTodayDate] = useState("");
  const [medsTaken, setMedsTaken] = useState(0);
  const [medsTotal, setMedsTotal] = useState(2);
  const [hydration, setHydration] = useState(0);
  const [bowelCount, setBowelCount] = useState(0);

  useEffect(() => {
    const name = user.user_metadata?.first_name?.trim();
    setUserName(name || "there");
    setTodayDate(formatUkGreetingDate(new Date()));
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      const today = todayYmd();

      void (async () => {
        try {
          const [medsListRes, takenMedsRes, hydrationRes, bowelRes] = await Promise.all([
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
            supabase
              .from(TABLES.DAILY_BOWEL)
              .select("id")
              .eq("user_id", user.id)
              .gte("created_at", `${today}T00:00:00`),
          ]);

          if (cancelled) return;

          const activeMeds = medsListRes.filter((m) => !m.paused && !m.archived);
          const takenSet = new Set((takenMedsRes.data ?? []).map((r) => r.medication_id));
          const taken = activeMeds.filter((m) => takenSet.has(m.id)).length;

          setMedsTotal(activeMeds.length);
          setMedsTaken(taken);
          setHydration(hydrationRes.data?.glasses ?? 0);
          setBowelCount(bowelRes.data?.length ?? 0);
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
    (mood: number) => {
      navigation.navigate("SymptomLogWizard");
    },
    [navigation],
  );

  const moodFaces = ["😣", "😕", "😐", "🙂", "😄"];

  return (
    <View style={[styles.screen, { backgroundColor: colors.screen }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 100 },
        ]}
      >
        <ScreenHeader
          title={`Hi ${userName}`}
          subtitle={todayDate}
        />

        <HeroCard title="How are you feeling today?" subtitle="One tap to check in. Add details if you want.">
          <View style={styles.moodFaces}>
            {moodFaces.map((face, index) => (
              <Pressable
                key={index}
                onPress={() => handleMoodPress(index)}
                style={[
                  styles.moodFace,
                  { backgroundColor: `rgba(255, 255, 255, ${OPACITY.heroMood})` },
                ]}
              >
                <Text style={styles.moodEmoji}>{face}</Text>
              </Pressable>
            ))}
          </View>
        </HeroCard>

        <View style={styles.statRings}>
          <StatRing value={`${medsTaken}/${medsTotal}`} label="Meds" progress={medsTotal > 0 ? medsTaken / medsTotal : 0} />
          <StatRing value={`${hydration}/${HYDRATION_TARGET}`} label="Cups" progress={hydration / HYDRATION_TARGET} />
          <StatRing value={`${bowelCount}`} label="BMs" progress={bowelCount > 0 ? Math.min(1, bowelCount / 3) : 0} />
        </View>

        <SectionLabel>Still to do</SectionLabel>

        <Card noPadding style={{ paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md }}>
          <TrayRow
            label="Take Mesalazine"
            value="8:00 am"
            onPress={() => navigation.navigate("Meds")}
          />
          <TrayRow
            label="Order stoma bags"
            value="Due today"
            valueColor={colors.accent}
            onPress={() => navigation.navigate("MedicalSupplies")}
          />
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
  screen: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.screen,
    paddingTop: 56,
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
  statRings: {
    flexDirection: "row",
    gap: SPACING.sm,
  },
});
