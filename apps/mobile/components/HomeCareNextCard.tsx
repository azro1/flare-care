/**
 * My care — next clinic / kit moment (not a three-tile feature wall).
 */
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { AppointmentRow } from "../lib/appointmentShared";
import { formatUkDate } from "../lib/formatUkDate";
import {
  FLARE_FONT_FAMILY,
  FLARE_FONT_SIZE,
  FLARE_INLINE_ACTION_LINK,
  FLARE_LINE_HEIGHT,
  HOME_TILE_GAP,
  STACKED_LINE_GAP,
} from "../lib/layoutConstants";
import type { SupplyDashboardSummary } from "../lib/medicalSuppliesShared";
import { useFlareColors } from "../theme";

type Props = {
  nextAppointment: AppointmentRow | null;
  supplies: SupplyDashboardSummary | null;
  onPressAppointment: () => void;
  onPressSupplies: () => void;
  onPressReports: () => void;
};

function appointmentTitle(row: AppointmentRow): string {
  const type = row.type?.trim();
  if (type) return type;
  const clinician = row.clinician_name?.trim();
  if (clinician) return clinician;
  return "Appointment";
}

function appointmentWhen(row: AppointmentRow): string {
  const parts: string[] = [];
  if (row.date) parts.push(formatUkDate(row.date));
  if (row.time?.trim()) parts.push(row.time.trim());
  return parts.join(" · ");
}

function suppliesTitle(summary: SupplyDashboardSummary | null): string {
  if (summary == null) return "Loading…";
  if (summary.status === "empty" || summary.kitCount === 0) return "No supplies set up";
  if (summary.status === "overdue") {
    return summary.dueKitName ? `Overdue · ${summary.dueKitName}` : "Supplies overdue";
  }
  if (summary.status === "due") {
    return summary.dueKitName ? `Due today · ${summary.dueKitName}` : "Supplies due today";
  }
  return "Supplies on track";
}

function suppliesMeta(summary: SupplyDashboardSummary | null): string {
  if (summary == null) return " ";
  if (summary.status === "empty" || summary.kitCount === 0) return "Tap to add";
  return "Tap to view";
}

export function HomeCareNextCard({
  nextAppointment,
  supplies,
  onPressAppointment,
  onPressSupplies,
  onPressReports,
}: Props) {
  const c = useFlareColors();
  const aptTitle = nextAppointment ? appointmentTitle(nextAppointment) : "No upcoming appointments";
  const aptWhen = nextAppointment ? appointmentWhen(nextAppointment) : "Tap to add";
  const supplyTitle = suppliesTitle(supplies);
  const supplyMeta = suppliesMeta(supplies);

  return (
    <View style={[styles.card, { backgroundColor: c.card }]}>
      <View style={[styles.tray, { backgroundColor: c.surfaceSubtle }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            nextAppointment
              ? `Next appointment ${aptTitle}. ${aptWhen}. Open appointments`
              : "No upcoming appointments. Tap to add. Open appointments"
          }
          onPress={onPressAppointment}
          style={({ pressed }) => [styles.block, pressed && { opacity: 0.7 }]}
        >
          <Text style={[styles.eyebrow, { color: c.textMuted }]}>Next appointment</Text>
          <Text style={[styles.title, { color: c.text }]} numberOfLines={1}>
            {aptTitle}
          </Text>
          <Text
            style={[
              nextAppointment ? styles.meta : styles.eyebrow,
              { color: nextAppointment ? c.textSecondary : c.textMuted },
            ]}
            numberOfLines={1}
          >
            {aptWhen}
          </Text>
        </Pressable>

        <View style={[styles.rule, { backgroundColor: c.cardBorder }]} />

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${supplyTitle}. ${supplyMeta}. Open supplies`}
          onPress={onPressSupplies}
          style={({ pressed }) => [styles.block, pressed && { opacity: 0.7 }]}
        >
          <Text style={[styles.eyebrow, { color: c.textMuted }]}>Supplies</Text>
          <Text style={[styles.title, { color: c.text }]} numberOfLines={1}>
            {supplyTitle}
          </Text>
          <Text style={[styles.eyebrow, { color: c.textMuted }]} numberOfLines={1}>
            {supplyMeta}
          </Text>
        </Pressable>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open reports"
        onPress={onPressReports}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        style={({ pressed }) => [styles.reportsLink, pressed && { opacity: 0.7 }]}
      >
        <Text style={[styles.reportsLabel, { color: c.primary }]}>Reports</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: HOME_TILE_GAP,
    gap: HOME_TILE_GAP,
  },
  tray: {
    borderRadius: 12,
    overflow: "hidden",
  },
  block: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: STACKED_LINE_GAP,
  },
  rule: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 14,
  },
  eyebrow: {
    fontSize: FLARE_FONT_SIZE.caption,
    lineHeight: FLARE_LINE_HEIGHT.caption,
    fontFamily: FLARE_FONT_FAMILY.medium,
  },
  title: {
    fontSize: FLARE_FONT_SIZE.body,
    lineHeight: FLARE_LINE_HEIGHT.body,
    fontFamily: FLARE_FONT_FAMILY.medium,
  },
  meta: {
    fontSize: FLARE_FONT_SIZE.muted,
    lineHeight: FLARE_LINE_HEIGHT.muted,
    fontFamily: FLARE_FONT_FAMILY.regular,
  },
  reportsLink: {
    alignSelf: "flex-end",
    paddingHorizontal: 4,
  },
  reportsLabel: {
    ...FLARE_INLINE_ACTION_LINK,
  },
});
