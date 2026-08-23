import * as Clipboard from "expo-clipboard";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { showFlareAlert } from "../components/FlareAlertHost";
import { PrimaryButton, SecondaryButton } from "../components/FlareButton";
import {
  FlareInputTrigger,
  flareFieldErrorStyle,
  FlareTextInput,
  flareInputStyles,
} from "../components/FlareInput";
import { FlareScreenSectionTitle } from "../components/FlareScreenSectionTitle";
import { OptionPickerModal } from "../components/OptionPickerModal";
import { ConfirmModal } from "../components/ConfirmModal";
import { ScrollView } from "../lib/scrollViews";
import {
  advanceMedicalSupplyKitDueDate,
  buildSupplyRequestText,
  DEFAULT_SUPPLY_REQUEST_SUBJECT,
  fetchMedicalSuppliesForKit,
  fetchMedicalSupplyKitsForUser,
  updateMedicalSupplyKit,
  type MedicalSupplyKitRow,
  type MedicalSupplyRow,
} from "../lib/medicalSuppliesShared";
import { rescheduleSupplyNotificationsForUser } from "../lib/medicationNotifications";
import {
  FLARE_FONT_FAMILY,
  FLARE_FONT_SIZE,
  FLARE_INLINE_ACTION_LINK,
  FLARE_LINE_HEIGHT,
  NAV_ROW_CHEVRON_SIZE,
  WIZARD_LANDING_BLOCK_PADDING_BOTTOM,
  bottomTabBarScrollInset,
} from "../lib/layoutConstants";
import { formatUkDate } from "../lib/formatUkDate";
import { withAppLockExternalUi } from "../lib/biometricLock";
import { useFlareColors } from "../theme";

type SessionUser = { id: string };

