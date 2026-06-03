import React from "react";
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { StackedDetailField } from "./StackedDetailField";
import { FLARE_FONT_FAMILY, FLARE_FONT_SIZE, SCREEN_EDGE_PADDING } from "../lib/layoutConstants";
import { useFlareColors } from "../theme";

export const logDetailStyles = StyleSheet.create({
  loggedAt: {
    fontSize: 13,
    fontFamily: FLARE_FONT_FAMILY.regular,
    marginBottom: 16,
    textAlign: "center",
    lineHeight: 18,
  },
  detailCard: { borderRadius: 14, padding: 14, marginBottom: 12 },
  notesTitle: {
    fontSize: FLARE_FONT_SIZE.navTitle,
    fontFamily: FLARE_FONT_FAMILY.bold,
    marginBottom: 10,
  },
  notesBody: {
    fontSize: FLARE_FONT_SIZE.body,
    fontFamily: FLARE_FONT_FAMILY.regular,
    lineHeight: 20,
  },
  fieldGroups: { gap: 10 },
  fieldGroup: { borderRadius: 14, overflow: "hidden" },
});

export function LogDetailCard({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const c = useFlareColors();
  return <View style={[logDetailStyles.detailCard, { backgroundColor: c.card }, style]}>{children}</View>;
}

export function LogDetailAddedHeader({ text }: { text: string }) {
  const c = useFlareColors();
  return <Text style={[logDetailStyles.loggedAt, { color: c.textMuted }]}>{text}</Text>;
}

export function LogDetailNotesCard({ notes }: { notes: string }) {
  const c = useFlareColors();
  return (
    <LogDetailCard style={{ marginBottom: 0 }}>
      <Text style={[logDetailStyles.notesTitle, { color: c.text }]}>Notes</Text>
      <Text style={[logDetailStyles.notesBody, { color: c.textMuted }]}>{notes}</Text>
    </LogDetailCard>
  );
}

export function LogDetailFields({ fields }: { fields: { label: string; value: string }[] }) {
  return <LogDetailFieldGroup fields={fields} />;
}

/** One `surfaceSubtle` tray per entry — fields inside share dividers (medication lists). */
export function LogDetailFieldGroup({ fields }: { fields: { label: string; value: string }[] }) {
  const c = useFlareColors();
  const visible = fields.filter((f) => f.value !== "");
  if (!visible.length) return null;
  return (
    <View style={[logDetailStyles.fieldGroup, { backgroundColor: c.surfaceSubtle }]}>
      {visible.map((field, index) => (
        <StackedDetailField
          key={`${index}-${field.label}`}
          label={field.label}
          value={field.value}
          showDivider={index < visible.length - 1}
          style={{ paddingHorizontal: SCREEN_EDGE_PADDING }}
        />
      ))}
    </View>
  );
}

export function LogDetailFieldGroups({ groups }: { groups: { label: string; value: string }[][] }) {
  return (
    <View style={logDetailStyles.fieldGroups}>
      {groups.map((fields, index) => (
        <LogDetailFieldGroup key={index} fields={fields} />
      ))}
    </View>
  );
}
