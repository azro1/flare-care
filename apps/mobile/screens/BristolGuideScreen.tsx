import { useNavigation, useRoute } from "@react-navigation/native";
import React, { useCallback, useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { ScrollView } from "../lib/scrollViews";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Card } from "../components/MidnightLagoonCard";
import { TrayRow } from "../components/MidnightLagoonTray";
import { ScreenHeader } from "../components/MidnightLagoonScreenHeader";
import { BRISTOL_TYPES } from "../lib/bristolStoolChart";
import { SPACING, TYPOGRAPHY } from "../designTokens";
import { useFlareColors } from "../theme";

export type BristolGuideParams = {
  pickMode?: boolean;
  highlightedType?: number;
  returnOpenLogSheet?: boolean;
  returnRoute?: string;
  returnRouteParams?: Record<string, unknown>;
};

export type BowelReturnParams = {
  pickedBristolType?: number;
  openLogSheet?: boolean;
};

type SessionUser = { id: string };

export function BristolGuideScreen({ user }: { user: SessionUser }) {
  const c = useFlareColors();
  const navigation = useNavigation<any>();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const params = (route.params ?? {}) as BristolGuideParams;
  const pickMode = Boolean(params.pickMode);
  const highlightedType = params.highlightedType ?? null;
  const returnOpenLogSheet = Boolean(params.returnOpenLogSheet);

  const selectType = useCallback(
    (type: number) => {
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
    },
    [navigation, params.returnRoute, params.returnRouteParams, pickMode, returnOpenLogSheet],
  );

  return (
    <View style={[styles.screen, { backgroundColor: c.screen }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 24 },
        ]}
      >
        <ScreenHeader title="Bristol Stool Chart" />

        <Card noPadding style={{ paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md }}>
          {BRISTOL_TYPES.map((item) => (
            <View key={item.type}>
              <TrayRow
                label={`Type ${item.type}: ${item.shortLabel}`}
                sublabel={item.description}
                onPress={pickMode ? () => selectType(item.type) : undefined}
                style={highlightedType === item.type ? { backgroundColor: c.tray } : undefined}
              />
            </View>
          ))}
        </Card>

        {pickMode && (
          <Text style={[styles.pickFooter, { color: c.textSecondary, fontFamily: TYPOGRAPHY.fontFamily.regular }]}>
            Tap a type to use it in your log.
          </Text>
        )}
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
  pickFooter: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    textAlign: "center",
    marginTop: SPACING.lg,
  },
});
