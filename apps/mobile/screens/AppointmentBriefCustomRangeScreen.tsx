import DateTimePicker from "@react-native-community/datetimepicker";
import { useNavigation } from "@react-navigation/native";
import React, { useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { PrimaryButton } from "../components/FlareButton";
import { flareFieldErrorStyle, FlareInputTrigger } from "../components/FlareInput";
import { AppointmentBriefScrollScreen } from "../components/AppointmentBriefScrollScreen";
import { Card } from "../components/MidnightLagoonCard";
import { SectionLabel } from "../components/MidnightLagoonSectionLabel";
import { formatUkDate } from "../lib/formatUkDate";
import { resolveBriefPeriod } from "../lib/appointmentBriefShared";
import { SPACING, TYPOGRAPHY } from "../designTokens";
import { useFlareColors } from "../theme";

type SessionUser = { id: string };

function toYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function isAndroidPickerDismissed(event: { type?: string }): boolean {
  return Platform.OS === "android" && event.type === "dismissed";
}

export function AppointmentBriefCustomRangeScreen({ user: _user }: { user: SessionUser }) {
  const c = useFlareColors();
  const navigation = useNavigation<any>();
  const errTextStyle = flareFieldErrorStyle(c, "input");
  const [customStartDate, setCustomStartDate] = useState<Date | null>(null);
  const [customEndDate, setCustomEndDate] = useState<Date | null>(null);
  const [startPickerOpen, setStartPickerOpen] = useState(false);
  const [endPickerOpen, setEndPickerOpen] = useState(false);
  const [pickerDraft, setPickerDraft] = useState<Date | null>(null);
  const [rangeError, setRangeError] = useState("");

  const handleContinue = () => {
    const period = resolveBriefPeriod("custom", 4, customStartDate, customEndDate);
    if (!period) {
      setRangeError("Choose a start and end date.");
      return;
    }
    if (period.error) {
      setRangeError(period.error);
      return;
    }
    setRangeError("");
    navigation.navigate("AppointmentBriefResult", {
      mode: "custom",
      startYmd: toYmd(customStartDate!),
      endYmd: toYmd(customEndDate!),
    });
  };

  const handleDatePickerChange = (which: "start" | "end", event: { type?: string }, d?: Date) => {
    if (Platform.OS === "android") {
      if (which === "start") setStartPickerOpen(false);
      else setEndPickerOpen(false);
      setPickerDraft(null);
      if (isAndroidPickerDismissed(event)) return;
      if (event.type === "set" && d) {
        if (which === "start") setCustomStartDate(d);
        else setCustomEndDate(d);
      }
      return;
    }
    if (which === "start") setStartPickerOpen(false);
    else setEndPickerOpen(false);
    setPickerDraft(null);
    if (event.type === "dismissed") return;
    if (d) {
      if (which === "start") setCustomStartDate(d);
      else setCustomEndDate(d);
    }
  };

  return (
    <>
      <AppointmentBriefScrollScreen>
        <SectionLabel text="Date Range" />
        <Card>
          <View style={styles.whenRow}>
            <View style={styles.whenCol}>
              <Text style={[styles.fieldLabel, { color: c.text, fontFamily: TYPOGRAPHY.fontFamily.semibold }]}>Start date</Text>
              <FlareInputTrigger
                pickerIcon="date"
                accessibilityRole="button"
                accessibilityLabel="Start date"
                style={styles.dateTrigger}
                onPress={() => {
                  setPickerDraft(customStartDate ?? new Date());
                  setStartPickerOpen(true);
                }}
              >
                <Text style={[styles.dateTriggerText, { color: customStartDate ? c.text : c.textMuted, fontFamily: TYPOGRAPHY.fontFamily.regular }]}>
                  {customStartDate ? formatUkDate(customStartDate) : ""}
                </Text>
              </FlareInputTrigger>
            </View>
            <View style={styles.whenCol}>
              <Text style={[styles.fieldLabel, { color: c.text, fontFamily: TYPOGRAPHY.fontFamily.semibold }]}>End date</Text>
              <FlareInputTrigger
                pickerIcon="date"
                accessibilityRole="button"
                accessibilityLabel="End date"
                style={styles.dateTrigger}
                onPress={() => {
                  setPickerDraft(customEndDate ?? new Date());
                  setEndPickerOpen(true);
                }}
              >
                <Text style={[styles.dateTriggerText, { color: customEndDate ? c.text : c.textMuted, fontFamily: TYPOGRAPHY.fontFamily.regular }]}>
                  {customEndDate ? formatUkDate(customEndDate) : ""}
                </Text>
              </FlareInputTrigger>
            </View>
          </View>
          {rangeError ? (
            <View style={styles.errorWrap}>
              <Text style={errTextStyle}>{rangeError}</Text>
            </View>
          ) : null}
          <View style={styles.buttonWrap}>
            <PrimaryButton title="Generate summary" onPress={handleContinue} />
          </View>
        </Card>
      </AppointmentBriefScrollScreen>

      {startPickerOpen && pickerDraft ? (
        <DateTimePicker
          value={pickerDraft}
          mode="date"
          display="default"
          maximumDate={customEndDate ?? new Date()}
          onChange={(e, d) => handleDatePickerChange("start", e, d)}
        />
      ) : null}
      {endPickerOpen && pickerDraft ? (
        <DateTimePicker
          value={pickerDraft}
          mode="date"
          display="default"
          minimumDate={customStartDate ?? undefined}
          maximumDate={new Date()}
          onChange={(e, d) => handleDatePickerChange("end", e, d)}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  whenRow: {
    flexDirection: "row",
    gap: SPACING.md,
  },
  whenCol: {
    flex: 1,
    gap: SPACING.xs,
  },
  fieldLabel: {
    fontSize: TYPOGRAPHY.fontSize.sm,
  },
  dateTrigger: {
    marginTop: 0,
    alignSelf: "stretch",
  },
  dateTriggerText: {
    flex: 1,
    fontSize: TYPOGRAPHY.fontSize.md,
  },
  errorWrap: {
    marginTop: SPACING.md,
  },
  buttonWrap: {
    marginTop: SPACING.lg,
  },
});
