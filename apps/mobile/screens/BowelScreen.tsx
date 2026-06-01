import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import { yupResolver } from "@hookform/resolvers/yup";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ConfirmModal } from "../components/ConfirmModal";
import type { BowelReturnParams, BristolGuideParams } from "./BristolGuideScreen";
import { PrimaryButton, SecondaryButton } from "../components/FlareButton";
import { flareFieldErrorStyle, flareInputStyles, FlareTextInput } from "../components/FlareInput";
import { FlareScreenSectionTitle } from "../components/FlareScreenSectionTitle";
import {
  BRISTOL_TYPES,
  formatBristolDetailLabel,
  formatBristolTypeOnly,
  getBristolTypeMeta,
} from "../lib/bristolStoolChart";
import {
  BOWEL_FEATURE_MCI_ICON,
  bowelFormFromRow,
  snapTimeHmFromDate,
  bowelFormHasOptionalDetails,
  bowelPayloadFromForm,
  formatUkTimeFromOccurred,
  quickBowelFormState,
  sortBowelByCreatedAtDesc,
  type BowelFormState,
  type BowelMovementRow,
  type TriStateValue,
} from "../lib/bowelMovementShared";
import { bowelLogFormSchema } from "../lib/bowelLogFormSchema";
import { invalidateDashboardSnapshot } from "../lib/dashboardSnapshotCache";
import { FLARE_FONT_SIZE, FLARE_LINE_HEIGHT } from "../lib/layoutConstants";
import { formatUkDate } from "../lib/formatUkDate";
import { supabase, TABLES } from "../lib/supabase";
import { useFlareColors } from "../theme";

type SessionUser = { id: string };

const BOTTOM_BAR_VISIBLE_ROUTES = new Set(["Dashboard", "Account", "Reminders"]);

function useBottomTabScrollInset() {
  const route = useRoute();
  const insets = useSafeAreaInsets();
  return BOTTOM_BAR_VISIBLE_ROUTES.has(route.name) ? Math.max(insets.bottom, 8) + 36 : 0;
}

function toYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseYmd(s: string): Date {
  const d = new Date(`${s}T12:00:00`);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

function formDateTimeToDate(dateYmd: string, timeHm: string): Date {
  if (dateYmd && timeHm) {
    const d = new Date(`${dateYmd}T${timeHm}:00`);
    if (!Number.isNaN(d.getTime())) return d;
  }
  if (dateYmd) return parseYmd(dateYmd);
  return new Date();
}

function isAndroidDatePickerDismissed(event: { type?: string }): boolean {
  return Platform.OS === "android" && event.type === "dismissed";
}

type TriField = "blood" | "strain" | "urgency";

const TRI_OPTIONS: { value: TriStateValue; label: string }[] = [
  { value: "", label: "Skip" },
  { value: "false", label: "No" },
  { value: "true", label: "Yes" },
];

function TriChipRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: TriStateValue;
  onChange: (v: TriStateValue) => void;
}) {
  const c = useFlareColors();
  return (
    <View style={styles.triRow}>
      <Text style={[styles.triLabel, { color: c.textSecondary }]}>{label}</Text>
      <View style={styles.triChips}>
        {TRI_OPTIONS.map((opt) => {
          const selected = value === opt.value;
          return (
            <Pressable
              key={opt.label}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => onChange(opt.value)}
              style={[
                styles.triChip,
                {
                  backgroundColor: selected ? c.primary : c.surfaceSubtle,
                  borderColor: selected ? c.primary : c.cardBorder,
                },
              ]}
            >
              <Text style={[styles.triChipText, { color: selected ? c.white : c.text }]}>{opt.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function BowelLogSheet({
  visible,
  editingId,
  initialValues,
  saving,
  saveError,
  showOptional,
  setShowOptional,
  onClose,
  onSave,
  onOpenGuide,
}: {
  visible: boolean;
  editingId: string | null;
  initialValues: BowelFormState;
  saving: boolean;
  saveError: string;
  showOptional: boolean;
  setShowOptional: (v: boolean) => void;
  onClose: () => void;
  onSave: (values: BowelFormState) => void;
  onOpenGuide: (highlightedType: number | null) => void;
}) {
  const c = useFlareColors();
  const insets = useSafeAreaInsets();
  const errTextStyle = flareFieldErrorStyle(c, "input");
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [pickerDraftDate, setPickerDraftDate] = useState<Date | null>(null);
  const [timePickerOpen, setTimePickerOpen] = useState(false);
  const [pickerDraftTime, setPickerDraftTime] = useState<Date | null>(null);

  const { watch, setValue, reset, handleSubmit, formState } = useForm<BowelFormState>({
    resolver: yupResolver(bowelLogFormSchema),
    defaultValues: initialValues,
  });
  const { errors } = formState;
  const form = watch();

  useEffect(() => {
    if (visible) reset(initialValues);
  }, [visible, initialValues, reset]);

  const selectedMeta = form.bristolType != null ? getBristolTypeMeta(form.bristolType) : null;

  const handleTimePickerChange = (event: { type?: string }, d?: Date) => {
    if (Platform.OS === "android") {
      setTimePickerOpen(false);
      setPickerDraftTime(null);
      if (isAndroidDatePickerDismissed(event)) return;
      if (event.type === "set" && d) {
        setValue("time", snapTimeHmFromDate(d), { shouldValidate: true });
      }
      return;
    }
    setTimePickerOpen(false);
    setPickerDraftTime(null);
    if (event.type === "dismissed") return;
    if (d) {
      setValue("time", snapTimeHmFromDate(d), { shouldValidate: true });
    }
  };

  const handleDatePickerChange = (event: { type?: string }, d?: Date) => {
    if (Platform.OS === "android") {
      setDatePickerOpen(false);
      setPickerDraftDate(null);
      if (isAndroidDatePickerDismissed(event)) return;
      if (event.type === "set" && d) {
        setValue("date", toYmd(d), { shouldValidate: true });
        setValue("dateTouched", true);
      }
      return;
    }
    setDatePickerOpen(false);
    setPickerDraftDate(null);
    if (event.type === "dismissed") return;
    if (d) {
      setValue("date", toYmd(d), { shouldValidate: true });
      setValue("dateTouched", true);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={[styles.sheetRoot, { backgroundColor: c.screen }]}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={[styles.sheetHeader, { borderBottomColor: c.cardBorder, paddingTop: Math.max(insets.top, 12) }]}>
          <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} hitSlop={12} style={styles.sheetClose}>
            <Ionicons name="close" size={26} color={c.textMuted} />
          </Pressable>
          <Text style={[styles.sheetTitle, { color: c.text }]}>{editingId ? "Edit log" : "Quick log"}</Text>
          <View style={styles.sheetClose} />
        </View>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.sheetScroll, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.sheetLead, { color: c.textMuted }]}>
            Pick the Bristol type that best matches your stool — only takes a moment.
          </Text>

          <View style={styles.whenBlock}>
          <View style={styles.whenRow}>
            <View style={styles.whenCol}>
              <FlareScreenSectionTitle compact>Date *</FlareScreenSectionTitle>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Date"
                onPress={() => {
                  setTimePickerOpen(false);
                  setPickerDraftTime(null);
                  setPickerDraftDate(form.date ? parseYmd(form.date) : new Date());
                  setDatePickerOpen(true);
                }}
                style={[styles.whenPill, { backgroundColor: c.surfaceSubtle, borderColor: c.cardBorder }]}
              >
                <Ionicons name="calendar-outline" size={18} color={c.textSecondary} />
                <Text style={[styles.whenPillText, { color: form.date ? c.text : c.textMuted }]}>
                  {form.date ? formatUkDate(form.date) : ""}
                </Text>
              </Pressable>
            </View>
            <View style={styles.whenCol}>
              <FlareScreenSectionTitle compact>Time *</FlareScreenSectionTitle>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Time"
                onPress={() => {
                  setDatePickerOpen(false);
                  setPickerDraftDate(null);
                  setPickerDraftTime(formDateTimeToDate(form.date, form.time));
                  setTimePickerOpen(true);
                }}
                style={[styles.whenPill, { backgroundColor: c.surfaceSubtle, borderColor: c.cardBorder }]}
              >
                <Ionicons name="time-outline" size={18} color={c.textSecondary} />
                <Text style={[styles.whenPillText, { color: form.time ? c.text : c.textMuted }]}>
                  {form.time}
                </Text>
              </Pressable>
            </View>
          </View>
          {errors.time?.message || errors.date?.message ? (
            <Text style={[errTextStyle, styles.whenRowError]}>
              {errors.time?.message ?? errors.date?.message}
            </Text>
          ) : null}
          </View>

          <View style={styles.sectionHeadRow}>
            <FlareScreenSectionTitle inline>Stool type</FlareScreenSectionTitle>
            <Pressable
              accessibilityRole="button"
              onPress={() => onOpenGuide(form.bristolType)}
              hitSlop={8}
              style={({ pressed }) => pressed && { opacity: 0.7 }}
            >
              <Text style={[styles.guideLink, { color: c.text }]}>Bristol stool chart</Text>
            </Pressable>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.bristolStrip}
          >
            {BRISTOL_TYPES.map((item) => {
              const selected = form.bristolType === item.type;
              return (
                <Pressable
                  key={item.type}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={formatBristolDetailLabel(item.type)}
                  onPress={() => setValue("bristolType", item.type, { shouldValidate: true })}
                  style={[
                    styles.bristolBubble,
                    {
                      backgroundColor: selected ? c.primary : c.surfaceSubtle,
                      borderColor: selected ? c.primary : c.cardBorder,
                    },
                  ]}
                >
                  <Text style={[styles.bristolBubbleNum, { color: selected ? c.white : c.text }]}>{item.type}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
          {selectedMeta ? (
            <View style={[styles.bristolChosen, { backgroundColor: c.surfaceSubtle, borderColor: c.cardBorder }]}>
              <View style={[styles.bristolChosenBadge, { backgroundColor: c.primary }]}>
                <Text style={[styles.bristolChosenBadgeText, { color: c.white }]}>{selectedMeta.type}</Text>
              </View>
              <View style={styles.bristolChosenCopy}>
                <Text style={[styles.bristolChosenTitle, { color: c.text }]}>{selectedMeta.shortLabel}</Text>
              </View>
            </View>
          ) : (
            <Text style={[styles.bristolHint, { color: c.textMuted }]}>Tap a number from 1 to 7</Text>
          )}
          {errors.bristolType?.message ? (
            <Text style={[errTextStyle, styles.fieldErrorBelowSection]}>{errors.bristolType.message}</Text>
          ) : null}

          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: showOptional }}
            onPress={() => setShowOptional(!showOptional)}
            style={[
              styles.optionalToggle,
              { borderTopColor: c.cardBorder, borderBottomColor: c.cardBorder },
            ]}
          >
            <Text style={[styles.optionalToggleText, { color: c.text }]}>
              {showOptional ? "Hide optional details" : "Add optional details"}
            </Text>
            <Ionicons name={showOptional ? "chevron-up" : "chevron-down"} size={18} color={c.textMuted} />
          </Pressable>

          {showOptional ? (
            <View style={styles.optionalBlock}>
              <TriChipRow
                label="Blood visible?"
                value={form.blood}
                onChange={(blood) => setValue("blood", blood)}
              />
              <TriChipRow
                label="Pain or straining?"
                value={form.strain}
                onChange={(strain) => setValue("strain", strain)}
              />
              <TriChipRow
                label="Urgent need to go?"
                value={form.urgency}
                onChange={(urgency) => setValue("urgency", urgency)}
              />
              <Text style={[flareInputStyles.label, { color: c.textSecondary, marginTop: 4 }]}>Notes</Text>
              <FlareTextInput
                multiline
                value={form.notes}
                onChangeText={(notes) => setValue("notes", notes)}
                placeholder="Only if you want to add something"
                style={styles.notesInput}
              />
            </View>
          ) : null}

          {saveError ? <Text style={[errTextStyle, styles.saveError]}>{saveError}</Text> : null}

          <PrimaryButton
            title={saving ? "Saving…" : editingId ? "Save changes" : "Save log"}
            onPress={handleSubmit(onSave)}
            disabled={saving}
          />
          <SecondaryButton title="Cancel" onPress={onClose} />
        </ScrollView>

        {datePickerOpen && pickerDraftDate ? (
          <DateTimePicker
            value={pickerDraftDate}
            mode="date"
            display="default"
            maximumDate={new Date()}
            onChange={handleDatePickerChange}
          />
        ) : null}

        {timePickerOpen && pickerDraftTime ? (
          <DateTimePicker
            value={pickerDraftTime}
            mode="time"
            display="default"
            minuteInterval={15}
            onChange={handleTimePickerChange}
          />
        ) : null}

      </KeyboardAvoidingView>
    </Modal>
  );
}

export function BowelScreen({ user }: { user: SessionUser }) {
  const c = useFlareColors();
  const navigation = useNavigation<any>();
  const route = useRoute();
  const bottomScrollInset = useBottomTabScrollInset();

  const [form, setForm] = useState<BowelFormState>(() => quickBowelFormState());
  const [entries, setEntries] = useState<BowelMovementRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [showOptional, setShowOptional] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; id: string | null }>({ open: false, id: null });
  const deleteInFlight = useRef(false);

  const openGuide = useCallback(
    (pickMode: boolean, highlightedType?: number | null) => {
      const reopenSheet = pickMode && sheetOpen;
      if (reopenSheet) setSheetOpen(false);
      const guideParams: BristolGuideParams = {
        pickMode,
        highlightedType: (highlightedType ?? form.bristolType) ?? undefined,
        returnOpenLogSheet: reopenSheet,
      };
      navigation.navigate("BristolGuide", guideParams);
    },
    [form.bristolType, navigation, sheetOpen],
  );

  useFocusEffect(
    useCallback(() => {
      const params = (route.params ?? {}) as BowelReturnParams;
      const picked = params.pickedBristolType;
      if (picked == null || picked < 1 || picked > 7) return;
      setForm((prev) => ({ ...prev, bristolType: picked }));
      if (params.openLogSheet) {
        setSheetOpen(true);
        setSaveError("");
      }
      navigation.setParams({ pickedBristolType: undefined, openLogSheet: undefined });
    }, [navigation, route.params]),
  );

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from(TABLES.BOWEL_MOVEMENTS)
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("Error fetching bowel movements:", error);
      setEntries([]);
    } else {
      setEntries(sortBowelByCreatedAtDesc((data ?? []) as BowelMovementRow[]));
    }
    setLoading(false);
  }, [user.id]);

  useFocusEffect(
    useCallback(() => {
      fetchEntries();
    }, [fetchEntries]),
  );

  const closeSheet = useCallback(() => {
    setSheetOpen(false);
    setSaveError("");
    setEditingId(null);
    setShowOptional(false);
    setForm(quickBowelFormState());
  }, []);

  const openNewLog = useCallback(() => {
    setForm(quickBowelFormState());
    setEditingId(null);
    setSaveError("");
    setShowOptional(false);
    setSheetOpen(true);
  }, []);

  const startEdit = useCallback((row: BowelMovementRow) => {
    const next = bowelFormFromRow(row);
    setForm(next);
    setEditingId(row.id);
    setSaveError("");
    setShowOptional(bowelFormHasOptionalDetails(next));
    setSheetOpen(true);
  }, []);

  const handleSave = async (values: BowelFormState) => {
    setSaveError("");
    setSaving(true);
    try {
      const payload = bowelPayloadFromForm(values);
      if (editingId) {
        const { error } = await supabase
          .from(TABLES.BOWEL_MOVEMENTS)
          .update(payload)
          .eq("id", editingId)
          .eq("user_id", user.id);
        if (error) throw error;
        setEntries((prev) =>
          sortBowelByCreatedAtDesc(
            prev.map((entry) => (entry.id === editingId ? { ...entry, ...payload } : entry)),
          ),
        );
      } else {
        const { data, error } = await supabase
          .from(TABLES.BOWEL_MOVEMENTS)
          .insert([{ ...payload, user_id: user.id }])
          .select();
        if (error) throw error;
        const inserted = (data?.[0] as BowelMovementRow | undefined) ?? null;
        if (!inserted) {
          await fetchEntries();
        } else {
          setEntries((prev) => sortBowelByCreatedAtDesc([inserted, ...prev.filter((e) => e.id !== inserted.id)]));
        }
      }
      closeSheet();
      invalidateDashboardSnapshot(user.id);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Could not save this log.";
      setSaveError(message);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    const id = deleteModal.id;
    if (!id || deleteInFlight.current) return;
    deleteInFlight.current = true;
    setDeleteModal({ open: false, id: null });
    try {
      const { error } = await supabase.from(TABLES.BOWEL_MOVEMENTS).delete().eq("id", id).eq("user_id", user.id);
      if (error) throw error;
      setEntries((prev) => prev.filter((e) => e.id !== id));
      if (editingId === id) closeSheet();
      invalidateDashboardSnapshot(user.id);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Could not delete this log.";
      Alert.alert("Could not delete", message);
    } finally {
      deleteInFlight.current = false;
    }
  };

  return (
    <View style={[styles.screenRoot, { backgroundColor: c.screen }]}>
      <ScrollView
        style={styles.screenScroll}
        contentContainerStyle={{ paddingBottom: bottomScrollInset + 24 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.heroCard, { backgroundColor: c.card }]}>
          <View style={styles.heroTop}>
            <View style={[styles.heroIcon, { backgroundColor: c.surfaceRaised }]}>
              <MaterialCommunityIcons name={BOWEL_FEATURE_MCI_ICON} size={28} color={c.primary} accessibilityIgnoresInvertColors />
            </View>
            <View style={styles.heroCopy}>
              <Text style={[styles.heroTitle, { color: c.text }]}>Log bowel movement</Text>
            </View>
          </View>
          <Text style={[styles.heroSub, { color: c.textMuted }]}>
            A quick Bristol type is enough — add details only if you want to.
          </Text>
          <PrimaryButton title="Log now" onPress={openNewLog} />
        </View>

        <View style={[styles.logsCard, { backgroundColor: c.card }]}>
          <Text style={[styles.logsTitle, { color: c.text }]}>Your logs</Text>
          {loading ? (
            <ActivityIndicator color={c.primary} style={{ marginVertical: 20 }} />
          ) : entries.length === 0 ? (
            <View style={styles.emptyWrap}>
              <View style={[styles.emptyIcon, { backgroundColor: c.surfaceSubtle }]}>
                <Ionicons name="leaf-outline" size={28} color={c.primary} />
              </View>
              <Text style={[styles.emptyTitle, { color: c.text }]}>Nothing logged yet</Text>
              <Text style={[styles.emptySub, { color: c.textMuted }]}>
                Tap Log now when you are ready — it only takes a few taps.
              </Text>
            </View>
          ) : (
            <View style={[styles.logList, { backgroundColor: c.surfaceSubtle }]}>
              {entries.map((row, index) => {
                const dateLabel = formatUkDate(row.occurred_at);
                const timeLabel = formatUkTimeFromOccurred(row.occurred_at);
                const meta = getBristolTypeMeta(row.bristol_type);
                return (
                  <View
                    key={row.id}
                    style={[
                      styles.logRow,
                      index !== entries.length - 1
                        ? { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.cardBorder }
                        : null,
                    ]}
                  >
                    <View style={[styles.typeBadge, { backgroundColor: c.primary }]}>
                      <Text style={[styles.typeBadgeText, { color: c.white }]}>{row.bristol_type}</Text>
                    </View>
                    <View style={styles.logMain}>
                      <Text style={[styles.logPrimary, { color: c.text }]} numberOfLines={1}>
                        {meta?.shortLabel ?? formatBristolTypeOnly(row.bristol_type)}
                      </Text>
                      <Text style={[styles.logSecondary, { color: c.textMuted }]}>
                        {dateLabel}
                        {timeLabel ? ` · ${timeLabel}` : ""}
                      </Text>
                    </View>
                    <View style={styles.logActions}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Edit"
                        onPress={() => startEdit(row)}
                        hitSlop={8}
                        style={({ pressed }) => [styles.logIconBtn, pressed && { opacity: 0.6 }]}
                      >
                        <Ionicons name="create-outline" size={20} color={c.textMuted} />
                      </Pressable>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Delete"
                        onPress={() => setDeleteModal({ open: true, id: row.id })}
                        hitSlop={8}
                        style={({ pressed }) => [styles.logIconBtn, pressed && { opacity: 0.6 }]}
                      >
                        <Ionicons name="trash-outline" size={20} color={c.textMuted} />
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        <View style={[styles.tipRow, { backgroundColor: c.card }]}>
          <Ionicons name="bulb-outline" size={18} color="#EAB308" accessibilityIgnoresInvertColors />
          <Text style={[styles.tipText, { color: c.textMuted }]}>
            Stool types help build a clearer picture of your condition. Types 3–4 are often ideal; 1–2 harder, 5–7 looser.
          </Text>
        </View>
      </ScrollView>

      <BowelLogSheet
        visible={sheetOpen}
        editingId={editingId}
        initialValues={form}
        saving={saving}
        saveError={saveError}
        showOptional={showOptional}
        setShowOptional={setShowOptional}
        onClose={closeSheet}
        onSave={handleSave}
        onOpenGuide={(highlightedType) => openGuide(true, highlightedType)}
      />

      <ConfirmModal
        visible={deleteModal.open}
        title="Delete bowel log"
        message="Are you sure you want to delete this log? This action cannot be undone."
        confirmLabel="Delete"
        confirmDestructive
        onConfirm={confirmDelete}
        onCancel={() => setDeleteModal({ open: false, id: null })}
      />

    </View>
  );
}

const styles = StyleSheet.create({
  screenRoot: { flex: 1 },
  screenScroll: { flex: 1, padding: 14 },
  heroCard: { borderRadius: 14, padding: 16, marginBottom: 12 },
  heroTop: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 8 },
  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  heroCopy: { flex: 1, minWidth: 0 },
  heroTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  heroSub: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 21, marginBottom: 16 },
  logsCard: { borderRadius: 14, padding: 16, marginBottom: 12 },
  logsTitle: { fontSize: 16, fontFamily: "Inter_700Bold", marginBottom: 12 },
  emptyWrap: { alignItems: "center", paddingVertical: 20, paddingHorizontal: 12 },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_700Bold", marginBottom: 6 },
  emptySub: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 21 },
  logList: { borderRadius: 12, overflow: "hidden" },
  logRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 12, gap: 10 },
  typeBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  typeBadgeText: { fontSize: 15, fontFamily: "Inter_700Bold" },
  logMain: { flex: 1, minWidth: 0 },
  logPrimary: { fontSize: 15, fontFamily: "Inter_500Medium" },
  logSecondary: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  logActions: { flexDirection: "row", alignItems: "center" },
  logIconBtn: { padding: 6 },
  tipRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  tipText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },
  sheetRoot: { flex: 1 },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sheetClose: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  sheetTitle: { fontSize: FLARE_FONT_SIZE.navTitle, fontFamily: "Inter_700Bold" },
  sheetScroll: { paddingHorizontal: 20, paddingTop: 16 },
  sheetLead: {
    fontSize: FLARE_FONT_SIZE.body,
    fontFamily: "Inter_400Regular",
    lineHeight: FLARE_LINE_HEIGHT.body,
    marginBottom: 20,
  },
  sectionHeadRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  guideLink: {
    fontSize: FLARE_FONT_SIZE.body,
    fontFamily: "Inter_400Regular",
    textDecorationLine: "underline",
  },
  whenBlock: { marginBottom: 22 },
  whenRow: { flexDirection: "row", gap: 10 },
  whenRowError: { marginTop: 6 },
  whenCol: { flex: 1, gap: 6 },
  whenPill: {
    alignSelf: "stretch",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
  },
  whenPillText: { flex: 1, fontSize: FLARE_FONT_SIZE.body, fontFamily: "Inter_400Regular" },
  bristolStrip: { gap: 10, paddingVertical: 4, paddingRight: 8, marginBottom: 10 },
  bristolBubble: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  bristolBubbleNum: { fontSize: FLARE_FONT_SIZE.navTitle, fontFamily: "Inter_700Bold" },
  bristolChosen: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 16,
  },
  bristolChosenBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  bristolChosenBadgeText: { fontSize: FLARE_FONT_SIZE.body, fontFamily: "Inter_700Bold" },
  bristolChosenCopy: { flex: 1, minWidth: 0 },
  bristolChosenTitle: { fontSize: FLARE_FONT_SIZE.body, fontFamily: "Inter_500Medium" },
  bristolHint: {
    fontSize: FLARE_FONT_SIZE.body,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    marginBottom: 16,
  },
  optionalToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    marginBottom: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  optionalToggleText: { fontSize: FLARE_FONT_SIZE.body, fontFamily: "Inter_400Regular" },
  optionalBlock: { gap: 14, marginBottom: 16 },
  triRow: { gap: 8 },
  triLabel: { fontSize: FLARE_FONT_SIZE.body, fontFamily: "Inter_400Regular" },
  triChips: { flexDirection: "row", gap: 8 },
  triChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
  },
  triChipText: { fontSize: FLARE_FONT_SIZE.body, fontFamily: "Inter_500Medium" },
  notesInput: { minHeight: 72, marginTop: 0 },
  saveError: { marginBottom: 8 },
  fieldErrorBelowSection: { marginTop: 4, marginBottom: 8 },
});
