import { useNavigation } from "@react-navigation/native";
import React, { useCallback, useMemo } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { AppointmentBriefScrollScreen } from "../components/AppointmentBriefScrollScreen";
import {
  buildBrowseLogRowItem,
  LogHistoryCard,
  LogHistoryList,
} from "../components/LogHistoryList";
import { BRIEF_WEEK_PRESETS } from "../lib/appointmentBriefShared";
import { ACCOUNT_LIST_ROW_PADDING, FLARE_FONT_FAMILY, FLARE_FONT_SIZE } from "../lib/layoutConstants";
import { useFlareColors } from "../theme";

type SessionUser = { id: string };

export function AppointmentBriefScreen({ user: _user }: { user: SessionUser }) {
  const c = useFlareColors();
  const navigation = useNavigation<any>();

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
        title: "Custom date range",
        subtitle: "Pick your own start and end dates",
        accessibilityLabel: "Custom date range",
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
    <AppointmentBriefScrollScreen
      tip="Use a preset to quickly generate a health summary for your appointment."
      afterTip={
        <Pressable
          accessibilityRole="link"
          accessibilityLabel="Need help with appointment summary"
          onPress={() => navigation.navigate("AccountHelp", { expandSection: "appointmentSummary" })}
          style={({ pressed }) => [styles.needHelpLink, pressed && { opacity: 0.7 }]}
        >
          <Text style={[styles.needHelpLinkLabel, { color: c.text }]}>Need help?</Text>
        </Pressable>
      }
    >
      <LogHistoryCard>
        <LogHistoryList items={items} onPressItem={onPressItem} rowPaddingHorizontal={ACCOUNT_LIST_ROW_PADDING} />
      </LogHistoryCard>
    </AppointmentBriefScrollScreen>
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
