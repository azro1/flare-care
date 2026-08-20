import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
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
  CARD_SECTION_INNER_GAP,
  COLLAPSING_TITLE_CONTENT_GAP,
  CONFIRM_MODAL_STACK_GAP,
  FLARE_FONT_FAMILY,
  FLARE_FONT_SIZE,
  FLARE_LINE_HEIGHT,
  HOME_TILE_GAP,
  INSTRUCTION_CARD_HEADER_GAP,
  RECENT_ACTIVITY_ROW_GAP,
  SCREEN_EDGE_PADDING,
  WIZARD_LANDING_SCROLL_TOP_PADDING,
  INFORMATIONAL_PAGE_HORIZONTAL_PADDING,
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
 * Add / edit a named order. Parent stays on the Supplies tab (header “Supplies setup”).
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
  onFinished: (kitId: number) => void;
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
    if (!alreadySetUp && startStep < STEP_NAME) {
      onDismiss();
      return;
    }
    if (editKitId != null) {
      onFinished(editKitId);
      return;
    }
    onDismiss();
  }, [alreadySetUp, editKitId, onDismiss, onFinished, startStep]);

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
      title: "Supplies",
      // Tab root — same as Dashboard / Logs / Account: leave via bottom nav, not a header back.
      headerLeft: () => null,
    });
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      const onBack = () => {
        // In-wizard: step back. On intro / first step of edit: dismiss (hub or stay on tab).
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
    const days = resolveCadenceDays();
    if (days == null) {
      setStepError("Enter how many weeks between orders (1–52).");
      setStep(STEP_CADENCE);
      return;
    }
    if (!nextDueDate) {
      setStepError("Pick when your next order is due.");
      setStep(STEP_DUE);
      return;
    }
    setSaving(true);
    setStepError("");
    try {
      if (editKitId != null) {
        const updated = await updateMedicalSupplyKit(user.id, editKitId, {
          name,
          cadence_days: days,
          next_due_date: nextDueDate,
        });
        onFinished(updated.id);
      } else {
        const created = await insertMedicalSupplyKit(user.id, {
          name,
          cadence_days: days,
          next_due_date: nextDueDate,
        });
        onFinished(created.id);
      }
    } catch (err: unknown) {
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
        setNextDueDate(formatYmdLocal(d));
        setStepError("");
      }
      return;
    }
    setDatePickerOpen(false);
    setPickerDraftDate(null);
    if (event.type === "dismissed") return;
    if (d) {
      setNextDueDate(formatYmdLocal(d));
      setStepError("");
    }
  };

  const questionTitle = useMemo(() => {
    switch (step) {
      case STEP_INTRO:
        return "Let’s set up a supply order";
      case STEP_NAME:
        return "What shall we call this order?";
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
          { paddingBottom: bottomScrollInset + COLLAPSING_TITLE_CONTENT_GAP + INFORMATIONAL_PAGE_HORIZONTAL_PADDING },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.question, { color: c.text }]}>{questionTitle}</Text>

        {step === STEP_INTRO ? (
          <Text style={[styles.support, { color: c.textMuted }]}>
            Set up stock orders once and reuse them whenever you need to reorder.
          </Text>
        ) : null}

        {step === STEP_NAME ? (
          <View style={styles.nameBlock}>
            <Text style={[styles.support, styles.supportInBlock, { color: c.textMuted }]}>
              Give each order a name so you can easily identify and switch between your orders.
            </Text>
            <View style={styles.fieldGroup}>
              <FlareScreenSectionTitle compact>Order name</FlareScreenSectionTitle>
              <FlareTextInput
                value={kitName}
                onChangeText={setKitName}
                placeholder="e.g. My stock order"
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
                setPickerDraftDate(nextDueDate ? parseYmdLocal(nextDueDate) : new Date());
                setDatePickerOpen(true);
              }}
              style={[styles.pickerPill, { backgroundColor: c.surfaceSubtle, borderColor: c.cardBorder }]}
            >
              <Ionicons name="calendar-outline" size={FLARE_FONT_SIZE.sectionTitle} color={c.textSecondary} />
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
          />
          {step > STEP_NAME || startStep >= STEP_NAME ? (
            <SecondaryButton title="Back" onPress={stepBack} disabled={saving} />
          ) : null}
        </View>
      </ScrollView>

      {datePickerOpen ? (
        <DateTimePicker
          value={pickerDraftDate || (nextDueDate ? parseYmdLocal(nextDueDate) : new Date())}
          mode="date"
          display="default"
          onChange={handleDatePickerChange}
        />
      ) : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  scroll: {
    paddingHorizontal: INFORMATIONAL_PAGE_HORIZONTAL_PADDING,
    paddingTop: WIZARD_LANDING_SCROLL_TOP_PADDING,
  },
  question: {
    fontFamily: FLARE_FONT_FAMILY.bold,
    fontSize: 20,
    marginBottom: CARD_SECTION_INNER_GAP,
  },
  support: {
    fontSize: FLARE_FONT_SIZE.body,
    fontFamily: FLARE_FONT_FAMILY.regular,
    lineHeight: FLARE_LINE_HEIGHT.body,
    marginBottom: COLLAPSING_TITLE_CONTENT_GAP,
  },
  supportInBlock: { marginBottom: 0 },
  nameBlock: { gap: HOME_TILE_GAP },
  fieldGroup: { gap: CARD_SECTION_INNER_GAP },
  block: { gap: CARD_SECTION_INNER_GAP },
  fieldInput: { marginTop: 0 },
  radioList: { gap: RECENT_ACTIVITY_ROW_GAP, marginTop: CONFIRM_MODAL_STACK_GAP },
  customWeeks: { gap: CARD_SECTION_INNER_GAP, marginTop: CONFIRM_MODAL_STACK_GAP },
  radioRow: { flexDirection: "row", alignItems: "center", gap: INSTRUCTION_CARD_HEADER_GAP },
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
    gap: CONFIRM_MODAL_STACK_GAP,
    borderWidth: 1,
    borderRadius: FLARE_INPUT_BORDER_RADIUS,
    paddingHorizontal: SCREEN_EDGE_PADDING,
    minHeight: flareInputStyles.trigger.minHeight,
  },
  pickerPillText: { flex: 1, fontSize: FLARE_FONT_SIZE.body, fontFamily: FLARE_FONT_FAMILY.regular },
  stepError: { marginTop: CARD_SECTION_INNER_GAP },
  actions: { gap: CONFIRM_MODAL_STACK_GAP, marginTop: COLLAPSING_TITLE_CONTENT_GAP },
});
