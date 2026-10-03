import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { ScrollView } from "../lib/scrollViews";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useFlareColors } from "../theme";
import { SPACING, RADIUS, TYPOGRAPHY, OPACITY } from "../designTokens";
import { Card } from "../components/MidnightLagoonCard";
import { TrayRow } from "../components/MidnightLagoonTray";
import { ScreenHeader } from "../components/MidnightLagoonScreenHeader";
import { SectionLabel } from "../components/MidnightLagoonSectionLabel";
import { FLARE_FEATURE_LUCIDE, FLARE_CHROME_LUCIDE } from "../lib/flareLucideIcons";
import type { SessionUser } from "../lib/supabase";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type CareScreenProps = {
  user: SessionUser;
};

export function CareScreen({ user }: CareScreenProps) {
  const navigation = useNavigation<any>();
  const colors = useFlareColors();
  const insets = useSafeAreaInsets();
  const navyBlend = "#0D234B";

  return (
    <View style={[styles.screen, { backgroundColor: colors.screen }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 100 },
        ]}
      >
        <ScreenHeader title="Care" />

        <LinearGradient
          colors={[colors.primary, navyBlend]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.appointmentHero}
        >
          <Text style={[styles.heroLabel, { fontFamily: TYPOGRAPHY.fontFamily.semibold }]}>
            NEXT APPOINTMENT
          </Text>
          <Text style={[styles.heroTitle, { fontFamily: TYPOGRAPHY.fontFamily.semibold }]}>
            Tue 13 Oct · 10:30 am
          </Text>
          <Text style={[styles.heroSubtitle, { fontFamily: TYPOGRAPHY.fontFamily.regular }]}>
            IBD clinic, St Thomas'
          </Text>
          <View style={styles.heroActions}>
            <View style={[styles.heroButton, { backgroundColor: `rgba(255, 255, 255, ${OPACITY.heroButton})` }]}>
              <Text style={[styles.heroButtonText, { fontFamily: TYPOGRAPHY.fontFamily.semibold }]}>
                3 questions
              </Text>
            </View>
            <View style={[styles.heroButton, { backgroundColor: `rgba(255, 255, 255, ${OPACITY.heroButton})` }]}>
              <Text style={[styles.heroButtonText, { fontFamily: TYPOGRAPHY.fontFamily.semibold }]}>
                Make summary
              </Text>
            </View>
          </View>
        </LinearGradient>

        <SectionLabel>Clinic</SectionLabel>

        <Card noPadding style={{ paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md }}>
          <TrayRow
            icon={FLARE_CHROME_LUCIDE.calendar}
            label="Appointments"
            sublabel="1 upcoming"
            showChevron
            onPress={() => navigation.navigate("Appointments")}
          />
          <TrayRow
            icon={FLARE_CHROME_LUCIDE.help}
            label="Questions for my doctor"
            sublabel="3 saved"
            showChevron
            onPress={() => navigation.navigate("Appointments")}
          />
          <TrayRow
            icon={FLARE_FEATURE_LUCIDE.reports}
            label="Reports"
            sublabel="Share or email"
            showChevron
            onPress={() => navigation.navigate("Reports")}
          />
        </Card>

        <SectionLabel>Supplies</SectionLabel>

        <Card noPadding style={{ paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md }}>
          <TrayRow
            icon={FLARE_FEATURE_LUCIDE.supplies}
            label="Stoma bags"
            sublabel="Every 4 weeks"
            value="Due today"
            valueColor={colors.accent}
            onPress={() => navigation.navigate("MedicalSupplies")}
          />
          <TrayRow
            icon={FLARE_FEATURE_LUCIDE.supplies}
            label="Dressings"
            sublabel="Every 2 weeks"
            value="In 9 days"
            onPress={() => navigation.navigate("MedicalSupplies")}
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
  appointmentHero: {
    borderRadius: RADIUS.hero,
    padding: SPACING.lg,
    marginVertical: SPACING.card,
  },
  heroLabel: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: "rgba(255, 255, 255, 0.8)",
    letterSpacing: TYPOGRAPHY.letterSpacing.section,
    marginBottom: SPACING.xs,
  },
  heroTitle: {
    fontSize: TYPOGRAPHY.fontSize.stat,
    color: "#ffffff",
    marginBottom: 2,
  },
  heroSubtitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: "rgba(255, 255, 255, 0.85)",
    marginBottom: SPACING.md,
  },
  heroActions: {
    flexDirection: "row",
    gap: SPACING.sm,
  },
  heroButton: {
    borderRadius: RADIUS.heroButton,
    paddingVertical: 7,
    paddingHorizontal: SPACING.md,
  },
  heroButtonText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: "#ffffff",
  },
});
