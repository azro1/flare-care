import { useNavigation, useRoute } from "@react-navigation/native";
import React, { useCallback, useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { ScrollView } from "../lib/scrollViews";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  LogHistoryCard,
  LogHistoryList,
  LogHistoryTipRow,
  logHistoryListStyles,
  type LogHistoryListItem,
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

  const items: LogHistoryListItem[] = useMemo(
    () =>
      BRISTOL_TYPES.map((item) => ({
        id: String(item.type),
        title: item.shortLabel,
        subtitle: item.description,
        accessibilityLabel: `Type ${item.type}, ${item.shortLabel}`,
      })),
    [],
  );

  const selectType = useCallback(
    (id: string) => {
      const type = Number(id);
      if (!pickMode || !Number.isFinite(type)) return;
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
    },
    [navigation, params.returnRoute, params.returnRouteParams, pickMode, returnOpenLogSheet],
  );

  const renderLeading = useCallback(
    (item: LogHistoryListItem) => (
      <View style={[styles.typeBadge, { backgroundColor: c.primary }]}>
        <Text style={[styles.typeBadgeText, { color: c.white }]}>{item.id}</Text>
      </View>
    ),
    [c.primary, c.white],
  );

  const renderSubtitle = useCallback(
    (item: LogHistoryListItem) => (
      <Text style={[logHistoryListStyles.logSecondary, { color: c.textMuted }]} numberOfLines={2}>
        {item.subtitle}
      </Text>
    ),
    [c.textMuted],
  );

  const getRowStyle = useCallback(
    (item: LogHistoryListItem) =>
      highlightedType === Number(item.id) ? { backgroundColor: c.card } : null,
    [c.card, highlightedType],
  );

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: c.screen, padding: SCREEN_EDGE_PADDING }]}
      contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
      showsVerticalScrollIndicator={false}
    >
      <LogHistoryCard style={styles.guideCard}>
        <LogHistoryList
          items={items}
          rowTextLayout="default"
          renderLeading={renderLeading}
          renderSubtitle={renderSubtitle}
          getRowStyle={getRowStyle}
          onPressItem={pickMode ? selectType : undefined}
          renderTrailing={pickMode ? () => null : undefined}
        />
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
  },
  typeBadgeText: { fontSize: 16, fontFamily: FLARE_FONT_FAMILY.bold },
  pickFooter: {
    fontSize: FLARE_FONT_SIZE.muted,
    fontFamily: FLARE_FONT_FAMILY.regular,
    textAlign: "center",
    marginTop: 14,
  },
});
