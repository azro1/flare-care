import React from "react";
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { useFlareColors } from "../theme";

/** Shared review-card layout — matches `SymptomLogWizardScreen` step 17. */
export function SymptomReviewCard({
  title,
  children,
  style,
}: {
  title: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const c = useFlareColors();
  return (
    <View style={[reviewStyles.card, { backgroundColor: c.card, borderColor: c.cardBorder }, style]}>
      <Text style={[reviewStyles.sectionTitle, { color: c.primary, borderBottomColor: c.cardBorder }]}>{title}</Text>
      {children}
    </View>
  );
}

export function SymptomReviewField({ label, value }: { label: string; value: string }) {
  const c = useFlareColors();
  return (
    <View style={reviewStyles.field}>
      <Text style={[reviewStyles.label, { color: c.textMuted }]}>{label}</Text>
      <Text style={[reviewStyles.value, { color: c.textSecondary }]}>{value}</Text>
    </View>
  );
}

export function SymptomReviewGrid({ children }: { children: React.ReactNode }) {
  return <View style={reviewStyles.grid}>{children}</View>;
}

export function SymptomReviewSubsection({ label, value }: { label: string; value: string }) {
  const c = useFlareColors();
  return (
    <View style={[reviewStyles.subsection, { borderTopColor: c.cardBorder }]}>
      <Text style={[reviewStyles.label, { color: c.textMuted }]}>{label}</Text>
      <Text style={[reviewStyles.value, { color: c.textSecondary }]}>{value}</Text>
    </View>
  );
}

export function SymptomReviewMealBlock({
  label,
  skipped,
  items,
  showDivider,
}: {
  label: string;
  skipped?: boolean;
  items?: { food: string; quantity: string }[];
  showDivider?: boolean;
}) {
  const c = useFlareColors();
  return (
    <View
      style={[
        reviewStyles.mealBlock,
        showDivider
          ? { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.cardBorder, paddingBottom: 12, marginBottom: 12 }
          : null,
      ]}
    >
      <Text style={[reviewStyles.label, { color: c.textMuted, marginBottom: 8 }]}>{label}</Text>
      {skipped ? (
        <Text style={[reviewStyles.value, { color: c.textSecondary, fontStyle: "italic" }]}>Didn&apos;t eat anything</Text>
      ) : (
        <View style={{ gap: 6 }}>
          {(items ?? []).map((item, j) => (
            <Text key={`${item.food}-${j}`} style={[reviewStyles.value, { color: c.textSecondary }]} numberOfLines={4}>
              {item.food}
              {item.quantity ? ` (${item.quantity})` : ""}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

export const reviewStyles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    paddingBottom: 10,
    marginBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  grid: { gap: 14 },
  field: { minWidth: 0 },
  label: { fontSize: 13, marginBottom: 4, fontFamily: "Inter_400Regular" },
  value: { fontSize: 15, fontFamily: "Inter_500Medium" },
  subsection: { marginTop: 12, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  mealBlock: { minWidth: 0 },
});

export function SymptomReviewNotesBody({ children }: { children: string }) {
  const c = useFlareColors();
  return <Text style={[reviewStyles.value, { color: c.textSecondary }]}>{children}</Text>;
}
