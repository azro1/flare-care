import { CommonActions, useNavigation, useRoute } from "@react-navigation/native";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FlareLucideIcon } from "../lib/flareLucideIcons";
import { PenLine } from "lucide-react-native";
import {
  ActivityIndicator,
  BackHandler,
  InteractionManager,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ScrollView as RNScrollView,
} from "react-native";
import { showFlareAlert, dismissFlareAlert } from "../components/FlareAlertHost";
import { ScrollView } from "../lib/scrollViews";
import { PrimaryButton, SecondaryButton } from "../components/FlareButton";
import { Card } from "../components/MidnightLagoonCard";
import { SectionLabel } from "../components/MidnightLagoonSectionLabel";
import { OptionChip } from "../components/OptionChip";
import { WizardProgressBar } from "../components/WizardProgressBar";
import { flareFieldErrorStyle, FlareTextInput } from "../components/FlareInput";
import type { WizardReviewField } from "../components/symptomReviewLayout";
import { invalidateDashboardSnapshot } from "../lib/dashboardSnapshotCache";
import { recordRecentActivityEvent } from "../lib/recentActivityEvents";
import { SPACING, TYPOGRAPHY } from "../designTokens";
import {
  getTodayWellbeingEntry,
  invalidateWellbeingListCache,
  quickWellbeingFormState,
  SCALE_OPTIONS_MOOD,
  SCALE_OPTIONS_ENERGY,
  SCALE_OPTIONS_SLEEP,
  SCALE_OPTIONS_ANXIETY,
  SCALE_OPTIONS_PAIN,
  SCALE_OPTIONS_IBD,
  SCALE_OPTIONS_BRAIN_FOG,
  labelForWellbeingScale,
  WELLBEING_ICON,
  wellbeingPayloadFromForm,
  type WellbeingFormState,
  type WellbeingScale,
} from "../lib/wellbeingShared";
import { wellbeingWizardTryAdvance } from "../lib/wellbeingWizardNextStep";
import {
  cloneWellbeingForm,
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

function ReviewSectionCard({
  title,
  onEdit,
  children,
}: {
  title: string;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  const c = useFlareColors();
  return (
    <Card>
      <View style={styles.reviewCardHeader}>
        <View style={styles.reviewInCardLabelWrap}>
          <SectionLabel style={styles.reviewInCardLabel}>{title}</SectionLabel>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Edit ${title}`}
          onPress={onEdit}
          hitSlop={10}
          style={[styles.reviewEditBtn, { backgroundColor: c.surfaceSubtle }]}
        >
          <FlareLucideIcon icon={PenLine} size={16} color={c.primary} />
        </Pressable>
      </View>
      {children}
    </Card>
  );
}

function ReviewFieldRows({ fields }: { fields: { label: string; value: string }[] }) {
  const c = useFlareColors();
  return (
    <>
      {fields.map((field, i) => (
        <View key={`${field.label}-${i}`} style={[styles.reviewFieldRow, i > 0 && styles.reviewFieldRowGap]}>
          <Text style={[styles.reviewFieldLabel, { color: c.textSecondary, fontFamily: TYPOGRAPHY.fontFamily.regular }]}>{field.label}</Text>
          <Text style={[styles.reviewFieldValue, { color: c.text, fontFamily: TYPOGRAPHY.fontFamily.medium }]}>{field.value}</Text>
        </View>
      ))}
    </>
  );
}

export function WellbeingWizardScreen({ user }: { user: SessionUser }) {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const editId = String((route.params as { editId?: string } | undefined)?.editId ?? "");
  const presetMoodRaw = Number((route.params as { mood?: number } | undefined)?.mood);
  const presetMood: WellbeingScale | null =
    !editId && (presetMoodRaw === 1 || presetMoodRaw === 2 || presetMoodRaw === 3 || presetMoodRaw === 4 || presetMoodRaw === 5)
      ? presetMoodRaw
      : null;
  const c = useFlareColors();
  const errTextStyle = flareFieldErrorStyle(c, "wizard");

  const [loadingEdit, setLoadingEdit] = useState(Boolean(editId));
  const [currentStep, setCurrentStep] = useState(presetMood ? 2 : 0);
  const [form, setForm] = useState<WellbeingFormState>(() => {
    const base = quickWellbeingFormState();
    if (presetMood) base.mood = presetMood;
    return base;
  });
  const [history, setHistory] = useState<{ step: number; form: WellbeingFormState }[]>(() => {
    if (!presetMood) return [];
    const prior = quickWellbeingFormState();
    prior.mood = presetMood;
    return [{ step: 0, form: cloneWellbeingForm(prior) }];
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [editingReviewSection, setEditingReviewSection] = useState<WellbeingReviewSectionId | null>(null);
  const scrollRef = useRef<RNScrollView>(null);
  const formRef = useRef(form);
  const advancingRef = useRef(false);
  formRef.current = form;

  const phase = useMemo(() => getWellbeingWizardPhaseProgress(currentStep), [currentStep]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
    advancingRef.current = false;
  }, [currentStep]);

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

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", goBackInternal);
    return () => sub.remove();
  }, [goBackInternal]);

  const setField = <K extends keyof WellbeingFormState>(key: K, value: WellbeingFormState[K]) => {
    setForm((prev) => {
      const next =
        key === "exercised" && value === false
          ? { ...prev, exercised: false as const, exercise_minutes: "" }
          : { ...prev, [key]: value };
      formRef.current = next;
      return next;
    });
    setFieldErrors((prev) => ({ ...prev, [key]: "" }));
  };

  const advanceFrom = useCallback(
    (source: WellbeingFormState) => {
      if (advancingRef.current) return;
      const res = wellbeingWizardTryAdvance({ currentStep, form: source });
      if (!res.ok) {
        formRef.current = source;
        setForm(source);
        setFieldErrors(res.fieldErrors);
        return;
      }
      formRef.current = source;
      setForm(source);
      setFieldErrors({});
      advancingRef.current = true;
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
      setHistory((h) => [...h, { step: currentStep, form: cloneWellbeingForm(source) }]);
      setCurrentStep(res.nextStep);
    },
    [currentStep, editingReviewSection, returnToReview],
  );

  const applyAdvance = useCallback(() => {
    advanceFrom(formRef.current);
  }, [advanceFrom]);

  /** One completed answer moves on. Back restores it and does not advance again. */
  const chooseSingle = useCallback(
    (patch: Partial<WellbeingFormState>) => {
      const next = { ...formRef.current, ...patch };
      if (patch.exercised === false) next.exercise_minutes = "";
      advanceFrom(next);
    },
    [advanceFrom],
  );

  /** Keep alert up until Dashboard paints (logout/Done overlay pattern) — no blank-cover jump. */
  const showAlreadyCheckedInToday = useCallback(() => {
    showFlareAlert(
      "Already checked in today",
      "You've already completed your wellbeing check-in for today. Come back tomorrow.",
      [
        {
          text: "OK",
          onPress: () => {
            // Prefer pop so the existing Dashboard stays mounted; hold the modal until the
            // transition finishes so the wizard never flashes under the dismiss.
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: "Today" }] }));
            }
            InteractionManager.runAfterInteractions(() => {
              requestAnimationFrame(() => dismissFlareAlert());
            });
          },
        },
      ],
      { holdUntilDismissed: true },
    );
  }, [navigation]);

  useEffect(() => {
    if (!presetMood) return;
    let cancelled = false;
    void (async () => {
      const existing = await getTodayWellbeingEntry(user.id, form.date);
      if (cancelled || !existing) return;
      showAlreadyCheckedInToday();
    })();
    return () => {
      cancelled = true;
    };
  }, [form.date, presetMood, showAlreadyCheckedInToday, user.id]);

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
        showFlareAlert("Saved");
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
        navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: "Today" }] }));
        showFlareAlert("Saved", "To view, see History in Track");
      }
    } catch (e: unknown) {
      showFlareAlert("Could not save", e instanceof Error ? e.message : "Unknown error");
    } finally {
      setSubmitting(false);
    }
  };

  const reviewFeelingsFields = useMemo((): WizardReviewField[] => [
    { label: "Mood", value: labelForWellbeingScale(SCALE_OPTIONS_MOOD, form.mood) },
    { label: "Energy", value: labelForWellbeingScale(SCALE_OPTIONS_ENERGY, form.energy) },
    { label: "Sleep quality", value: labelForWellbeingScale(SCALE_OPTIONS_SLEEP, form.sleep_quality) },
    { label: "Anxiety", value: labelForWellbeingScale(SCALE_OPTIONS_ANXIETY, form.anxiety) },
  ], [form]);

  const reviewIbdFields = useMemo((): WizardReviewField[] => [
    { label: "Pain / discomfort", value: labelForWellbeingScale(SCALE_OPTIONS_PAIN, form.pain) },
    { label: "IBD impact", value: labelForWellbeingScale(SCALE_OPTIONS_IBD, form.ibd_impact) },
    { label: "Brain fog", value: labelForWellbeingScale(SCALE_OPTIONS_BRAIN_FOG, form.brain_fog) },
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
    <View style={styles.stepContent}>
      <Text style={[styles.stepTitle, { color: c.text, fontFamily: TYPOGRAPHY.fontFamily.semibold }]}>{title}</Text>
      <View style={styles.optionChipGrid}>
        {options.map((opt) => (
          <OptionChip
            key={opt.value}
            label={opt.label}
            selected={form[field] === opt.value}
            onPress={() => chooseSingle({ [field]: opt.value } as Partial<WellbeingFormState>)}
          />
        ))}
      </View>
      {fieldErrors[field] ? <Text style={errTextStyle}>{fieldErrors[field]}</Text> : null}
    </View>
  );

  const yesNoStep = (field: "exercised" | "social_connection" | "time_outdoors", title: string) => (
    <View style={styles.stepContent}>
      <Text style={[styles.stepTitle, { color: c.text, fontFamily: TYPOGRAPHY.fontFamily.semibold }]}>{title}</Text>
      <View style={styles.optionChipRow}>
        <OptionChip label="Yes" selected={form[field] === true} onPress={() => chooseSingle({ [field]: true })} />
        <OptionChip label="No" selected={form[field] === false} onPress={() => chooseSingle({ [field]: false })} />
      </View>
      {fieldErrors[field] ? <Text style={errTextStyle}>{fieldErrors[field]}</Text> : null}
    </View>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.screen }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={styles.wizardShell}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[
            styles.scrollPad,
            currentStep === 0 ? styles.scrollPadLanding : styles.scrollPadWizardSteps,
            currentStep === WELLBEING_WIZARD_REVIEW_STEP && !editingReviewSection ? styles.scrollPadReview : null,
          ]}
          keyboardShouldPersistTaps="handled"
        >
          {currentStep > 0 && currentStep !== WELLBEING_WIZARD_REVIEW_STEP && phase.sectionTotal > 0 ? (
            <View style={styles.progressWrap}>
              <Text style={[styles.progressLabel, { color: c.textMuted, fontFamily: TYPOGRAPHY.fontFamily.regular }]}>
                {phase.currentPhaseLabel} • {phase.sectionStep}/{phase.sectionTotal}
              </Text>
              <WizardProgressBar current={phase.sectionStep} total={phase.sectionTotal} />
            </View>
          ) : null}

          {currentStep === 0 ? (
            <View style={styles.landing}>
              <Card style={styles.landingCard}>
                <View style={styles.landingIconWrap}>
                  <FlareLucideIcon icon={WELLBEING_ICON} size={48} color={c.primary} />
                </View>
                <Text style={[styles.landingTitle, { color: c.text, fontFamily: TYPOGRAPHY.fontFamily.bold }]}>My Wellbeing</Text>
                <Text style={[styles.landingDesc, { color: c.textSecondary, fontFamily: TYPOGRAPHY.fontFamily.regular }]}>Check in on how you&apos;re feeling today — mood, energy, sleep and more.</Text>
                <PrimaryButton title="Start now" onPress={startWizard} />
              </Card>
            </View>
          ) : null}

          {currentStep === 1 ? scaleStep("mood", SCALE_OPTIONS_MOOD, "How is your mood today?") : null}
          {currentStep === 2 ? scaleStep("energy", SCALE_OPTIONS_ENERGY, "How are your energy levels today?") : null}
          {currentStep === 3 ? scaleStep("sleep_quality", SCALE_OPTIONS_SLEEP, "How well did you sleep last night?") : null}
          {currentStep === 4 ? scaleStep("anxiety", SCALE_OPTIONS_ANXIETY, "How anxious are you feeling today?") : null}
          {currentStep === 5 ? scaleStep("pain", SCALE_OPTIONS_PAIN, "How much pain or discomfort are you in today?") : null}
          {currentStep === 6 ? scaleStep("ibd_impact", SCALE_OPTIONS_IBD, "How much has IBD affected your day?") : null}
          {currentStep === 7 ? scaleStep("brain_fog", SCALE_OPTIONS_BRAIN_FOG, "Are you experiencing any brain fog today?") : null}

          {currentStep === 8 ? (
            <View>
              <View style={styles.stepContent}>
                <Text style={[styles.stepTitle, { color: c.text, fontFamily: TYPOGRAPHY.fontFamily.semibold }]}>Did you exercise today?</Text>
                <View style={styles.optionChipRow}>
                  <OptionChip
                    label="Yes"
                    selected={form.exercised === true}
                    onPress={() => setField("exercised", true)}
                  />
                  <OptionChip
                    label="No"
                    selected={form.exercised === false}
                    onPress={() => chooseSingle({ exercised: false })}
                  />
                </View>
                {fieldErrors.exercised ? <Text style={errTextStyle}>{fieldErrors.exercised}</Text> : null}
              </View>
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
            <View style={styles.stepContent}>
              <Text style={[styles.stepTitle, { color: c.text, fontFamily: TYPOGRAPHY.fontFamily.semibold }]}>Any additional notes?</Text>
              <FlareTextInput
                multiline
                value={form.notes}
                onChangeText={(t) => setField("notes", t)}
                placeholder="Anything else worth noting today… (optional)"
              />
            </View>
          ) : null}

          {currentStep === WELLBEING_WIZARD_REVIEW_STEP ? (
            <View style={styles.reviewContent}>
              <Text style={[styles.reviewPageTitle, { color: c.text, fontFamily: TYPOGRAPHY.fontFamily.bold }]}>Review your log</Text>
              <Text style={[styles.reviewPageSubtitle, { color: c.textSecondary, fontFamily: TYPOGRAPHY.fontFamily.regular }]}>Check everything looks right before saving.</Text>
              <View style={styles.reviewSections}>
              <ReviewSectionCard title="Feelings" onEdit={() => openReviewEdit("feelings")}>
                <ReviewFieldRows fields={reviewFeelingsFields} />
              </ReviewSectionCard>
              <ReviewSectionCard title="IBD" onEdit={() => openReviewEdit("ibd")}>
                <ReviewFieldRows fields={reviewIbdFields} />
              </ReviewSectionCard>
              <ReviewSectionCard title="Activities" onEdit={() => openReviewEdit("activities")}>
                <ReviewFieldRows fields={reviewActivitiesFields} />
              </ReviewSectionCard>
              <ReviewSectionCard title="Notes" onEdit={() => openReviewEdit("notes")}>
                <Text style={[styles.reviewNotesText, { color: c.text, fontFamily: TYPOGRAPHY.fontFamily.regular }]}>
                  {form.notes.trim() ? `\u201C${form.notes.trim()}\u201D` : "None"}
                </Text>
              </ReviewSectionCard>
              </View>
            </View>
          ) : null}
        </ScrollView>

        {currentStep > 0 && !(currentStep === WELLBEING_WIZARD_REVIEW_STEP && !editingReviewSection) ? (
          <View style={[styles.footer, { backgroundColor: c.screen, borderTopColor: c.cardBorder }]}>
            <SecondaryButton title="Back" onPress={goBackInternal} />
            {currentStep === 11 || (currentStep === 8 && form.exercised === true) ? (
              <PrimaryButton title="Next" onPress={applyAdvance} />
            ) : null}
          </View>
        ) : null}

        {currentStep === WELLBEING_WIZARD_REVIEW_STEP && !editingReviewSection ? (
          <View style={[styles.fixedFooter, { backgroundColor: c.screen, borderTopColor: c.cardBorder }]}>
            <PrimaryButton
              title={submitting ? "Saving..." : "Save log"}
              onPress={submit}
              disabled={submitting}
            />
          </View>
        ) : null}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  wizardShell: { flex: 1 },
  scrollPad: { paddingTop: SPACING.lg, paddingBottom: 80 },
  scrollPadLanding: {
    paddingHorizontal: SPACING.screen,
    paddingTop: 0,
    paddingBottom: SPACING.xl,
  },
  scrollPadWizardSteps: { paddingHorizontal: SPACING.screen, paddingTop: SPACING.lg, paddingBottom: 80 },
  scrollPadReview: { paddingBottom: SPACING.lg * 2 },
  landing: {
    flex: 1,
    justifyContent: "center",
    paddingVertical: SPACING.xl * 2,
  },
  landingCard: {
    alignItems: "center",
    gap: SPACING.lg,
    paddingBottom: SPACING.lg * 2,
  },
  landingIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.md,
  },
  landingTitle: {
    fontSize: TYPOGRAPHY.fontSize.screenTitle,
    textAlign: "center",
  },
  landingDesc: {
    fontSize: TYPOGRAPHY.fontSize.md,
    textAlign: "center",
    lineHeight: 22,
  },
  progressWrap: {
    marginBottom: SPACING.xl,
    gap: SPACING.sm,
  },
  progressLabel: {
    fontSize: TYPOGRAPHY.fontSize.sm,
  },
  stepContent: {
    gap: SPACING.lg,
  },
  stepTitle: {
    fontSize: TYPOGRAPHY.fontSize.cardTitle,
    lineHeight: 24,
  },
  optionChipRow: {
    flexDirection: "row",
    gap: SPACING.md,
  },
  optionChipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.md,
  },
  subLabel: { fontSize: TYPOGRAPHY.fontSize.md, fontFamily: TYPOGRAPHY.fontFamily.medium, marginBottom: SPACING.xs },
  reviewContent: {
    gap: 0,
  },
  reviewPageTitle: {
    fontSize: TYPOGRAPHY.fontSize.screenTitle,
    lineHeight: 30,
    marginBottom: SPACING.xs,
  },
  reviewPageSubtitle: {
    fontSize: TYPOGRAPHY.fontSize.md,
    lineHeight: 20,
    marginBottom: SPACING.sm,
  },
  reviewSections: {
    marginTop: SPACING.md,
  },
  reviewCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  reviewInCardLabelWrap: {
    flex: 1,
    minWidth: 0,
  },
  reviewInCardLabel: {
    marginTop: 0,
    marginBottom: 0,
    marginHorizontal: 0,
    letterSpacing: 0.8,
  },
  reviewEditBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  reviewFieldRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: SPACING.md,
  },
  reviewFieldRowGap: {
    marginTop: SPACING.md,
  },
  reviewFieldLabel: {
    fontSize: TYPOGRAPHY.fontSize.md,
    flex: 1,
  },
  reviewFieldValue: {
    fontSize: TYPOGRAPHY.fontSize.md,
    textAlign: "right",
    flex: 1,
  },
  reviewNotesText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    lineHeight: 22,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: SPACING.md,
    paddingHorizontal: SPACING.screen,
    paddingVertical: SPACING.lg,
    borderTopWidth: 1,
  },
  fixedFooter: {
    paddingHorizontal: SPACING.screen,
    paddingVertical: SPACING.lg,
    borderTopWidth: 1,
  },
});
