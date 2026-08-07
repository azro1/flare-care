import { useFocusEffect, useNavigation } from "@react-navigation/native";
import React, { useCallback, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FloatingWelcomeCard } from "../components/FloatingWelcomeCard";
import { InstructionScreenShell } from "../components/InstructionScreenShell";
import {
  buildBrowseLogRowItem,
  LogHistoryCard,
  LogHistoryList,
} from "../components/LogHistoryList";
import { APPOINTMENTS_FEATURE_ION_ICON } from "../lib/appointmentShared";
import { BRIEF_WEEK_PRESETS } from "../lib/appointmentBriefShared";
import {
  markAppointmentBriefInstructionDismissed,
  markAppointmentBriefInstructionEligible,
  readAppointmentBriefInstructionDismissed,
} from "../lib/appointmentBriefInstructionTip";
import { APPOINTMENT_BRIEF_INSTRUCTION } from "../lib/instructionCardCopy";
import { ACCOUNT_LIST_ROW_PADDING, FLARE_FONT_FAMILY, FLARE_FONT_SIZE } from "../lib/layoutConstants";
import { useFlareColors } from "../theme";

type SessionUser = { id: string };

export function AppointmentBriefScreen({ user }: { user: SessionUser }) {
  const c = useFlareColors();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const contentPaddingBottom = Math.max(insets.bottom, 16) + 24;

  const [showInstruction, setShowInstruction] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void (async () => {
        await markAppointmentBriefInstructionEligible(user.id);
        const dismissed = await readAppointmentBriefInstructionDismissed(user.id);
        if (!cancelled) setShowInstruction(!dismissed);
      })();
      return () => {
        cancelled = true;
      };
    }, [user.id]),
  );

  const dismissAppointmentBriefInstruction = useCallback(() => {
    setShowInstruction(false);
    void markAppointmentBriefInstructionDismissed(user.id);
  }, [user.id]);

  const items = useMemo(
    () => [
      ...BRIEF_WEEK_PRESETS.map((weeks) =>
        buildBrowseLogRowItem({
          id: `preset-${weeks}`,
          title: `Last ${weeks} weeks`,
          subtitle: "",
          accessibilityLabel: `Last ${weeks} weeks`,
        }),
      ),
      buildBrowseLogRowItem({
        id: "custom",
        title: "Custom Date Range",
        subtitle: "Pick your own start and end dates",
        accessibilityLabel: "Custom Date Range",
      }),
    ],
    [],
  );

  const onPressItem = useCallback(
    (id: string) => {
      if (id === "custom") {
        navigation.navigate("AppointmentBriefCustomRange");
        return;
      }
      const weeks = Number(id.replace("preset-", ""));
      navigation.navigate("AppointmentBriefResult", { mode: "preset", weeks });
    },
    [navigation],
  );

  return (
    <InstructionScreenShell
      showInstruction={showInstruction}
      contentPaddingBottom={contentPaddingBottom}
      instruction={
        <FloatingWelcomeCard
          instruction={APPOINTMENT_BRIEF_INSTRUCTION}
          icon={APPOINTMENTS_FEATURE_ION_ICON}
          iconFamily="ion"
          onDismiss={dismissAppointmentBriefInstruction}
          dismissAccessibilityLabel="Dismiss appointment summary guide"
        />
      }
    >
      <LogHistoryCard>
        <LogHistoryList items={items} onPressItem={onPressItem} rowPaddingHorizontal={ACCOUNT_LIST_ROW_PADDING} />
      </LogHistoryCard>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel="Need help with appointment summary"
        onPress={() => navigation.navigate("AccountHelp", { expandSection: "appointmentSummary" })}
        style={({ pressed }) => [styles.needHelpLink, pressed && { opacity: 0.7 }]}
      >
        <Text style={[styles.needHelpLinkLabel, { color: c.text }]}>Need help?</Text>
      </Pressable>
    </InstructionScreenShell>
  );
}

const styles = StyleSheet.create({
  needHelpLink: {
    alignSelf: "center",
    marginTop: 12,
    paddingVertical: 10,
  },
  needHelpLinkLabel: {
    fontSize: FLARE_FONT_SIZE.body,
    fontFamily: FLARE_FONT_FAMILY.regular,
    textDecorationLine: "underline",
  },
});
