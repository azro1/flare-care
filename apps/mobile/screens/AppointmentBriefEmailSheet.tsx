import { FLARE_CHROME_LUCIDE, FlareLucideIcon } from "../lib/flareLucideIcons";
import React, { useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { showFlareAlert } from "../components/FlareAlertHost";
import { ScrollView } from "../lib/scrollViews";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PrimaryButton, SecondaryButton } from "../components/FlareButton";
import { flareFieldErrorStyle, FlareTextInput } from "../components/FlareInput";
import { FlareScreenSectionTitle } from "../components/FlareScreenSectionTitle";
import { formatUkDate } from "../lib/formatUkDate";
import { FLARE_FONT_FAMILY, FLARE_FONT_SIZE, SCREEN_EDGE_PADDING } from "../lib/layoutConstants";
import type { AppointmentBriefData } from "../lib/appointmentBriefShared";
import { useFlareColors } from "../theme";

export function AppointmentBriefEmailSheet({
  visible,
  brief,
  briefText,
  onClose,
}: {
  visible: boolean;
  brief: AppointmentBriefData | null;
  briefText: string;
  onClose: () => void;
}) {
  const c = useFlareColors();
  const insets = useSafeAreaInsets();
  const errTextStyle = flareFieldErrorStyle(c, "input");
  const [consultantEmail, setConsultantEmail] = useState("");
  const [consultantName, setConsultantName] = useState("");
  const [emailNote, setEmailNote] = useState("");
  const [emailError, setEmailError] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);

  const handleClose = () => {
    if (sendingEmail) return;
    onClose();
  };

  const handleSend = async () => {
    if (!brief || !briefText) return;
    const email = consultantEmail.trim();
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setEmailError("Please enter a valid email address.");
      return;
    }
    const base = process.env.EXPO_PUBLIC_WEB_API_BASE_URL?.replace(/\/$/, "");
    if (!base) {
      showFlareAlert("Missing API base URL", "Set EXPO_PUBLIC_WEB_API_BASE_URL");
      return;
    }

    setSendingEmail(true);
    setEmailError("");
    try {
      const response = await fetch(`${base}/api/send-appointment-brief-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          consultantEmail: email,
          consultantName: consultantName.trim() || null,
          note: emailNote.trim() || null,
          period: brief.period,
          briefText,
          summary: {
            symptoms: brief.symptoms,
            bowel: brief.bowel,
            weight: brief.weight,
            medications: brief.medications,
            nextAppointment: brief.nextAppointment,
            talkingPoints: brief.talkingPoints,
          },
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error((data as { error?: string })?.error || "Failed to send email. Please try again.");
      }
      setConsultantEmail("");
      setConsultantName("");
      setEmailNote("");
      onClose();
      showFlareAlert("Summary sent", "Your appointment summary was emailed successfully.");
    } catch (err: unknown) {
      setEmailError(err instanceof Error ? err.message : "Failed to send email. Please try again.");
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <KeyboardAvoidingView style={[styles.root, { backgroundColor: c.screen }]} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={[styles.sheetHeader, { borderBottomColor: c.cardBorder, paddingTop: Math.max(insets.top, 12) }]}>
          <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={handleClose} hitSlop={12} style={styles.sheetClose}>
            <FlareLucideIcon icon={FLARE_CHROME_LUCIDE.close} size={26} color={c.textMuted} />
          </Pressable>
          <Text style={[styles.sheetTitle, { color: c.text }]}>Email summary</Text>
          <View style={styles.sheetClose} />
        </View>
        <ScrollView
          contentContainerStyle={[styles.sheetScroll, { paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {brief ? (
            <Text style={[styles.period, { color: c.textMuted }]}>
              {`This summary will cover the period from ${formatUkDate(brief.period.start)} to ${formatUkDate(brief.period.end)}.`}
            </Text>
          ) : null}
          <FlareScreenSectionTitle compact>Clinician email *</FlareScreenSectionTitle>
          <FlareTextInput
            value={consultantEmail}
            onChangeText={setConsultantEmail}
            placeholder="email@example.com"
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <FlareScreenSectionTitle compact style={{ marginTop: 16 }}>
            Clinician name (optional)
          </FlareScreenSectionTitle>
          <FlareTextInput value={consultantName} onChangeText={setConsultantName} placeholder="Dr Smith" />
          <FlareScreenSectionTitle compact style={{ marginTop: 16 }}>
            Note to include (optional)
          </FlareScreenSectionTitle>
          <FlareTextInput multiline value={emailNote} onChangeText={setEmailNote} placeholder="Optional note" />
          {emailError ? <Text style={[errTextStyle, { marginTop: 8 }]}>{emailError}</Text> : null}
          <View style={{ marginTop: 20, gap: 8 }}>
            <PrimaryButton title={sendingEmail ? "Sending…" : "Send summary"} onPress={handleSend} disabled={sendingEmail} />
            <SecondaryButton title="Cancel" onPress={handleClose} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingBottom: SCREEN_EDGE_PADDING,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sheetClose: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  sheetTitle: { fontSize: FLARE_FONT_SIZE.navTitle, fontFamily: FLARE_FONT_FAMILY.bold },
  sheetScroll: { paddingHorizontal: 20, paddingTop: 14 },
  period: { fontSize: FLARE_FONT_SIZE.body, marginBottom: 16 },
});
