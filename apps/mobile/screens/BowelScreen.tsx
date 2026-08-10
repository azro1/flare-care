import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import { yupResolver } from "@hookform/resolvers/yup";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import {
    KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  InteractionManager,
} from "react-native";
import { showFlareAlert } from "../components/FlareAlertHost";
import { ScrollView } from "../lib/scrollViews";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BowelReturnParams, BristolGuideParams } from "./BristolGuideScreen";
import {
  FLARE_BUTTON_BORDER_RADIUS,
  FLARE_BUTTON_MIN_HEIGHT,
  FLARE_BUTTON_PADDING_H,
  PrimaryButton,
  SecondaryButton,
} from "../components/FlareButton";
import {
  FLARE_INPUT_BORDER_RADIUS,
  flareFieldErrorStyle,
  FlareTextInput,
} from "../components/FlareInput";
import {
  LogHistoryCard,
  LogHistoryListLoading,
  LogHistoryEmptyState,
  LogHistoryPreviewList,
  LOG_HISTORY_LOAD_MORE_BATCH,
  buildTimestampLogRowItem,
  logHistoryCardStyles,
} from "../components/LogHistoryList";
import { TrackerThumbFab, useTrackerThumbFabLayout } from "../components/TrackerThumbFab";
import { ConfirmModal } from "../components/ConfirmModal";
import { InstructionScreenShell } from "../components/InstructionScreenShell";
import { usePaginatedLogList } from "../lib/paginatedLogList";
import { STACKED_DETAIL_ROW_EDGE } from "../components/StackedDetailField";
import { FlareScreenSectionTitle } from "../components/FlareScreenSectionTitle";
import {
  BRISTOL_TYPES,
  formatBristolDetailLabel,
  formatBristolTypeOnly,
  getBristolTypeMeta,
} from "../lib/bristolStoolChart";
import {
  BOWEL_FEATURE_MCI_ICON,
  snapTimeHmFromDate,
  bowelPayloadFromForm,
  deleteBowelMovementsForUser,
  getBowelListCache,
  invalidateBowelListCache,
  quickBowelFormState,
  setBowelListCache,
  type BowelFormState,
  type BowelMovementRow,
  type TriStateValue,
} from "../lib/bowelMovementShared";
import { bowelLogFormSchema } from "../lib/bowelLogFormSchema";
import { invalidateDashboardSnapshot } from "../lib/dashboardSnapshotCache";
import { recordRecentActivityEvent } from "../lib/recentActivityEvents";
import { useLogListSelection } from "../lib/useLogListSelection";
import {
  FLARE_FONT_FAMILY,
  FLARE_FONT_SIZE,
  FLARE_LINE_HEIGHT,
  CARD_SECTION_INNER_GAP,
  SCREEN_EDGE_PADDING,
  TIME_PICKER_MINUTE_INTERVAL,
  bottomTabBarHeight,
} from "../lib/layoutConstants";
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
  { value: "skip", label: "Skip" },
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
      <Text style={[styles.triLabel, { color: c.textMuted }]}>{label}</Text>
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

