import React from "react";
import { Pressable, View, Text, StyleSheet } from "react-native";
import { ScrollView } from "../lib/scrollViews";
import { useNavigation } from "@react-navigation/native";
import { useFlareColors } from "../theme";
import { SPACING, TYPOGRAPHY } from "../designTokens";
import { FLARE_FONT_SIZE } from "../lib/layoutConstants";
import { confirmLogOut } from "../components/HeaderOverflowMenu";
import { Card } from "../components/MidnightLagoonCard";
import { TrayRow } from "../components/MidnightLagoonTray";
import { ScreenHeader } from "../components/MidnightLagoonScreenHeader";
import { FLARE_CHROME_LUCIDE } from "../lib/flareLucideIcons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type MeUser = {
  id: string;
  email?: string | null;
  displayName?: string | null;
};

type MeScreenProps = {
  user: MeUser;
  onLogout: () => void | Promise<void>;
};

export function MeScreen({ user, onLogout }: MeScreenProps) {
  const navigation = useNavigation<any>();
  const colors = useFlareColors();
  const insets = useSafeAreaInsets();

  const userName = (user.displayName ?? "").trim().split(/\s+/)[0] || "User";
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
        <ScreenHeader title="Profile" />

        <Card style={{ marginBottom: SPACING.xl }}>
          <View style={styles.profileRow}>
            <View style={[styles.profileAvatar, { backgroundColor: colors.surfaceSubtle }]}>
              <Text style={[styles.profileInitial, { color: colors.primary, fontFamily: TYPOGRAPHY.fontFamily.bold }]}>
                {userName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.profileText}>
              <Text style={[styles.profileName, { color: colors.text, fontFamily: TYPOGRAPHY.fontFamily.semibold }]}>
                {userName}
              </Text>
              {userEmail ? (
                <Text style={[styles.profileEmail, { color: colors.textSecondary, fontFamily: TYPOGRAPHY.fontFamily.regular }]}>
                  {userEmail}
                </Text>
              ) : null}
            </View>
          </View>
        </Card>

        <Card noPadding style={{ paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md }}>
          <TrayRow
            icon={FLARE_CHROME_LUCIDE.person}
            label="Personal details"
            showChevron
            bareIcon
            onPress={() => navigation.navigate("AccountPersonalDetails")}
          />
          <TrayRow
            icon={FLARE_CHROME_LUCIDE.info}
            label="Information"
            showChevron
            bareIcon
            onPress={() => navigation.navigate("AccountInfo")}
          />
          <TrayRow
            icon={FLARE_CHROME_LUCIDE.shield}
            label="Security"
            showChevron
            bareIcon
            onPress={() => navigation.navigate("AccountSecurity")}
          />
          <TrayRow
            icon={FLARE_CHROME_LUCIDE.card}
            label="Legal"
            showChevron
            bareIcon
            onPress={() => navigation.navigate("AccountLegal")}
          />
          <TrayRow
            icon={FLARE_CHROME_LUCIDE.help}
            label="Help"
            showChevron
            bareIcon
            onPress={() => navigation.navigate("AccountHelp")}
          />
        </Card>

        <View style={styles.logoutRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Log out"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            onPress={() => confirmLogOut(onLogout)}
          >
            <Text style={[styles.logoutLabel, { color: colors.text }]}>Log out</Text>
          </Pressable>
        </View>
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
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.card,
  },
  profileAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  profileInitial: {
    fontSize: TYPOGRAPHY.fontSize.screenTitle,
  },
  profileText: {
    flex: 1,
    minWidth: 0,
  },
  profileName: {
    fontSize: TYPOGRAPHY.fontSize.cardTitle,
  },
  profileEmail: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    marginTop: SPACING.xs,
  },
  logoutRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: SPACING.xl,
  },
  logoutLabel: {
    fontFamily: TYPOGRAPHY.fontFamily.regular,
    fontSize: FLARE_FONT_SIZE.navTitle,
  },
});
