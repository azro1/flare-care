/**
 * My care — Account list tray (`OneLineTrayList` chrome) + Reports inside the same card.
 */
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { AppointmentRow } from "../lib/appointmentShared";
import { formatUkDate } from "../lib/formatUkDate";
import { FLARE_INLINE_ACTION_LINK, HOME_TILE_GAP, ONE_LINE_TRAY_PADDING } from "../lib/layoutConstants";
import type { SupplyDashboardSummary } from "../lib/medicalSuppliesShared";
import {
  LogHistoryCard,
  LogHistoryList,
  logHistoryListStyles,
  oneLineTraySeparatorRowStyle,
} from "./LogHistoryList";
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

export function HomeCareNextCard({
  nextAppointment,
  supplies,
  onPressAppointment,
  onPressSupplies,
  onPressReports,
}: Props) {
  const c = useFlareColors();
  const aptTitle = nextAppointment ? appointmentTitle(nextAppointment) : "No upcoming appointments";
  const aptWhen = nextAppointment ? appointmentWhen(nextAppointment) : "";
  const supplyTitle = suppliesTitle(supplies);

  const items = [
    {
      id: "appointment",
      title: "Next appointment",
      subtitle: aptWhen ? `${aptTitle} · ${aptWhen}` : aptTitle,
      accessibilityLabel: nextAppointment
        ? `Next appointment ${aptTitle}. ${aptWhen}. Open appointments`
        : "No upcoming appointments. Open appointments",
    },
    {
      id: "supplies",
      title: "Supplies",
      subtitle: supplyTitle,
      accessibilityLabel: `${supplyTitle}. Open supplies`,
    },
  ];

  return (
    <LogHistoryCard style={styles.card}>
      <View
        style={[
          logHistoryListStyles.logList,
          {
            backgroundColor: c.surfaceSubtle,
            paddingVertical: ONE_LINE_TRAY_PADDING,
          },
        ]}
      >
        <LogHistoryList
          items={items}
          rowTextLayout="default"
          rowPaddingHorizontal={ONE_LINE_TRAY_PADDING}
          rowPaddingVertical={4}
          insetTray={false}
          getRowStyle={(_item, index) => oneLineTraySeparatorRowStyle(index, items.length)}
          onPressItem={(id) => {
            if (id === "appointment") onPressAppointment();
            else onPressSupplies();
          }}
        />
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
    </LogHistoryCard>
  );
}

const styles = StyleSheet.create({
  /** Same Account card; no extra marginBottom — shelf `toolsGridBlock` owns bottom gap. */
  card: {
    marginBottom: 0,
    gap: HOME_TILE_GAP,
  },
  reportsLink: {
    alignSelf: "flex-end",
    paddingHorizontal: 4,
  },
  reportsLabel: {
    ...FLARE_INLINE_ACTION_LINK,
  },
});