export type MedicalSupplyRequestParams = {
  kitId?: number;
};

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function MedicalSupplyRequestScreen({ user }: { user: SessionUser }) {
  const c = useFlareColors();
  const navigation = useNavigation<any>();
  const route = useRoute();
  const routeKitId = Number((route.params as MedicalSupplyRequestParams | undefined)?.kitId);
  const insets = useSafeAreaInsets();
  const bottomScrollInset = bottomTabBarScrollInset(insets.bottom);
  const errTextStyle = flareFieldErrorStyle(c, "input");

  const [kits, setKits] = useState<MedicalSupplyKitRow[]>([]);
  const [kitId, setKitId] = useState<number | null>(Number.isFinite(routeKitId) ? routeKitId : null);
  const [items, setItems] = useState<MedicalSupplyRow[]>([]);
  const [kit, setKit] = useState<MedicalSupplyKitRow | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [toEmail, setToEmail] = useState("");
  const [toEmailError, setToEmailError] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [orderPickerOpen, setOrderPickerOpen] = useState(false);
  const [noStockOpen, setNoStockOpen] = useState(false);

  const applyDraftFromKit = (rows: MedicalSupplyRow[], kitRow: MedicalSupplyKitRow | null) => {
    setSubject(kitRow?.email_subject?.trim() || "");
    const saved = kitRow?.request_body?.trim();
    setBody(saved || buildSupplyRequestText(rows));
    setToEmail(kitRow?.recipient_email?.trim() || "");
    setToEmailError("");
  };

  const loadKitContent = useCallback(
    async (selectedId: number, kitList: MedicalSupplyKitRow[]) => {
      const kitRow = kitList.find((k) => k.id === selectedId) || null;
      const rows = await fetchMedicalSuppliesForKit(user.id, selectedId);
      setKit(kitRow);
      setItems(rows);
      applyDraftFromKit(rows, kitRow);
    },
    [user.id],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const kitList = await fetchMedicalSupplyKitsForUser(user.id);
      setKits(kitList);
      if (kitList.length === 0) {
        setKitId(null);
        setKit(null);
        setItems([]);
        return;
      }
      const fromRoute =
        Number.isFinite(routeKitId) && kitList.some((k) => k.id === routeKitId) ? routeKitId : null;
      const preferred = fromRoute ?? kitList[0].id;
      setKitId(preferred);
      await loadKitContent(preferred, kitList);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not load supply request.");
    } finally {
      setLoading(false);
    }
  }, [loadKitContent, routeKitId, user.id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const selectOrder = async (name: string) => {
    setOrderPickerOpen(false);
    const match = kits.find((k) => k.name === name);
    if (!match || match.id === kitId) return;
    setLoading(true);
    setError("");
    try {
      const rows = await fetchMedicalSuppliesForKit(user.id, match.id);
      if (rows.length === 0) {
        setNoStockOpen(true);
        return;
      }
      setKitId(match.id);
      const kitRow = kits.find((k) => k.id === match.id) || null;
      setKit(kitRow);
      setItems(rows);
      applyDraftFromKit(rows, kitRow);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not load that order.");
    } finally {
      setLoading(false);
    }
  };

  const persistWording = async (opts?: { recipientEmail?: string; emailSubject?: string }) => {
    if (!kit) return kit;
    const email = (opts?.recipientEmail ?? toEmail).trim() || null;
    const emailSubject = (opts?.emailSubject ?? subject).trim() || DEFAULT_SUPPLY_REQUEST_SUBJECT;
    const updated = await updateMedicalSupplyKit(user.id, kit.id, {
      recipient_email: email,
      email_subject: emailSubject,
      request_body: body,
    });
    setKit(updated);
    setKits((prev) => prev.map((k) => (k.id === updated.id ? updated : k)));
    setSubject(updated.email_subject?.trim() || emailSubject);
    setToEmail(updated.recipient_email?.trim() || email || "");
    return updated;
  };

  const afterSent = async (opts?: {
    recipientEmail?: string;
    emailSubject?: string;
    successTitle: string;
    successBody: string;
  }) => {
    try {
      await persistWording({
        recipientEmail: opts?.recipientEmail,
        emailSubject: opts?.emailSubject,
      });
    } catch {
      // non-fatal — send/copy already succeeded
    }
    let nextDueLabel = "";
    try {
      if (kit) {
        const updated = await advanceMedicalSupplyKitDueDate(user.id, kit.id);
        setKit(updated);
        setKits((prev) => prev.map((k) => (k.id === updated.id ? updated : k)));
        nextDueLabel = formatUkDate(updated.next_due_date);
        try {
          await rescheduleSupplyNotificationsForUser(user.id);
        } catch {
          // non-fatal
        }
      }
    } catch {
      // wording may have saved; due advance failed — still tell them send worked
    }
    const dueLine = nextDueLabel ? ` Your next order is due on ${nextDueLabel}.` : "";
    showFlareAlert(opts?.successTitle || "Sent!", `${opts?.successBody || ""}${dueLine}`.trim());
    navigation.goBack();
  };

  const handleRebuildList = () => {
    setBody(buildSupplyRequestText(items));
  };

  const handleShare = async () => {
    if (!body.trim() || items.length === 0) return;
    try {
      await withAppLockExternalUi(() =>
        Share.share({
          message: body.trim(),
          title: subject.trim() || DEFAULT_SUPPLY_REQUEST_SUBJECT,
        }),
      );
    } catch {
      // user cancelled / share unavailable
    }
  };

  const handleCopy = async () => {
    if (!body.trim() || items.length === 0) return;
    try {
      await Clipboard.setStringAsync(body.trim());
      showFlareAlert("Copied", "Message copied to the clipboard.");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Could not copy.";
      showFlareAlert("Could not copy", message);
    }
  };

  const handleEmail = async () => {
    if (!body.trim() || items.length === 0 || sendingEmail) return;
    const email = toEmail.trim();
    if (!email || !EMAIL_RE.test(email)) {
      setToEmailError("Add who to send this to.");
      return;
    }
    const base = process.env.EXPO_PUBLIC_WEB_API_BASE_URL?.replace(/\/$/, "");
    if (!base) {
      showFlareAlert("Missing API base URL", "Set EXPO_PUBLIC_WEB_API_BASE_URL");
      return;
    }

    setSendingEmail(true);
    setToEmailError("");
    try {
      const response = await fetch(`${base}/api/send-supply-request-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toEmail: email,
          subject: subject.trim() || DEFAULT_SUPPLY_REQUEST_SUBJECT,
          requestText: body.trim(),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error((data as { error?: string })?.error || "Failed to send email. Please try again.");
      }
      await afterSent({
        recipientEmail: email,
        emailSubject: subject.trim() || DEFAULT_SUPPLY_REQUEST_SUBJECT,
        successTitle: "Sent!",
        successBody: "Your supply request was sent.",
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to send email. Please try again.";
      showFlareAlert("Could not send", message);
    } finally {
      setSendingEmail(false);
    }
  };

  const canSend = items.length > 0 && body.trim().length > 0;
  const orderNames = kits.map((k) => k.name);

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: c.screen }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: bottomScrollInset + 24 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={c.primary} />
            <Text style={[styles.muted, { color: c.textMuted }]}>Loading request…</Text>
          </View>
        ) : error ? (
          <Text style={errTextStyle}>{error}</Text>
        ) : kits.length === 0 ? (
          <Text style={[styles.muted, { color: c.textMuted }]}>Set up an order in My Supplies first.</Text>
        ) : (
          <>
            <FlareScreenSectionTitle compact>Order *</FlareScreenSectionTitle>
            <FlareInputTrigger
              accessibilityRole="button"
              accessibilityLabel="Choose order"
              onPress={() => setOrderPickerOpen(true)}
            >
              <View style={styles.orderPickerRow}>
                <Text style={[styles.orderPickerText, { color: kit?.name ? c.text : c.textMuted }]} numberOfLines={1}>
                  {kit?.name || "Select order"}
                </Text>
                <Ionicons name="chevron-down" size={NAV_ROW_CHEVRON_SIZE} color={c.textMuted} />
              </View>
            </FlareInputTrigger>

            {items.length === 0 ? (
              <Text style={[styles.muted, styles.emptyItems, { color: c.textMuted }]}>
                Add items to this order first, then you can send a request.
              </Text>
            ) : (
              <>
                <FlareScreenSectionTitle compact style={styles.fieldGap}>
                  Subject
                </FlareScreenSectionTitle>
                <FlareTextInput
                  value={subject}
                  onChangeText={setSubject}
                  placeholder="e.g. Re: Order REF-12345"
                  autoCapitalize="sentences"
                />

                <FlareScreenSectionTitle compact style={styles.fieldGap}>
                  Message *
                </FlareScreenSectionTitle>
                <FlareTextInput
                  multiline
                  value={body}
                  onChangeText={setBody}
                  placeholder="Write the request exactly as you would like to send it"
                  style={styles.bodyInput}
                  textAlignVertical="top"
                  autoCorrect={false}
                  spellCheck={false}
                />

                <Pressable accessibilityRole="button" onPress={handleRebuildList} style={styles.rebuildLink}>
                  <Text style={[FLARE_INLINE_ACTION_LINK, { color: c.primary }]}>
                    Rebuild list from {kit?.name || "this order"}
                  </Text>
                </Pressable>

                <FlareScreenSectionTitle compact style={styles.fieldGap}>
                  Send to *
                </FlareScreenSectionTitle>
                <FlareTextInput
                  value={toEmail}
                  onChangeText={(v) => {
                    setToEmail(v);
                    if (toEmailError) setToEmailError("");
                  }}
                  placeholder="homecare@example.com"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoCorrect={false}
                />
                {toEmailError ? <Text style={[errTextStyle, styles.fieldError]}>{toEmailError}</Text> : null}

                <View style={styles.actionCol}>
                  <PrimaryButton
                    title={sendingEmail ? "Sending…" : "Send email"}
                    onPress={handleEmail}
                    disabled={!canSend || sendingEmail}
                  />
                  <SecondaryButton title="Share" onPress={handleShare} disabled={!canSend} />
                  <SecondaryButton title="Copy message" onPress={handleCopy} disabled={!canSend} />
                </View>
              </>
            )}
          </>
        )}
      </ScrollView>

      <OptionPickerModal
        visible={orderPickerOpen}
        options={orderNames}
        onSelect={(value) => void selectOrder(value)}
        onCancel={() => setOrderPickerOpen(false)}
      />
      <ConfirmModal
        visible={noStockOpen}
        notice
        title="Add items first"
        message="Add items to this order first, then you can send a request."
        confirmLabel="OK"
        onConfirm={() => setNoStockOpen(false)}
        onCancel={() => setNoStockOpen(false)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 14 },
  loadingWrap: {
    alignItems: "center",
    paddingVertical: WIZARD_LANDING_BLOCK_PADDING_BOTTOM,
    gap: 12,
  },
  muted: {
    fontSize: FLARE_FONT_SIZE.muted,
    lineHeight: FLARE_LINE_HEIGHT.muted,
    fontFamily: FLARE_FONT_FAMILY.regular,
  },
  emptyItems: { marginTop: 16 },
  orderPickerRow: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  orderPickerText: {
    flex: 1,
    fontSize: FLARE_FONT_SIZE.body,
    fontFamily: FLARE_FONT_FAMILY.regular,
  },
  fieldGap: { marginTop: 16 },
  bodyInput: {
    minHeight: flareInputStyles.textarea.minHeight + 80,
  },
  rebuildLink: { alignSelf: "flex-start", paddingVertical: 10 },
  fieldError: { marginTop: 8 },
  actionCol: { gap: 8, marginTop: 20 },
});
