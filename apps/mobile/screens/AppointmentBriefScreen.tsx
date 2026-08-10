import { useNavigation } from "@react-navigation/native";
import React, { useCallback, useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { InstructionScreenShell } from "../components/InstructionScreenShell";
import {
  buildBrowseLogRowItem,
  LogHistoryCard,
  LogHistoryList,
} from "../components/LogHistoryList";
import { BRIEF_WEEK_PRESETS } from "../lib/appointmentBriefShared";
import { ACCOUNT_LIST_ROW_PADDING, FLARE_CAPTION_HINT } from "../lib/layoutConstants";
import { useFlareColors } from "../theme";

type SessionUser = { id: string };

export function AppointmentBriefScreen({ user }: { user: SessionUser }) {
  const c = useFlareColors();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const contentPaddingBottom = Math.max(insets.bottom, 16) + 24;

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
      showInstruction={false}
      contentPaddingBottom={contentPaddingBottom}
      instruction={null}
    >
      <LogHistoryCard>
        <LogHistoryList items={items} onPressItem={onPressItem} rowPaddingHorizontal={ACCOUNT_LIST_ROW_PADDING} />
      </LogHistoryCard>
      <View style={styles.needHelpBlock}>
        <Text style={[styles.needHelpHint, { color: c.textMuted }]}>
          Choose a suggested time period or select your own dates to include the information you need.
        </Text>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel="Still need help with appointment summary"
          onPress={() => navigation.navigate("AccountHelp", { expandSection: "appointmentSummary" })}
          style={({ pressed }) => [styles.needHelpLink, pressed && { opacity: 0.7 }]}
        >
          <Text style={[styles.needHelpLinkLabel, { color: c.text }]}>Still need help?</Text>
        </Pressable>
      </View>
    </InstructionScreenShell>
  );
}

const styles = StyleSheet.create({
  needHelpBlock: {
    alignItems: "center",
    marginTop: 12,
    paddingHorizontal: 24,
  },
  needHelpHint: {
    ...FLARE_CAPTION_HINT,
    textAlign: "center",
  },
  needHelpLink: {
    alignSelf: "center",
    marginTop: 8,
    paddingVertical: 6,
  },
  needHelpLinkLabel: {
    ...FLARE_CAPTION_HINT,
    textDecorationLine: "underline",
  },
});
