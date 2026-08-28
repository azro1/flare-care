import { FLARE_CHROME_LUCIDE, FlareLucideIcon } from "../lib/flareLucideIcons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { showFlareAlert } from "../components/FlareAlertHost";
import { PrimaryButton, SecondaryButton } from "../components/FlareButton";
import { InfoHintTitleRow } from "../components/InfoHintButton";
import {
  FLARE_INPUT_BORDER_RADIUS,
  flareFieldErrorStyle,
  FlareTextInput,
  flareInputStyles,
} from "../components/FlareInput";
import { FlareScreenSectionTitle } from "../components/FlareScreenSectionTitle";
import { ScrollView } from "../lib/scrollViews";
import { formatUkDate } from "../lib/formatUkDate";
import {
  FLARE_FONT_FAMILY,
  FLARE_FONT_SIZE,
  SUPPLIES_SETUP_PICKER_PILL_GAP,
  SUPPLIES_SETUP_STEP_BLOCK_GAP,
  SUPPLIES_SETUP_STEP_FOOTER,
  SUPPLIES_SETUP_STEP_NAME_BLOCK_GAP,
  SUPPLIES_SETUP_STEP_OPTION_LIST,
  SUPPLIES_SETUP_STEP_RADIO_ROW,
  SUPPLIES_SETUP_STEP_SCROLL,
  SUPPLIES_SETUP_STEP_SCROLL_BOTTOM,
  SUPPLIES_SETUP_STEP_SUPPORT,
  SUPPLIES_SETUP_STEP_TITLE,
  SCREEN_EDGE_PADDING,
  bottomTabBarScrollInset,
} from "../lib/layoutConstants";
import {
  SUPPLY_CADENCE_OPTIONS,
  cadenceDaysToWeeks,
  defaultKitFormValues,
  fetchMedicalSupplyKit,
  formatYmdLocal,
  insertMedicalSupplyKit,
  isPresetCadenceDays,
  normalizeCadenceDays,
  parseYmdLocal,
  sanitizeKitName,
  updateMedicalSupplyKit,
  weeksToCadenceDays,
} from "../lib/medicalSuppliesShared";
import { todayYmd } from "../lib/bowelMovementShared";
import { rescheduleSupplyNotificationsForUser } from "../lib/medicationNotifications";
import { useFlareColors } from "../theme";

type SessionUser = { id: string };

/** Light logistics setup — name → how often → next due. Stock on the order hub. */
export const SUPPLIES_SETUP_STEP_INTRO = 0;
export const SUPPLIES_SETUP_STEP_NAME = 1;
export const SUPPLIES_SETUP_STEP_CADENCE = 2;
export const SUPPLIES_SETUP_STEP_DUE = 3;
const STEP_INTRO = SUPPLIES_SETUP_STEP_INTRO;
const STEP_NAME = SUPPLIES_SETUP_STEP_NAME;
const STEP_CADENCE = SUPPLIES_SETUP_STEP_CADENCE;
const STEP_DUE = SUPPLIES_SETUP_STEP_DUE;
const STEP_LAST = STEP_DUE;

const RADIO_OUTER_SIZE = 22;
const RADIO_INNER_SIZE = 12;

/** Midnight local today — keeps “today” selectable with `minimumDate`. */
function startOfLocalToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function clampDuePickerDate(d: Date): Date {
  const min = startOfLocalToday();
  return d.getTime() < min.getTime() ? min : d;
}

function isAndroidPickerDismissed(event: { type?: string }): boolean {
  return Platform.OS === "android" && event.type === "dismissed";
}

