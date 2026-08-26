import { useNavigation, useRoute } from "@react-navigation/native";
import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Share, StyleSheet, Text, View } from "react-native";
import { PrimaryButton, SecondaryButton } from "../components/FlareButton";
import { flareCardSectionStyles, FlareScreenSectionTitle } from "../components/FlareScreenSectionTitle";
import { AppointmentBriefScrollScreen } from "../components/AppointmentBriefScrollScreen";
import { flareFieldErrorStyle } from "../components/FlareInput";
import {
  buildBrowseLogRowItem,
  LogHistoryCard,
  LogHistoryList,
} from "../components/LogHistoryList";
import {
  formatAppointmentBriefText,
  formatBriefPeriodChoiceLabel,
  type AppointmentBriefRouteParams,
} from "../lib/appointmentBriefShared";
import { formatUkDate } from "../lib/formatUkDate";
import { withAppLockExternalUi } from "../lib/biometricLock";
import { useAppointmentBrief } from "../lib/useAppointmentBrief";
import { ACCOUNT_LIST_ROW_PADDING, FLARE_FONT_FAMILY, FLARE_FONT_SIZE, FLARE_LINE_HEIGHT } from "../lib/layoutConstants";
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
      buildBrowseLogRowItem({
        id: "health",
        title: "Health Overview",
        subtitle: "Symptoms, bowel, weight, medications",
        accessibilityLabel: "Health Overview",
      }),
      buildBrowseLogRowItem({
        id: "next",
        title: "Next Appointment",
        subtitle: nextSubtitle,
        accessibilityLabel: "Next Appointment",
      }),
      buildBrowseLogRowItem({
        id: "changes",
        title: "What Changed",
        subtitle: `${brief.talkingPoints.length} talking point${brief.talkingPoints.length === 1 ? "" : "s"}`,
        accessibilityLabel: "What Changed",
      }),
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
            <Text style={[styles.muted, { color: c.textMuted }]}>Building summary…</Text>
          </View>
        ) : error ? (
          <Text style={errTextStyle}>{error}</Text>
        ) : brief ? (
          <>
            <LogHistoryCard style={[flareCardSectionStyles.container, styles.summaryCard]}>
              {[
                <View key="period" style={styles.periodHeader}>
                  <FlareScreenSectionTitle inCard>{periodChoiceLabel}</FlareScreenSectionTitle>
                  {customDateRange ? (
                    <Text style={[styles.customDateRange, { color: c.textMuted }]}>{customDateRange}</Text>
                  ) : null}
                </View>,
                <LogHistoryList
                  key="nav"
                  items={navItems}
                  onPressItem={onPressNavItem}
                  rowPaddingHorizontal={ACCOUNT_LIST_ROW_PADDING}
                />,
              ]}
            </LogHistoryCard>
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
  summaryCard: { marginBottom: 0 },
  periodHeader: { gap: 4 },
  customDateRange: {
    fontSize: FLARE_FONT_SIZE.caption,
    fontFamily: FLARE_FONT_FAMILY.regular,
    lineHeight: FLARE_LINE_HEIGHT.caption,
  },
  loadingWrap: { alignItems: "center", paddingVertical: 32, gap: 12 },
  muted: { fontSize: FLARE_FONT_SIZE.body, fontFamily: FLARE_FONT_FAMILY.regular },
  actionRow: { flexDirection: "row", gap: 8, marginTop: 16 },
  actionSlot: { flex: 1, minWidth: 0 },
});
