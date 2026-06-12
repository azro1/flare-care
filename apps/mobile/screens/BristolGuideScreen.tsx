import { useNavigation, useRoute } from "@react-navigation/native";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ScrollView } from "../lib/scrollViews";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  LogHistoryCard,
  LogHistoryTipRow,
  logHistoryListStyles,
} from "../components/LogHistoryList";
import { BRISTOL_TYPES } from "../lib/bristolStoolChart";
import { FLARE_FONT_FAMILY, FLARE_FONT_SIZE, SCREEN_EDGE_PADDING } from "../lib/layoutConstants";
import { useFlareColors } from "../theme";

export type BristolGuideParams = {
  pickMode?: boolean;
  highlightedType?: number;
  returnOpenLogSheet?: boolean;
  /** When picking from detail edit, return to this route instead of Bowel. */
  returnRoute?: string;
  returnRouteParams?: Record<string, unknown>;
};

export type BowelReturnParams = {
  pickedBristolType?: number;
  openLogSheet?: boolean;
};

export function BristolGuideScreen() {
  const c = useFlareColors();
  const navigation = useNavigation<any>();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const params = (route.params ?? {}) as BristolGuideParams;
  const pickMode = Boolean(params.pickMode);
  const highlightedType = params.highlightedType ?? null;
  const returnOpenLogSheet = Boolean(params.returnOpenLogSheet);

  const selectType = (type: number) => {
    if (!pickMode) return;
    const returnRoute = params.returnRoute ?? "Bowel";
    navigation.navigate({
      name: returnRoute,
      params: {
        ...(params.returnRouteParams ?? {}),
        pickedBristolType: type,
        openLogSheet: returnOpenLogSheet || pickMode,
      } satisfies BowelReturnParams,
      merge: true,
    });
  };

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: c.screen, padding: SCREEN_EDGE_PADDING }]}
      contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
      showsVerticalScrollIndicator={false}
    >
      <LogHistoryCard style={styles.guideCard}>
        <View style={[logHistoryListStyles.logList, { backgroundColor: c.surfaceSubtle }]}>
          {BRISTOL_TYPES.map((item, index) => {
            const highlighted = highlightedType === item.type;
            const rowStyle = [
              logHistoryListStyles.logRow,
              index !== BRISTOL_TYPES.length - 1
                ? { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.cardBorder }
                : null,
              highlighted ? { backgroundColor: c.card } : null,
            ];

            const content = (
              <>
                <View style={[styles.typeBadge, { backgroundColor: c.primary }]}>
                  <Text style={[styles.typeBadgeText, { color: c.white }]}>{item.type}</Text>
                </View>
                <View style={logHistoryListStyles.logMain}>
                  <Text style={[logHistoryListStyles.logPrimary, { color: c.text }]} numberOfLines={2}>
                    {item.shortLabel}
                  </Text>
                  <Text style={[logHistoryListStyles.logSecondary, { color: c.textMuted }]} numberOfLines={2}>
                    {item.description}
                  </Text>
                </View>
              </>
            );

            if (pickMode) {
              return (
                <Pressable
                  key={item.type}
                  accessibilityRole="button"
                  accessibilityLabel={`Type ${item.type}, ${item.shortLabel}`}
                  onPress={() => selectType(item.type)}
                  style={({ pressed }) => [...rowStyle, pressed && { opacity: 0.7 }]}
                >
                  {content}
                </Pressable>
              );
            }

            return (
              <View key={item.type} style={rowStyle} accessibilityLabel={`Type ${item.type}, ${item.shortLabel}`}>
                {content}
              </View>
            );
          })}
        </View>
      </LogHistoryCard>

      <LogHistoryTipRow
        text="The scale ranges from 1 (firmest) to 7 (loosest) — types 3–4 are considered normal."
      />

      {pickMode ? (
        <Text style={[styles.pickFooter, { color: c.textMuted }]}>Tap a type to use it in your log.</Text>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  guideCard: { marginBottom: 12 },
  typeBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  typeBadgeText: { fontSize: 16, fontFamily: FLARE_FONT_FAMILY.bold },
  pickFooter: {
    fontSize: FLARE_FONT_SIZE.muted,
    fontFamily: FLARE_FONT_FAMILY.regular,
    textAlign: "center",
    marginTop: 14,
  },
});