function RadioRow({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const c = useFlareColors();
  return (
    <Pressable
      style={styles.radioRow}
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
    >
      <View style={[styles.radioOuter, { borderColor: c.cardBorder }]}>
        {selected ? <View style={[styles.radioInner, { backgroundColor: c.primary }]} /> : null}
      </View>
      <Text style={[styles.radioLabel, { color: c.text }]}>{label}</Text>
    </Pressable>
  );
}

/**
 * Add / edit a named order. Parent stays on the Stock tab (header “Stock”).
 */
export function MedicalSuppliesSetupScreen({
  user,
  startStep: startStepProp = STEP_INTRO,
  editKitId = null,
  onFinished,
  onDismiss,
}: {
  user: SessionUser;
  startStep?: number;
  /** When set, updates that order instead of creating a new one. */
  editKitId?: number | null;
  onFinished: (kitId: number, orderName: string) => void;
  onDismiss: () => void;
}) {
  const c = useFlareColors();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const bottomScrollInset = bottomTabBarScrollInset(insets.bottom);
  const errTextStyle = flareFieldErrorStyle(c, "input");

  const startStep = Math.min(Math.max(startStepProp, STEP_INTRO), STEP_LAST);
  const [step, setStep] = useState(startStep);
  /** Only spin when editing an existing order — new-order defaults are sync. */
  const [loading, setLoading] = useState(editKitId != null);
  const [kitName, setKitName] = useState(() => (editKitId != null ? "" : defaultKitFormValues(null).name));
  const [cadenceDays, setCadenceDays] = useState(() => defaultKitFormValues(null).cadenceDays);
  const [cadenceCustom, setCadenceCustom] = useState(false);
  const [customWeeksText, setCustomWeeksText] = useState("8");
  const [nextDueDate, setNextDueDate] = useState(() => defaultKitFormValues(null).nextDueDate);
  const [stepError, setStepError] = useState("");
  const [saving, setSaving] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [pickerDraftDate, setPickerDraftDate] = useState<Date | null>(null);
  const [alreadySetUp, setAlreadySetUp] = useState(false);
  /** When true, allow leaving the screen (Finish / dismiss) without stepBack hijacking. */
  const allowLeaveRef = useRef(false);

  const applyDefaults = useCallback((kitRow: Awaited<ReturnType<typeof fetchMedicalSupplyKit>>) => {
    const defaults = defaultKitFormValues(kitRow);
    setKitName(defaults.name);
    const days = defaults.cadenceDays;
    setCadenceDays(days);
    const custom = !isPresetCadenceDays(days);
    setCadenceCustom(custom);
    setCustomWeeksText(String(cadenceDaysToWeeks(custom ? days : 56)));
    setNextDueDate(defaults.nextDueDate);
    setAlreadySetUp(Boolean(kitRow?.next_due_date) || editKitId != null);
  }, [editKitId]);

  const load = useCallback(async () => {
    if (editKitId == null) {
      applyDefaults(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const kitRow = await fetchMedicalSupplyKit(user.id, editKitId);
      applyDefaults(kitRow);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Could not load supplies.";
      showFlareAlert("Could not load", message);
    } finally {
      setLoading(false);
    }
  }, [applyDefaults, editKitId, user.id]);

  useEffect(() => {
    setStep(startStep);
    setStepError("");
    void load();
  }, [load, startStep]);

  const leaveSetup = useCallback(() => {
    // Cancel / swipe-back always dismisses — never treat cancel as “finished”.
    allowLeaveRef.current = true;
    onDismiss();
  }, [onDismiss]);

  const stepBack = useCallback(() => {
    setStepError("");
    if (startStep >= STEP_NAME && step <= startStep) {
      leaveSetup();
      return;
    }
    if (step <= STEP_NAME) {
      leaveSetup();
      return;
    }
    setStep((s) => Math.max(STEP_NAME, s - 1));
  }, [leaveSetup, startStep, step]);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: "",
      // Finish uses replace — interactive pop + beforeRemove was stepping back to cadence.
      gestureEnabled: false,
      headerLeft: () => (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={{ top: 10, bottom: 10, left: 8, right: 20 }}
          onPress={stepBack}
          style={{ paddingLeft: 4, paddingVertical: 4 }}
        >
          <FlareLucideIcon icon={FLARE_CHROME_LUCIDE.back} size={24} color={c.textMuted} />
        </Pressable>
      ),
    });
  }, [c.textMuted, navigation, stepBack]);

  useFocusEffect(
    useCallback(() => {
      const onBack = () => {
        stepBack();
        return true;
      };
      const sub = BackHandler.addEventListener("hardwareBackPress", onBack);
      return () => sub.remove();
    }, [stepBack]),
  );

  const resolveCadenceDays = (): number | null => {
    if (!cadenceCustom) return normalizeCadenceDays(cadenceDays);
    const weeks = Number(customWeeksText.trim());
    if (!Number.isFinite(weeks) || weeks < 1 || weeks > 52 || !Number.isInteger(weeks)) {
      return null;
    }
    return weeksToCadenceDays(weeks);
  };

  const finishSetup = async () => {
    const name = sanitizeKitName(kitName);
    if (!name) {
      setStepError("Give this order a name.");
      setStep(STEP_NAME);
      return;
    }
    // Prefer live resolve; fall back to last confirmed cadenceDays from the cadence step.
    const days = resolveCadenceDays() ?? normalizeCadenceDays(cadenceDays);
    if (!Number.isFinite(days) || days < 1) {
      setStepError("Enter how many weeks between orders (1–52).");
      setStep(STEP_CADENCE);
      return;
    }
    if (!nextDueDate) {
      setStepError("Pick when your next order is due.");
      setStep(STEP_DUE);
      return;
    }
    if (nextDueDate < todayYmd()) {
      setStepError("Pick today or a future date.");
      setStep(STEP_DUE);
      return;
    }
    setSaving(true);
    setStepError("");
    allowLeaveRef.current = true;
    try {
      if (editKitId != null) {
        const updated = await updateMedicalSupplyKit(user.id, editKitId, {
          name,
          cadence_days: days,
          next_due_date: nextDueDate,
        });
        try {
          await rescheduleSupplyNotificationsForUser(user.id);
        } catch {
          // non-fatal
        }
        onFinished(updated.id, name);
      } else {
        const created = await insertMedicalSupplyKit(user.id, {
          name,
          cadence_days: days,
          next_due_date: nextDueDate,
        });
        try {
          await rescheduleSupplyNotificationsForUser(user.id);
        } catch {
          // non-fatal
        }
        onFinished(created.id, name);
      }
    } catch (err: unknown) {
      allowLeaveRef.current = false;
      const message = err instanceof Error ? err.message : "Could not save setup.";
      showFlareAlert("Could not save", message);
    } finally {
      setSaving(false);
    }
  };

  const goNext = () => {
    setStepError("");
    if (step === STEP_NAME) {
      if (!sanitizeKitName(kitName)) {
        setStepError("Give this order a name.");
        return;
      }
    }
    if (step === STEP_CADENCE) {
      if (resolveCadenceDays() == null) {
        setStepError("Enter how many weeks between orders (1–52).");
        return;
      }
      const days = resolveCadenceDays();
      if (days != null) setCadenceDays(days);
    }
    if (step === STEP_DUE) {
      if (!nextDueDate) {
        setStepError("Pick a date.");
        return;
      }
      if (nextDueDate < todayYmd()) {
        setStepError("Pick today or a future date.");
        return;
      }
      void finishSetup();
      return;
    }
    setStep((s) => Math.min(STEP_LAST, s + 1));
  };

  const handleDatePickerChange = (event: { type?: string }, d?: Date) => {
    if (Platform.OS === "android") {
      setDatePickerOpen(false);
      setPickerDraftDate(null);
      if (isAndroidPickerDismissed(event)) return;
      if (event.type === "set" && d) {
        setNextDueDate(formatYmdLocal(clampDuePickerDate(d)));
        setStepError("");
      }
      return;
    }
    setDatePickerOpen(false);
    setPickerDraftDate(null);
    if (event.type === "dismissed") return;
    if (d) {
      setNextDueDate(formatYmdLocal(clampDuePickerDate(d)));
      setStepError("");
    }
  };

  const questionTitle = useMemo(() => {
    switch (step) {
      case STEP_INTRO:
        return "Set up an order";
      case STEP_NAME:
        return "Choose a name";
      case STEP_CADENCE:
        return "How often do you order?";
      case STEP_DUE:
        return "When is your next order due?";
      default:
        return "";
    }
  }, [step]);

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: c.screen }]}>
        <ActivityIndicator color={c.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.screen }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: bottomScrollInset + SUPPLIES_SETUP_STEP_SCROLL_BOTTOM },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {step === STEP_DUE ? (
          <InfoHintTitleRow
            hintTitle="Due-day reminder"
            hintMessage="You'll get a phone notification at 9:00am on this date when the order has items and notifications are on."
            hintAccessibilityLabel="About due-day reminders"
          >
            <Text style={[styles.question, styles.questionBesideHint, { color: c.text }]}>
              {questionTitle}
            </Text>
          </InfoHintTitleRow>
        ) : (
          <Text style={[styles.question, { color: c.text }]}>{questionTitle}</Text>
        )}

        {step === STEP_INTRO ? (
          <Text style={[styles.support, { color: c.textMuted }]}>
            Set up orders once, then reuse them whenever you need to reorder.
          </Text>
        ) : null}

        {step === STEP_NAME ? (
          <View style={styles.nameBlock}>
            <Text style={[styles.support, styles.supportInBlock, { color: c.textMuted }]}>
              Let&apos;s give it a name so you can easily identify it.
            </Text>
            <View style={styles.fieldGroup}>
              <FlareScreenSectionTitle compact>Order name</FlareScreenSectionTitle>
              <FlareTextInput
                value={kitName}
                onChangeText={setKitName}
                placeholder="e.g. Home stoma"
                autoCapitalize="sentences"
                style={styles.fieldInput}
              />
            </View>
          </View>
        ) : null}

        {step === STEP_CADENCE ? (
          <View style={styles.block}>
            <View style={styles.radioList}>
              {SUPPLY_CADENCE_OPTIONS.map((opt) => (
                <RadioRow
                  key={opt.days}
                  label={opt.label}
                  selected={!cadenceCustom && cadenceDays === opt.days}
                  onPress={() => {
                    setCadenceCustom(false);
                    setCadenceDays(opt.days);
                    setStepError("");
                  }}
                />
              ))}
              <RadioRow
                label="Custom"
                selected={cadenceCustom}
                onPress={() => {
                  setCadenceCustom(true);
                  setCadenceDays(weeksToCadenceDays(Number(customWeeksText) || 8));
                  setStepError("");
                }}
              />
            </View>
            {cadenceCustom ? (
              <View style={styles.customWeeks}>
                <FlareScreenSectionTitle compact>Every how many weeks?</FlareScreenSectionTitle>
                <FlareTextInput
                  value={customWeeksText}
                  onChangeText={(text) => {
                    setCustomWeeksText(text.replace(/[^\d]/g, "").slice(0, 2));
                    setStepError("");
                  }}
                  placeholder="e.g. 8"
                  keyboardType="number-pad"
                  style={styles.fieldInput}
                />
              </View>
            ) : null}
          </View>
        ) : null}

        {step === STEP_DUE ? (
          <View style={styles.block}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Next due date"
              onPress={() => {
                const parsed = nextDueDate ? parseYmdLocal(nextDueDate) : startOfLocalToday();
                setPickerDraftDate(clampDuePickerDate(parsed));
                setDatePickerOpen(true);
              }}
              style={[styles.pickerPill, { backgroundColor: c.surfaceSubtle, borderColor: c.cardBorder }]}
            >
              <FlareLucideIcon icon={FLARE_CHROME_LUCIDE.calendar} size={FLARE_FONT_SIZE.sectionTitle} color={c.textSecondary} />
              <Text style={[styles.pickerPillText, { color: nextDueDate ? c.text : c.textMuted }]}>
                {nextDueDate ? formatUkDate(nextDueDate) : "Select date"}
              </Text>
            </Pressable>
          </View>
        ) : null}

        {stepError ? <Text style={[errTextStyle, styles.stepError]}>{stepError}</Text> : null}

        <View style={styles.actions}>
          <PrimaryButton
            title={
              saving
                ? "Saving…"
                : step === STEP_DUE
                  ? "Finish"
                  : step === STEP_INTRO
                    ? "Continue"
                    : "Next"
            }
            onPress={goNext}
            disabled={saving}
            noTopMargin
          />
          {step > STEP_NAME || startStep >= STEP_NAME ? (
            <SecondaryButton title="Back" onPress={stepBack} disabled={saving} noTopMargin />
          ) : null}
        </View>
      </ScrollView>

      {datePickerOpen ? (
        <DateTimePicker
          value={clampDuePickerDate(
            pickerDraftDate || (nextDueDate ? parseYmdLocal(nextDueDate) : startOfLocalToday()),
          )}
          mode="date"
          display="default"
          minimumDate={startOfLocalToday()}
          onChange={handleDatePickerChange}
        />
      ) : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  scroll: { ...SUPPLIES_SETUP_STEP_SCROLL },
  question: { ...SUPPLIES_SETUP_STEP_TITLE },
  questionBesideHint: {
    marginBottom: 0,
    flexShrink: 1,
  },
  support: { ...SUPPLIES_SETUP_STEP_SUPPORT },
  supportInBlock: { marginBottom: 0 },
  nameBlock: { gap: SUPPLIES_SETUP_STEP_NAME_BLOCK_GAP },
  fieldGroup: { gap: SUPPLIES_SETUP_STEP_BLOCK_GAP },
  block: { gap: SUPPLIES_SETUP_STEP_BLOCK_GAP },
  fieldInput: { marginTop: 0 },
  radioList: { ...SUPPLIES_SETUP_STEP_OPTION_LIST },
  customWeeks: {
    gap: SUPPLIES_SETUP_STEP_BLOCK_GAP,
    marginTop: SUPPLIES_SETUP_STEP_OPTION_LIST.marginTop,
  },
  radioRow: { ...SUPPLIES_SETUP_STEP_RADIO_ROW },
  radioOuter: {
    width: RADIO_OUTER_SIZE,
    height: RADIO_OUTER_SIZE,
    borderRadius: RADIO_OUTER_SIZE / 2,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  radioInner: {
    width: RADIO_INNER_SIZE,
    height: RADIO_INNER_SIZE,
    borderRadius: RADIO_INNER_SIZE / 2,
  },
  radioLabel: {
    flex: 1,
    fontSize: FLARE_FONT_SIZE.body,
    fontFamily: FLARE_FONT_FAMILY.regular,
  },
  pickerPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: SUPPLIES_SETUP_PICKER_PILL_GAP,
    borderWidth: 1,
    borderRadius: FLARE_INPUT_BORDER_RADIUS,
    paddingHorizontal: SCREEN_EDGE_PADDING,
    minHeight: flareInputStyles.trigger.minHeight,
  },
  pickerPillText: { flex: 1, fontSize: FLARE_FONT_SIZE.body, fontFamily: FLARE_FONT_FAMILY.regular },
  stepError: { marginTop: SUPPLIES_SETUP_STEP_BLOCK_GAP },
  actions: { ...SUPPLIES_SETUP_STEP_FOOTER },
});

export type MedicalSuppliesSetupParams = {
  editKitId?: number;
  startStep?: number;
};

/** Stack route — keeps setup off the My Supplies hub so back returns to the previous screen. */
export function MedicalSuppliesSetupRoute({ user }: { user: SessionUser }) {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const params = (route.params ?? {}) as MedicalSuppliesSetupParams;
  const editKitId =
    params.editKitId != null && Number.isFinite(Number(params.editKitId))
      ? Number(params.editKitId)
      : null;
  const startStep =
    params.startStep ?? (editKitId != null ? SUPPLIES_SETUP_STEP_NAME : SUPPLIES_SETUP_STEP_INTRO);

  return (
    <MedicalSuppliesSetupScreen
      user={user}
      startStep={startStep}
      editKitId={editKitId}
      onFinished={(kitId, orderName) => {
        // Finish leaves setup entirely: Home → this order. Back/swipe returns home.
        navigation.reset({
          index: 1,
          routes: [
            { name: "Dashboard" },
            { name: "MedicalSupplyOrder", params: { kitId, orderName } },
          ],
        });
      }}
      onDismiss={() => {
        if (navigation.canGoBack()) navigation.goBack();
        else navigation.navigate("Dashboard");
      }}
    />
  );
}
