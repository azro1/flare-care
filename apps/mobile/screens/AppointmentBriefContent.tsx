import { useNavigation } from "@react-navigation/native";
import React, { useCallback, useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Card } from "../components/MidnightLagoonCard";
import { TrayRow } from "../components/MidnightLagoonTray";
import { FLARE_FEATURE_LUCIDE } from "../lib/flareLucideIcons";
import { BRIEF_WEEK_PRESETS } from "../lib/appointmentBriefShared";
import { SPACING, TYPOGRAPHY } from "../designTokens";
import { useFlareColors } from "../theme";

export function AppointmentBriefContent() {
  const c = useFlareColors();
  const navigation = useNavigation<any>();

  const items = useMemo(
    () => [
      ...BRIEF_WEEK_PRESETS.map((weeks) => ({
        id: `preset-${weeks}`,
        label: `Last ${weeks} weeks`,
      })),
      {
        id: "custom",
        label: "Custom Date Range",
      },
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
    <>
      <Card noPadding style={{ paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md }}>
        {items.map((item) => (
          <TrayRow
            key={item.id}
            icon={FLARE_FEATURE_LUCIDE.calendar}
            label={item.label}
            showChevron
            onPress={() => onPressItem(item.id)}
          />
        ))}
      </Card>
      <View style={styles.needHelpBlock}>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel="Still need help with appointment summary"
          onPress={() => navigation.navigate("AccountHelp", { expandSection: "appointmentSummary" })}
          style={({ pressed }) => [styles.needHelpLink, pressed && { opacity: 0.7 }]}
        >
          <Text style={[styles.needHelpLinkLabel, { color: c.text, fontFamily: TYPOGRAPHY.fontFamily.regular }]}>
            Still need help?
          </Text>
        </Pressable>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  needHelpBlock: {
    alignItems: "center",
    marginTop: SPACING.md,
    paddingHorizontal: SPACING.lg,
  },
  needHelpLink: {
    alignSelf: "center",
    marginTop: SPACING.sm,
    paddingVertical: SPACING.sm,
  },
  needHelpLinkLabel: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    textDecorationLine: "underline",
  },
});
