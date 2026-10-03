import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { ScrollView } from "../lib/scrollViews";
import { useNavigation } from "@react-navigation/native";
import { useFlareColors } from "../theme";
import { SPACING, TYPOGRAPHY } from "../designTokens";
import { Card } from "../components/MidnightLagoonCard";
import { TrayRow } from "../components/MidnightLagoonTray";
import { SectionLabel } from "../components/MidnightLagoonSectionLabel";
import { FLARE_CHROME_LUCIDE, FLARE_FEATURE_LUCIDE } from "../lib/flareLucideIcons";
import type { SessionUser } from "../lib/supabase";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type MeScreenProps = {
  user: SessionUser;
  onLogout: () => void;
};

export function MeScreen({ user, onLogout }: MeScreenProps) {
  const navigation = useNavigation<any>();
  const colors = useFlareColors();
  const insets = useSafeAreaInsets();

  const userName = user.user_metadata?.first_name?.trim() || "User";
  const userEmail = user.email || "";

  return (
    <View style={[styles.screen, { backgroundColor: colors.screen }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 100 },
        ]}
      >
        <View style={styles.profileHeader}>
          <View style={[styles.profileAvatar, { backgroundColor: colors.primary }]}>
            <Text style={[styles.profileInitial, { fontFamily: TYPOGRAPHY.fontFamily.bold }]}>
              {userName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={[styles.profileName, { color: colors.text, fontFamily: TYPOGRAPHY.fontFamily.semibold }]}>
            {userName}
          </Text>
          <Text style={[styles.profileEmail, { color: colors.textSecondary, fontFamily: TYPOGRAPHY.fontFamily.regular }]}>
            {userEmail}
          </Text>
        </View>

        <Card noPadding style={{ paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md }}>
          <TrayRow
            icon={FLARE_CHROME_LUCIDE.card}
            label="My IBD Card"
            showChevron
            onPress={() => navigation.navigate("MyCard")}
          />
        </Card>

        <SectionLabel>Out & About</SectionLabel>

        <Card noPadding style={{ paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md }}>
          <TrayRow
            icon={FLARE_CHROME_LUCIDE.mapPin}
            label="Find a Toilet"
            showChevron
            onPress={() => navigation.navigate("FindToilet")}
          />
          <TrayRow
            icon={FLARE_FEATURE_LUCIDE.goingOut}
            label="Going Out"
            showChevron
            onPress={() => navigation.navigate("GoingOut")}
          />
        </Card>

        <SectionLabel>Guides</SectionLabel>

        <Card noPadding style={{ paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md }}>
          <TrayRow
            icon={FLARE_CHROME_LUCIDE.info}
            label="What is IBD?"
            showChevron
            onPress={() => navigation.navigate("Ibd")}
          />
          <TrayRow
            icon={FLARE_FEATURE_LUCIDE.intake}
            label="Nutrition"
            showChevron
            onPress={() => navigation.navigate("NutritionGuide")}
          />
          <TrayRow
            icon={FLARE_CHROME_LUCIDE.briefcase}
            label="IBD at work"
            showChevron
            onPress={() => navigation.navigate("IbdAtWork")}
          />
        </Card>

        <SectionLabel>Settings</SectionLabel>

        <Card noPadding style={{ paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md }}>
          <TrayRow
            icon={FLARE_CHROME_LUCIDE.settings}
            label="Settings"
            showChevron
            onPress={() => navigation.navigate("Settings")}
          />
          <TrayRow
            icon={FLARE_CHROME_LUCIDE.bell}
            label="Reminders"
            showChevron
            onPress={() => navigation.navigate("Reminders")}
          />
          <TrayRow
            icon={FLARE_CHROME_LUCIDE.help}
            label="Help"
            showChevron
            onPress={() => navigation.navigate("AccountHelp")}
          />
          <TrayRow
            icon={FLARE_CHROME_LUCIDE.info}
            label="About"
            showChevron
            onPress={() => navigation.navigate("About")}
          />
          <TrayRow
            icon={FLARE_CHROME_LUCIDE.shield}
            label="Legal"
            showChevron
            onPress={() => navigation.navigate("AccountLegal")}
          />
        </Card>

        <Card noPadding style={{ paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md }}>
          <TrayRow
            icon={FLARE_CHROME_LUCIDE.logOut}
            label="Sign out"
            onPress={onLogout}
          />
        </Card>

        <Card noPadding style={{ paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md }}>
          <TrayRow
            label="Delete account"
            onPress={() => navigation.navigate("Account")}
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
  profileHeader: {
    alignItems: "center",
    marginBottom: SPACING.xl,
  },
  profileAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.md,
  },
  profileInitial: {
    fontSize: 32,
    color: "#ffffff",
  },
  profileName: {
    fontSize: TYPOGRAPHY.fontSize.cardTitle,
    marginBottom: SPACING.xs,
  },
  profileEmail: {
    fontSize: TYPOGRAPHY.fontSize.sm,
  },
});
