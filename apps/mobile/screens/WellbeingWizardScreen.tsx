import { CommonActions, useNavigation, useRoute } from "@react-navigation/native";
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { FlareLucideIcon } from "../lib/flareLucideIcons";
import {
  ActivityIndicator,
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { showFlareAlert, dismissFlareAlert } from "../components/FlareAlertHost";
import { ScrollView } from "../lib/scrollViews";
import { PrimaryButton, SecondaryButton } from "../components/FlareButton";
import { flareFieldErrorStyle, FlareTextInput } from "../components/FlareInput";
import { WizardReviewSection, WizardReviewNotesSection, type WizardReviewField } from "../components/symptomReviewLayout";
import { invalidateDashboardSnapshot } from "../lib/dashboardSnapshotCache";
import { recordRecentActivityEvent } from "../lib/recentActivityEvents";
import {
  FLARE_FONT_FAMILY,
  FLARE_FONT_SIZE,
  FULL_WIDTH_CTA_EDGE_PADDING,
  LANDING_CTA_SIDE_PAD,
  wizardLandingMinHeight,
} from "../lib/layoutConstants";
import {
  getTodayWellbeingEntry,
  invalidateWellbeingListCache,
  quickWellbeingFormState,
  SCALE_OPTIONS_MOOD,
  SCALE_OPTIONS_SEVERITY,
  WELLBEING_ICON,
  wellbeingPayloadFromForm,
  type WellbeingFormState,
  type WellbeingScale,
} from "../lib/wellbeingShared";
import { wellbeingWizardTryAdvance } from "../lib/wellbeingWizardNextStep";
import {
  cloneWellbeingForm,
  formatWellbeingScaleDisplay,
  formatWellbeingYesNoDisplay,
  getPreviousWellbeingStep,
  getWellbeingReviewEditStep,
  getWellbeingReviewSectionLastStep,
  getWellbeingWizardPhaseProgress,
  wellbeingFormFromRow,
  WELLBEING_WIZARD_REVIEW_STEP,
  type WellbeingReviewSectionId,
} from "../lib/wellbeingWizardShared";
import { supabase, TABLES } from "../lib/supabase";
import { useFlareColors } from "../theme";

type SessionUser = { id: string };

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
      <Text style={{ color: c.text, flex: 1 }}>{label}</Text>
    </Pressable>
  );
}