export function BowelLogSheet({
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
          <Text style={[styles.sheetTitle, { color: c.text }]}>{editingId ? "Edit log" : "Add bowel movement"}</Text>
          <View style={styles.sheetClose} />
        </View>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.sheetScroll, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
        >
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
          {errors.date?.message || errors.time?.message ? (
            <Text style={[errTextStyle, styles.whenRowError]}>
              {errors.date?.message ?? errors.time?.message}
            </Text>
          ) : null}
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={() => onOpenGuide(form.bristolType)}
            hitSlop={8}
            style={({ pressed }) => [styles.guideLinkAboveRow, pressed && { opacity: 0.7 }]}
          >
            <Ionicons name="book-outline" size={16} color={c.textSecondary} accessibilityIgnoresInvertColors />
            <Text style={[styles.guideLink, { color: c.text }]}>Bristol stool chart</Text>
          </Pressable>
          <View style={styles.sectionHeadRow}>
            <FlareScreenSectionTitle inline>Stool type</FlareScreenSectionTitle>
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
            <Text style={[styles.bristolSelectedCaption, { color: c.textMuted }]}>
              {selectedMeta.type} {selectedMeta.shortLabel}
            </Text>
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
              <Text style={[styles.triLabel, { color: c.textMuted }]}>Notes</Text>
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

          <View style={styles.sheetActions}>
            <PrimaryButton
              title={saving ? "Saving…" : "Save"}
              onPress={handleSubmit(onSave)}
              disabled={saving}
            />
            <SecondaryButton title="Cancel" onPress={onClose} />
          </View>
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
            minuteInterval={TIME_PICKER_MINUTE_INTERVAL}
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
  const insets = useSafeAreaInsets();
  const bottomScrollInset = useBottomTabScrollInset();
  const { scrollBottomPad } = useTrackerThumbFabLayout();
  const selectionBarClearance = bottomTabBarHeight(insets.bottom);

  const [form, setForm] = useState<BowelFormState>(() => quickBowelFormState());
  const {
    rows: historyRows,
    totalCount: historyTotalCount,
    visibleCount: historyVisibleCount,
    loading: historyLoading,
    loadingMore: historyLoadingMore,
    hasMore: historyHasMore,
    loadMore: loadMoreHistory,
    refresh: refreshHistoryLoad,
    syncExpandedFromCache,
  } = usePaginatedLogList<BowelMovementRow>({
    userId: user.id,
    table: TABLES.BOWEL_MOVEMENTS,
    select: "*",
    initialVisible: LOG_HISTORY_LOAD_MORE_BATCH,
    cache: {
      get: getBowelListCache,
      set: setBowelListCache,
    },
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [showOptional, setShowOptional] = useState(false);

  const bowelItemIds = useMemo(() => historyRows.map((row) => String(row.id)), [historyRows]);
  const {
    selectionMode,
    selectedIds,
    bulkDeleteOpen,
    setBulkDeleteOpen,
    bulkDeleting,
    enterSelectionWith,
    toggleSelect,
    runBulkDelete,
  } = useLogListSelection({
    routeName: "Bowel",
    itemIds: bowelItemIds,
    navigation,
    headerTitle: "Bowel Movements",
  });

  const handleBulkDeleteConfirm = useCallback(() => {
    void runBulkDelete(async (ids) => {
      try {
        await deleteBowelMovementsForUser(user.id, ids);
        await recordRecentActivityEvent(user.id, "bowel-deleted");
        invalidateDashboardSnapshot(user.id);
        invalidateBowelListCache(user.id);
        await refreshHistoryLoad();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Could not delete these logs.";
        showFlareAlert("Could not delete", message);
        throw err;
      }
    });
  }, [refreshHistoryLoad, runBulkDelete, user.id]);

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

  const refreshHistoryLoadRef = useRef(refreshHistoryLoad);
  refreshHistoryLoadRef.current = refreshHistoryLoad;
  const syncExpandedFromCacheRef = useRef(syncExpandedFromCache);
  syncExpandedFromCacheRef.current = syncExpandedFromCache;

  useFocusEffect(
    useCallback(() => {
      syncExpandedFromCacheRef.current();
      const task = InteractionManager.runAfterInteractions(() => {
        void refreshHistoryLoadRef.current();
      });
      return () => task.cancel();
    }, []),
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
      } else {
        const { error } = await supabase
          .from(TABLES.BOWEL_MOVEMENTS)
          .insert([{ ...payload, user_id: user.id }]);
        if (error) throw error;
      }
      closeSheet();
      invalidateDashboardSnapshot(user.id);
      void refreshHistoryLoad();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Could not save this log.";
      setSaveError(message);
    } finally {
      setSaving(false);
    }
  };

  const listInitialLoad = historyLoading && historyRows.length === 0;
  const historyEmpty = !historyLoading && historyTotalCount === 0;
  const scrollBottomPadTotal =
    bottomScrollInset + (selectionMode ? selectionBarClearance : scrollBottomPad);

  return (
    <InstructionScreenShell
      showInstruction={false}
      contentPaddingBottom={scrollBottomPadTotal}
      instruction={null}
      floatingAction={
        !selectionMode ? (
          <TrackerThumbFab accessibilityLabel="Log bowel movement" onPress={openNewLog} />
        ) : null
      }
      footer={
        <>
          <ConfirmModal
            visible={bulkDeleteOpen}
            title={selectedIds.size === 1 ? "Delete bowel log?" : `Delete ${selectedIds.size} bowel logs?`}
            message="This action cannot be undone."
            confirmLabel={bulkDeleting ? "Deleting…" : "Delete"}
            confirmDestructive
            onConfirm={handleBulkDeleteConfirm}
            onCancel={() => setBulkDeleteOpen(false)}
          />
          {sheetOpen ? (
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
          ) : null}
        </>
      }
    >
      <LogHistoryCard>
        <View style={logHistoryCardStyles.trackerCardBody}>
          {listInitialLoad ? (
            <LogHistoryListLoading />
          ) : historyEmpty ? (
            <LogHistoryEmptyState icon={BOWEL_FEATURE_MCI_ICON} />
          ) : (
            <LogHistoryPreviewList
              items={historyRows.map((row) => {
                const meta = getBristolTypeMeta(row.bristol_type);
                return buildTimestampLogRowItem({
                  id: row.id,
                  title: meta?.shortLabel ?? formatBristolTypeOnly(row.bristol_type),
                  whenIso: row.created_at,
                  accessibilityLabel: `${formatBristolDetailLabel(row.bristol_type)}. View details`,
                });
              })}
              visibleCount={historyVisibleCount}
              hasMore={historyHasMore}
              loadingMore={historyLoadingMore}
              loadMoreLabel="load more"
              onLoadMore={() => void loadMoreHistory()}
              rowTextLayout="compact"
              onPressItem={(logId) => navigation.navigate("BowelLogDetail", { id: logId })}
              selectionMode={selectionMode}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
              onLongPressItem={enterSelectionWith}
            />
          )}
        </View>
      </LogHistoryCard>
    </InstructionScreenShell>
  );
}

const styles = StyleSheet.create({
  sheetRoot: { flex: 1 },
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
  sectionHeadRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  bristolSelectedCaption: {
    fontSize: FLARE_FONT_SIZE.muted,
    fontFamily: FLARE_FONT_FAMILY.regular,
    lineHeight: FLARE_LINE_HEIGHT.muted,
    marginBottom: 14,
  },
  guideLinkAboveRow: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-end",
    gap: 6,
    marginBottom: 8,
  },
  guideLink: {
    fontSize: FLARE_FONT_SIZE.body,
    fontFamily: FLARE_FONT_FAMILY.regular,
    textDecorationLine: "underline",
  },
  whenBlock: { marginBottom: 22 },
  whenRow: { flexDirection: "row", gap: STACKED_DETAIL_ROW_EDGE },
  whenRowError: { marginTop: 6 },
  whenCol: { flex: 1, gap: 6 },
  whenPill: {
    alignSelf: "stretch",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 8,
    minHeight: 42,
    paddingHorizontal: 12,
    borderRadius: FLARE_INPUT_BORDER_RADIUS,
    borderWidth: 1,
  },
  whenPillText: { flex: 1, fontSize: FLARE_FONT_SIZE.body, fontFamily: FLARE_FONT_FAMILY.regular },
  bristolStrip: {
    gap: STACKED_DETAIL_ROW_EDGE,
    paddingVertical: 4,
    paddingRight: 8,
    marginBottom: STACKED_DETAIL_ROW_EDGE,
  },
  bristolBubble: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  bristolBubbleNum: { fontSize: FLARE_FONT_SIZE.navTitle, fontFamily: FLARE_FONT_FAMILY.bold },
  bristolHint: {
    fontSize: FLARE_FONT_SIZE.muted,
    fontFamily: FLARE_FONT_FAMILY.regular,
    lineHeight: FLARE_LINE_HEIGHT.muted,
    marginBottom: 14,
  },
  optionalToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: SCREEN_EDGE_PADDING,
    marginBottom: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  optionalToggleText: { fontSize: FLARE_FONT_SIZE.body, fontFamily: FLARE_FONT_FAMILY.regular },
  optionalBlock: { gap: 14, marginBottom: 14 },
  triRow: { gap: 14 },
  triLabel: { fontSize: FLARE_FONT_SIZE.body, fontFamily: FLARE_FONT_FAMILY.regular },
  triChips: { flexDirection: "row", gap: 8 },
  triChip: {
    flex: 1,
    minHeight: FLARE_BUTTON_MIN_HEIGHT,
    borderRadius: FLARE_BUTTON_BORDER_RADIUS,
    paddingHorizontal: FLARE_BUTTON_PADDING_H,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  triChipText: { fontSize: FLARE_FONT_SIZE.body, fontFamily: FLARE_FONT_FAMILY.medium },
  notesInput: { marginTop: 0 },
  saveError: { marginBottom: 8 },
  sheetActions: { marginTop: STACKED_DETAIL_ROW_EDGE, gap: 8 },
  fieldErrorBelowSection: { marginTop: 6, marginBottom: 8 },
});
