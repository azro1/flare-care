import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BRISTOL_TYPES } from "../lib/bristolStoolChart";
import { FLARE_FONT_SIZE, FLARE_LINE_HEIGHT, SCREEN_EDGE_PADDING } from "../lib/layoutConstants";
import { useFlareColors } from "../theme";

export type BristolGuideParams = {
  pickMode?: boolean;
  highlightedType?: number;
  returnOpenLogSheet?: boolean;
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
    navigation.navigate({
      name: "Bowel",
      params: {
        pickedBristolType: type,
        openLogSheet: returnOpenLogSheet || pickMode,
      } satisfies BowelReturnParams,
      merge: true,
    });
  };

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: c.screen }]}
      contentContainerStyle={{
        paddingHorizontal: SCREEN_EDGE_PADDING,
        paddingBottom: insets.bottom + 24,
      }}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.lead, { color: c.textMuted }]}>
        Types run from 1 (firmest) to 7 (loosest). Choose the number that best matches what you saw.
      </Text>

      <View style={styles.spectrumLabels}>
        <Text style={[styles.spectrumEnd, { color: c.textMuted }]}>Firmer</Text>
        <Text style={[styles.spectrumEnd, { color: c.textMuted }]}>Looser</Text>
      </View>
      <View style={[styles.spectrumBar, { backgroundColor: c.surfaceSubtle, borderColor: c.cardBorder }]}>
        {BRISTOL_TYPES.map((item) => {
          const ideal = item.type === 3 || item.type === 4;
          const active = highlightedType === item.type;
          return (
            <View
              key={item.type}
              style={[
                styles.spectrumSegment,
                ideal ? { backgroundColor: c.primary } : null,
                active && !ideal ? { backgroundColor: c.primary, opacity: 0.5 } : null,
              ]}
            >
              <Text style={[styles.spectrumNum, { color: ideal || active ? c.white : c.textSecondary }]}>
                {item.type}
              </Text>
            </View>
          );
        })}
      </View>

      <View style={[styles.listCard, { backgroundColor: c.card }]}>
        {BRISTOL_TYPES.map((item, index) => {
          const highlighted = highlightedType === item.type;
          const rowStyle = [
            styles.listRow,
            index !== BRISTOL_TYPES.length - 1
              ? { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.cardBorder }
              : null,
            highlighted ? { backgroundColor: c.surfaceSubtle } : null,
          ];

          const content = (
            <>
              <View style={[styles.typeBadge, { backgroundColor: c.primary }]}>
                <Text style={[styles.typeBadgeText, { color: c.white }]}>{item.type}</Text>
              </View>
              <View style={styles.listCopy}>
                <Text style={[styles.listTitle, { color: c.text }]}>{item.shortLabel}</Text>
                <Text style={[styles.listDesc, { color: c.textMuted }]}>{item.description}</Text>
              </View>
              {pickMode ? <Ionicons name="chevron-forward" size={20} color={c.textMuted} /> : null}
            </>
          );

          if (pickMode) {
            return (
              <Pressable
                key={item.type}
                accessibilityRole="button"
                accessibilityLabel={`Type ${item.type}, ${item.shortLabel}`}
                onPress={() => selectType(item.type)}
                style={({ pressed }) => [...rowStyle, pressed ? { opacity: 0.88 } : null]}
              >
                {content}
              </Pressable>
            );
          }

          return (
            <View key={item.type} style={rowStyle}>
              {content}
            </View>
          );
        })}
      </View>

      {pickMode ? (
        <Text style={[styles.pickFooter, { color: c.textMuted }]}>Tap a type to use it in your log.</Text>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  lead: {
    fontSize: FLARE_FONT_SIZE.body,
    fontFamily: "Inter_400Regular",
    lineHeight: FLARE_LINE_HEIGHT.body,
    marginTop: 4,
    marginBottom: 16,
  },
  spectrumLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
    paddingHorizontal: 2,
  },
  spectrumEnd: { fontSize: 12, fontFamily: "Inter_400Regular" },
  spectrumBar: {
    flexDirection: "row",
    borderRadius: 10,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 14,
  },
  spectrumSegment: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
  },
  spectrumNum: { fontSize: 13, fontFamily: "Inter_700Bold" },
  listCard: { borderRadius: 14, overflow: "hidden" },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 14,
    gap: 12,
  },
  typeBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  typeBadgeText: { fontSize: 16, fontFamily: "Inter_700Bold" },
  listCopy: { flex: 1, minWidth: 0 },
  listTitle: { fontSize: 15, fontFamily: "Inter_500Medium" },
  listDesc: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2, lineHeight: 18 },
  pickFooter: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    marginTop: 14,
  },
});