export function WellbeingWizardScreen({ user }: { user: SessionUser }) {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const editId = String((route.params as { editId?: string } | undefined)?.editId ?? "");
  const c = useFlareColors();
  const errTextStyle = flareFieldErrorStyle(c, "wizard");
  const { height: windowHeight } = useWindowDimensions();

  const [loadingEdit, setLoadingEdit] = useState(Boolean(editId));
  const [currentStep, setCurrentStep] = useState(0);
  const [form, setForm] = useState<WellbeingFormState>(() => quickWellbeingFormState());
  const [history, setHistory] = useState<{ step: number; form: WellbeingFormState }[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [editingReviewSection, setEditingReviewSection] = useState<WellbeingReviewSectionId | null>(null);

  const phase = useMemo(() => getWellbeingWizardPhaseProgress(currentStep), [currentStep]);

  useEffect(() => {
    if (!editId) return;
    let cancelled = false;
    (async () => {
      setLoadingEdit(true);
      const { data, error } = await supabase
        .from(TABLES.DAILY_WELLBEING)
        .select("*")
        .eq("user_id", user.id)
        .eq("id", editId)
        .maybeSingle();
      if (cancelled) return;
      if (error || !data) {
        showFlareAlert("Could not load entry", "This wellbeing log could not be opened for editing.");
        navigation.goBack();
        return;
      }
      setForm(wellbeingFormFromRow(data));
      setCurrentStep(WELLBEING_WIZARD_REVIEW_STEP);
      setHistory([]);
      setLoadingEdit(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [editId, navigation, user.id]);

  const returnToReview = useCallback(() => {
    setCurrentStep(WELLBEING_WIZARD_REVIEW_STEP);
    setEditingReviewSection(null);
    setFieldErrors({});
  }, []);

  const openReviewEdit = useCallback((section: WellbeingReviewSectionId) => {
    setEditingReviewSection(section);
    setCurrentStep(getWellbeingReviewEditStep(section));
    setFieldErrors({});
  }, []);

  const goBackInternal = useCallback(() => {
    if (currentStep === WELLBEING_WIZARD_REVIEW_STEP && !editingReviewSection) {
      navigation.goBack();
      return true;
    }
    if (editingReviewSection) {
      const entryStep = getWellbeingReviewEditStep(editingReviewSection);
      if (currentStep === entryStep) {
        returnToReview();
        return true;
      }
      const previousStep = getPreviousWellbeingStep(currentStep);
      if (previousStep != null && previousStep >= entryStep) {
        setCurrentStep(previousStep);
        setFieldErrors({});
        return true;
      }
      returnToReview();
      return true;
    }
    const prev = history[history.length - 1];
    if (prev) {
      if (prev.step <= 0) {
        navigation.goBack();
        return true;
      }
      setHistory((h) => h.slice(0, -1));
      setCurrentStep(prev.step);
      setForm(prev.form);
      setFieldErrors({});
      return true;
    }
    const previousStep = getPreviousWellbeingStep(currentStep);
    // Don't return to landing (step 0) — exit the wizard like Log Symptoms / Track Medications.
    if (previousStep != null && previousStep > 0) {
      setCurrentStep(previousStep);
      setFieldErrors({});
      return true;
    }
    navigation.goBack();
    return true;
  }, [currentStep, editingReviewSection, history, navigation, returnToReview]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: currentStep === WELLBEING_WIZARD_REVIEW_STEP && !editingReviewSection ? "Review" : "",
    });
  }, [navigation, currentStep, editingReviewSection]);

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", goBackInternal);
    return () => sub.remove();
  }, [goBackInternal]);

  const setField = <K extends keyof WellbeingFormState>(key: K, value: WellbeingFormState[K]) => {
    setForm((prev) => {
      if (key === "exercised" && value === false) {
        return { ...prev, exercised: false, exercise_minutes: "" };
      }
      return { ...prev, [key]: value };
    });
    setFieldErrors((prev) => ({ ...prev, [key]: "" }));
  };

  const applyAdvance = useCallback(() => {
    const res = wellbeingWizardTryAdvance({ currentStep, form });
    if (!res.ok) {
      setFieldErrors(res.fieldErrors);
      return;
    }
    setFieldErrors({});
    if (editingReviewSection) {
      const sectionLast = getWellbeingReviewSectionLastStep(editingReviewSection);
      if (res.nextStep > sectionLast) {
        returnToReview();
        return;
      }
      setCurrentStep(res.nextStep);
      return;
    }
    if (res.nextStep === WELLBEING_WIZARD_REVIEW_STEP) {
      setEditingReviewSection(null);
    }
    setHistory((h) => [...h, { step: currentStep, form: cloneWellbeingForm(form) }]);
    setCurrentStep(res.nextStep);
  }, [currentStep, editingReviewSection, form, returnToReview]);

  /** Keep alert up until Dashboard paints (logout/Done overlay pattern) — no blank-cover jump. */
  const showAlreadyCheckedInToday = useCallback(() => {
    showFlareAlert(
      "Already checked in today",
      "You've already completed your wellbeing check-in today. You can view or edit it anytime from Logs.",
      [
        {
          text: "OK",
          onPress: () => {
            navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: "Dashboard" }] }));
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                dismissFlareAlert();
              });
            });
          },
        },
      ],
      { holdUntilDismissed: true },
    );
  }, [navigation]);

  const startWizard = async () => {
    if (!editId) {
      const existing = await getTodayWellbeingEntry(user.id, form.date);
      if (existing) {
        showAlreadyCheckedInToday();
        return;
      }
    }
    setHistory([{ step: 0, form: cloneWellbeingForm(form) }]);
    setCurrentStep(1);
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      const payload = wellbeingPayloadFromForm(form);
      if (editId) {
        const { error } = await supabase
          .from(TABLES.DAILY_WELLBEING)
          .update(payload)
          .eq("id", editId)
          .eq("user_id", user.id);
        if (error) throw error;
        await recordRecentActivityEvent(user.id, "wellbeing-updated");
        invalidateDashboardSnapshot(user.id);
        invalidateWellbeingListCache(user.id);
        navigation.goBack();
        showFlareAlert("Saved", "Your wellbeing log was updated.");
      } else {
        const existing = await getTodayWellbeingEntry(user.id, form.date);
        if (existing) {
          showAlreadyCheckedInToday();
          return;
        }
        const { error } = await supabase
          .from(TABLES.DAILY_WELLBEING)
          .insert([{ ...payload, user_id: user.id }]);
        if (error) throw error;
        await recordRecentActivityEvent(user.id, "wellbeing-logged");
        invalidateDashboardSnapshot(user.id);
        invalidateWellbeingListCache(user.id);
        navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: "Dashboard" }] }));
        showFlareAlert("Saved", "Your wellbeing log was saved.");
      }
    } catch (e: unknown) {
      showFlareAlert("Could not save", e instanceof Error ? e.message : "Unknown error");
    } finally {
      setSubmitting(false);
    }
  };

  const reviewFeelingsFields = useMemo((): WizardReviewField[] => [
    { label: "Mood", value: formatWellbeingScaleDisplay(form.mood) },
    { label: "Energy", value: formatWellbeingScaleDisplay(form.energy) },
    { label: "Sleep quality", value: formatWellbeingScaleDisplay(form.sleep_quality) },
    { label: "Anxiety", value: formatWellbeingScaleDisplay(form.anxiety) },
    { label: "Pain / discomfort", value: formatWellbeingScaleDisplay(form.pain) },
    { label: "IBD impact", value: formatWellbeingScaleDisplay(form.ibd_impact) },
    { label: "Brain fog", value: formatWellbeingScaleDisplay(form.brain_fog) },
  ], [form]);

  const reviewActivitiesFields = useMemo((): WizardReviewField[] => [
    { label: "Exercised", value: formatWellbeingYesNoDisplay(form.exercised, form.exercise_minutes) },
    { label: "Social interaction", value: formatWellbeingYesNoDisplay(form.social_connection) },
    { label: "Time outdoors", value: formatWellbeingYesNoDisplay(form.time_outdoors) },
  ], [form]);

  if (loadingEdit) {
    return (
      <View style={[styles.centered, { backgroundColor: c.screen }]}>
        <ActivityIndicator color={c.primary} />
      </View>
    );
  }

  const scaleStep = (field: keyof WellbeingFormState, options: { value: WellbeingScale; label: string }[], title: string) => (
    <View>
      <Text style={[styles.h3, { color: c.text }]}>{title}</Text>
      <View style={styles.rowGap}>
        {options.map((opt) => (
          <RadioRow
            key={opt.value}
            label={opt.label}
            selected={form[field] === opt.value}
            onPress={() => setField(field, opt.value as WellbeingFormState[typeof field])}
          />
        ))}
      </View>
      {fieldErrors[field] ? <Text style={errTextStyle}>{fieldErrors[field]}</Text> : null}
    </View>
  );

  const yesNoStep = (field: "exercised" | "social_connection" | "time_outdoors", title: string) => (
    <View>
      <Text style={[styles.h3, { color: c.text }]}>{title}</Text>
      <View style={styles.rowGap}>
        <RadioRow label="Yes" selected={form[field] === true} onPress={() => setField(field, true)} />
        <RadioRow label="No" selected={form[field] === false} onPress={() => setField(field, false)} />
      </View>
      {fieldErrors[field] ? <Text style={errTextStyle}>{fieldErrors[field]}</Text> : null}
    </View>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.screen }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={styles.wizardShell}>
        <ScrollView
          contentContainerStyle={[
            styles.scrollPad,
            currentStep === 0 ? styles.scrollPadLanding : styles.scrollPadWizardSteps,
          ]}
          keyboardShouldPersistTaps="handled"
        >
          {currentStep > 0 && phase.sectionTotal > 0 ? (
            <Text style={[styles.phaseLine, { color: c.textMuted }]}>
              Section {phase.sectionStep}/{phase.sectionTotal}: {phase.currentPhaseLabel}
            </Text>
          ) : null}

          {currentStep === 0 ? (
            <View style={[styles.landing, { minHeight: wizardLandingMinHeight(windowHeight) }]}>
              <View
                style={[
                  styles.landingIconPanel,
                  {
                    backgroundColor: c.card,
                    ...Platform.select({
                      ios: {
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: c.isDark ? 0.3 : 0.05,
                        shadowRadius: 2,
                      },
                      android: { elevation: 2 },
                    }),
                  },
                ]}
              >
                <FlareLucideIcon icon={WELLBEING_ICON} size={28} color={c.primary} />
              </View>
              <Text style={[styles.landingTitle, { color: c.text }]}>My Wellbeing</Text>
              <Text style={[styles.landingSub, { color: c.textMuted }]}>
                Check in on how you&apos;re feeling today — mood, energy, sleep and more.
              </Text>
              <View style={styles.landingCta}>
                <PrimaryButton title="Start now" onPress={startWizard} noTopMargin />
              </View>
            </View>
          ) : null}

          {currentStep === 1 ? scaleStep("mood", SCALE_OPTIONS_MOOD, "How is your mood today?") : null}
          {currentStep === 2 ? scaleStep("energy", SCALE_OPTIONS_MOOD, "How are your energy levels today?") : null}
          {currentStep === 3 ? scaleStep("sleep_quality", SCALE_OPTIONS_MOOD, "How well did you sleep last night?") : null}
          {currentStep === 4 ? scaleStep("anxiety", SCALE_OPTIONS_SEVERITY, "How anxious are you feeling today?") : null}
          {currentStep === 5 ? scaleStep("pain", SCALE_OPTIONS_SEVERITY, "How much pain or discomfort are you in today?") : null}
          {currentStep === 6 ? scaleStep("ibd_impact", SCALE_OPTIONS_SEVERITY, "How much has IBD affected your day?") : null}
          {currentStep === 7 ? scaleStep("brain_fog", SCALE_OPTIONS_SEVERITY, "Are you experiencing any brain fog today?") : null}

          {currentStep === 8 ? (
            <View>
              {yesNoStep("exercised", "Did you exercise today?")}
              {form.exercised === true ? (
                <View style={{ marginTop: 20 }}>
                  <Text style={[styles.subLabel, { color: c.textMuted }]}>How many minutes? (optional)</Text>
                  <FlareTextInput
                    value={form.exercise_minutes}
                    onChangeText={(t) => {
                      if (t.length > 3) return;
                      const n = parseInt(t, 10);
                      if (t && (Number.isNaN(n) || n < 0)) return;
                      setField("exercise_minutes", t);
                    }}
                    placeholder="e.g. 30"
                    keyboardType="number-pad"
                  />
                </View>
              ) : null}
            </View>
          ) : null}

          {currentStep === 9 ? yesNoStep("social_connection", "Did you have any social interaction today?") : null}
          {currentStep === 10 ? yesNoStep("time_outdoors", "Did you spend time outdoors today?") : null}

          {currentStep === 11 ? (
            <View>
              <Text style={[styles.h3, { color: c.text }]}>Any additional notes?</Text>
              <FlareTextInput
                multiline
                value={form.notes}
                onChangeText={(t) => setField("notes", t)}
                placeholder="Anything else worth noting today… (optional)"
              />
            </View>
          ) : null}

          {currentStep === WELLBEING_WIZARD_REVIEW_STEP ? (
            <View>
              <WizardReviewSection title="Feelings" fields={reviewFeelingsFields} onEdit={() => openReviewEdit("feelings")} />
              <WizardReviewSection title="Activities" fields={reviewActivitiesFields} onEdit={() => openReviewEdit("activities")} />
              <WizardReviewNotesSection notes={form.notes} onEdit={() => openReviewEdit("notes")} />
            </View>
          ) : null}

          {currentStep > 0 ? (
            <View
              style={[
                styles.footerBtns,
                currentStep === WELLBEING_WIZARD_REVIEW_STEP && !editingReviewSection && styles.footerBtnsReview,
              ]}
            >
              {editingReviewSection ? (
                <>
                  <PrimaryButton title="Back to review" onPress={returnToReview} />
                  {currentStep < getWellbeingReviewSectionLastStep(editingReviewSection) ? (
                    <SecondaryButton title="Next" onPress={applyAdvance} />
                  ) : null}
                </>
              ) : currentStep < WELLBEING_WIZARD_REVIEW_STEP ? (
                <PrimaryButton title="Next" onPress={applyAdvance} />
              ) : (
                <PrimaryButton
                  title={submitting ? "Saving…" : editId ? "Save changes" : "Submit"}
                  onPress={submit}
                  disabled={submitting}
                />
              )}
              {currentStep > 1 && !editingReviewSection && currentStep !== WELLBEING_WIZARD_REVIEW_STEP ? (
                <SecondaryButton title="Previous step" onPress={goBackInternal} />
              ) : null}
            </View>
          ) : null}
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  wizardShell: { flex: 1 },
  scrollPad: { paddingTop: 16, paddingBottom: 48 },
  scrollPadLanding: { flexGrow: 1, paddingHorizontal: FULL_WIDTH_CTA_EDGE_PADDING },
  scrollPadWizardSteps: { paddingTop: 12, paddingHorizontal: 16 },
  landing: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 8,
    paddingBottom: 36,
    width: "100%",
  },
  landingIconPanel: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 32,
  },
  landingTitle: {
    fontFamily: FLARE_FONT_FAMILY.extrabold,
    fontSize: 22,
    lineHeight: 28,
    marginBottom: 20,
    textAlign: "center",
    letterSpacing: -0.4,
    maxWidth: 360,
    width: "100%",
  },
  landingSub: {
    fontSize: 16,
    lineHeight: 22,
    textAlign: "center",
    marginBottom: 0,
    paddingHorizontal: 4,
    maxWidth: 360,
    width: "100%",
  },
  landingCta: { width: "100%", paddingHorizontal: LANDING_CTA_SIDE_PAD, marginTop: 28 },
  phaseLine: { fontSize: 13, marginBottom: 12, fontFamily: FLARE_FONT_FAMILY.medium },
  h3: { fontFamily: FLARE_FONT_FAMILY.bold, fontSize: 20, lineHeight: 28, marginBottom: 12 },
  subLabel: { fontSize: FLARE_FONT_SIZE.body, fontFamily: FLARE_FONT_FAMILY.medium, marginBottom: 6 },
  rowGap: { gap: 14, marginTop: 8 },
  radioRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  radioOuter: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  radioInner: { width: 12, height: 12, borderRadius: 6 },
  footerBtns: { marginTop: 24, gap: 10 },
  footerBtnsReview: { marginTop: 0 },
});
