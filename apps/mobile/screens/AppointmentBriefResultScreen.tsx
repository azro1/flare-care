import { useNavigation, useRoute } from "@react-navigation/native";
import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Share, StyleSheet, Text, View } from "react-native";
import { PrimaryButton, SecondaryButton } from "../components/FlareButton";
import { SectionLabel } from "../components/MidnightLagoonSectionLabel";
import { Card } from "../components/MidnightLagoonCard";
import { TrayRow } from "../components/MidnightLagoonTray";
import { AppointmentBriefScrollScreen } from "../components/AppointmentBriefScrollScreen";
import { flareFieldErrorStyle } from "../components/FlareInput";
import {
  formatAppointmentBriefText,
  formatBriefPeriodChoiceLabel,
  type AppointmentBriefRouteParams,
} from "../lib/appointmentBriefShared";
import { formatUkDate } from "../lib/formatUkDate";
import { withAppLockExternalUi } from "../lib/biometricLock";
import { useAppointmentBrief } from "../lib/useAppointmentBrief";
import { SPACING, TYPOGRAPHY } from "../designTokens";
import { useFlareColors } from "../theme";
import { AppointmentBriefEmailSheet } from "./AppointmentBriefEmailSheet";

type SessionUser = { id: string };

export function AppointmentBriefResultScreen({ user }: { user: SessionUser }) {
  const c = useFlareColors();
  const navigation = useNavigation<any>();
  const errTextStyle = flareFieldErrorStyle(c, "input");
  const route = useRoute<any>();
  const params = route.params as AppointmentBriefRouteParams;
  const { brief, weeks, loading, error } = useAppointmentBrief(user.id, params);
  const [emailOpen, setEmailOpen] = useState(false);

  const briefText = useMemo(() => (brief ? formatAppointmentBriefText(brief, weeks) : ""), [brief, weeks]);

  const handleShare = async () => {
    if (!briefText) return;
    try {
      await withAppLockExternalUi(() =>
        Share.share({ message: briefText, title: `Appointment Summary (${weeks} weeks)` }),
      );
    } catch {
      // user cancelled
    }
  };

  const periodChoiceLabel = formatBriefPeriodChoiceLabel(params);
  const customDateRange =
    params.mode === "custom" && brief
      ? `${formatUkDate(brief.period.start)} – ${formatUkDate(brief.period.end)}`
      : null;

  const nextSubtitle = brief?.nextAppointment
    ? [formatUkDate(brief.nextAppointment.date), brief.nextAppointment.type?.trim()].filter(Boolean).join(" · ")
    : "No upcoming appointment";

  const navItems = useMemo(() => {
    if (!brief) return [];
    return [
      {
        id: "health",
        title: "Health Overview",
        subtitle: "Symptoms, bowel, weight, medications",
        accessibilityLabel: "Health Overview",
      },
      {
        id: "next",
        title: "Next Appointment",
        subtitle: nextSubtitle,
        accessibilityLabel: "Next Appointment",
      },
      {
        id: "changes",
        title: "What Changed",
        subtitle: `${brief.talkingPoints.length} talking point${brief.talkingPoints.length === 1 ? "" : "s"}`,
        accessibilityLabel: "What Changed",
      },
    ];
  }, [brief, nextSubtitle]);

  const onPressNavItem = useCallback(
    (id: string) => {
      if (id === "health") navigation.navigate("AppointmentBriefHealth", params);
      else if (id === "next") navigation.navigate("AppointmentBriefNext", params);
      else if (id === "changes") navigation.navigate("AppointmentBriefChanges", params);
    },
    [navigation, params],
  );

  return (
    <>
      <AppointmentBriefScrollScreen>
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={c.primary} />
            <Text style={[styles.muted, { color: c.textMuted, fontFamily: TYPOGRAPHY.fontFamily.regular }]}>Building summary…</Text>
          </View>
        ) : error ? (
          <Text style={errTextStyle}>{error}</Text>
        ) : brief ? (
          <>
            <View style={styles.periodHeader}>
              <SectionLabel text={periodChoiceLabel} />
              {customDateRange ? (
                <Text style={[styles.customDateRange, { color: c.textSecondary, fontFamily: TYPOGRAPHY.fontFamily.regular }]}>{customDateRange}</Text>
              ) : null}
            </View>

            <Card noPadding style={{ paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md }}>
              {navItems.map((item, index) => (
                <TrayRow
                  key={item.id}
                  label={item.title}
                  value={item.subtitle}
                  onPress={() => onPressNavItem(item.id)}
                  isFirst={index === 0}
                  isLast={index === navItems.length - 1}
                />
              ))}
            </Card>

            <View style={styles.actionRow}>
              <View style={styles.actionSlot}>
                <PrimaryButton title="Share" onPress={handleShare} noTopMargin />
              </View>
              <View style={styles.actionSlot}>
                <SecondaryButton title="Email" onPress={() => setEmailOpen(true)} noTopMargin />
              </View>
            </View>
          </>
        ) : null}
      </AppointmentBriefScrollScreen>

      <AppointmentBriefEmailSheet visible={emailOpen} brief={brief} briefText={briefText} onClose={() => setEmailOpen(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  periodHeader: {
    gap: SPACING.xs,
  },
  customDateRange: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    paddingHorizontal: SPACING.screen,
  },
  loadingWrap: {
    alignItems: "center",
    paddingVertical: SPACING.xl,
    gap: SPACING.md,
  },
  muted: {
    fontSize: TYPOGRAPHY.fontSize.md,
  },
  actionRow: {
    flexDirection: "row",
    gap: SPACING.sm,
    marginTop: SPACING.lg,
  },
  actionSlot: {
    flex: 1,
    minWidth: 0,
  },
});
