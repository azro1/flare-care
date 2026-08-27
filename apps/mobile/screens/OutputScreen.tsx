import { FLARE_CHROME_LUCIDE, FlareLucideIcon } from "../lib/flareLucideIcons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { showFlareAlert } from "../components/FlareAlertHost";
import { ScrollView } from "../lib/scrollViews";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PrimaryButton, SecondaryButton } from "../components/FlareButton";
import { flareFieldErrorStyle, FlareTextInput, FLARE_INPUT_BORDER_RADIUS } from "../components/FlareInput";
import { FlareScreenSectionTitle } from "../components/FlareScreenSectionTitle";
import {
  LogHistoryCard,
  LogHistoryListLoading,
  LogHistoryEmptyState,
  LogHistoryPreviewList,
  LOG_HISTORY_LOAD_MORE_BATCH,
  buildTimestampLogRowItem,
  logHistoryCardStyles,
} from "../components/LogHistoryList";
import { ConfirmModal } from "../components/ConfirmModal";
import { InstructionScreenShell } from "../components/InstructionScreenShell";
import { OptionPickerModal } from "../components/OptionPickerModal";
import { TrackerThumbFab, useTrackerThumbFabLayout } from "../components/TrackerThumbFab";
import { STACKED_DETAIL_ROW_EDGE } from "../components/StackedDetailField";
import { invalidateDashboardSnapshot } from "../lib/dashboardSnapshotCache";
import { useLogListSelection } from "../lib/useLogListSelection";
import { usePaginatedLogList } from "../lib/paginatedLogList";
import { formatUkDate } from "../lib/formatUkDate";
import { snapTimeHmFromDate } from "../lib/bowelMovementShared";
import {
  FLARE_FONT_FAMILY,
  FLARE_FONT_SIZE,
  NAV_ROW_CHEVRON_SIZE,
  SCREEN_EDGE_PADDING,
  TIME_PICKER_MINUTE_INTERVAL,
  bottomTabBarHeight,
} from "../lib/layoutConstants";
import {
  OUTPUT_FEATURE_ICON,
  OUTPUT_KIND_OPTIONS,
  deleteOutputsForUser,
  fetchTodayOutputTotals,
  formatOutputListTitle,
  formatOutputMl,
  getOutputListCache,
  getTodayOutputTotalCache,
  invalidateOutputListCache,
  normalizeOutputMlInput,
  outputKindLabel,
  outputPayloadFromForm,
  quickOutputFormState,
  setOutputListCache,
  validateOutputForm,
  type OutputFormState,
  type OutputRow,
} from "../lib/outputShared";
import { supabase, TABLES } from "../lib/supabase";
import { useFlareColors } from "../theme";

type SessionUser = { id: string };

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

function isAndroidPickerDismissed(event: { type?: string }): boolean {
  return Platform.OS === "android" && event.type === "dismissed";
}

export function OutputLogSheet({
  visible,
  editingId,
  initialValues,
  saving,
  saveError,
  onClose,
  onSave,
}: {
  visible: boolean;
  editingId: number | null;
  initialValues: OutputFormState;
  saving: boolean;
  saveError: string;
  onClose: () => void;
  onSave: (values: OutputFormState) => void;
}) {
  const c = useFlareColors();
  const insets = useSafeAreaInsets();
  const errTextStyle = flareFieldErrorStyle(c, "input");
  const [form, setForm] = useState<OutputFormState>(initialValues);
  const [fieldError, setFieldError] = useState("");
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [pickerDraftDate, setPickerDraftDate] = useState<Date | null>(null);
  const [timePickerOpen, setTimePickerOpen] = useState(false);
  const [pickerDraftTime, setPickerDraftTime] = useState<Date | null>(null);
  const [kindPickerOpen, setKindPickerOpen] = useState(false);

  React.useEffect(() => {
    if (visible) {
      setForm(initialValues);
      setFieldError("");
      setDatePickerOpen(false);
      setTimePickerOpen(false);
      setKindPickerOpen(false);
      setPickerDraftDate(null);
      setPickerDraftTime(null);
    }
  }, [visible, initialValues]);

  const setField = <K extends keyof OutputFormState>(key: K, value: OutputFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSavePress = () => {
    const validationError = validateOutputForm(form);
    if (validationError) {
      setFieldError(validationError);
      return;
    }
    setFieldError("");
    onSave(form);
  };

  const handleDatePickerChange = (event: { type?: string }, d?: Date) => {
    if (Platform.OS === "android") {
      setDatePickerOpen(false);
      setPickerDraftDate(null);
      if (isAndroidPickerDismissed(event)) return;
      if (event.type === "set" && d) setField("date", toYmd(d));
      return;
    }
    setDatePickerOpen(false);
    setPickerDraftDate(null);
    if (event.type === "dismissed") return;
    if (d) setField("date", toYmd(d));
  };

  const handleTimePickerChange = (event: { type?: string }, d?: Date) => {
    if (Platform.OS === "android") {
      setTimePickerOpen(false);
      setPickerDraftTime(null);
      if (isAndroidPickerDismissed(event)) return;
      if (event.type === "set" && d) setField("time", snapTimeHmFromDate(d));
      return;
    }
    setTimePickerOpen(false);
    setPickerDraftTime(null);
    if (event.type === "dismissed") return;
    if (d) setField("time", snapTimeHmFromDate(d));
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={[styles.sheetRoot, { backgroundColor: c.screen }]}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={[styles.sheetHeader, { borderBottomColor: c.cardBorder, paddingTop: Math.max(insets.top, 12) }]}>
          <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} hitSlop={12} style={styles.sheetClose}>
            <FlareLucideIcon icon={FLARE_CHROME_LUCIDE.close} size={26} color={c.textMuted} />
          </Pressable>
          <Text style={[styles.sheetTitle, { color: c.text }]}>{editingId ? "Edit output" : "Log output"}</Text>
          <View style={styles.sheetClose} />
        </View>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.sheetScroll, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
        >
          <FlareScreenSectionTitle compact>Type *</FlareScreenSectionTitle>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Type, ${outputKindLabel(form.kind)}`}
            onPress={() => {
              setDatePickerOpen(false);
              setTimePickerOpen(false);
              setPickerDraftDate(null);
              setPickerDraftTime(null);
              setKindPickerOpen(true);
            }}
            style={[styles.whenPill, { backgroundColor: c.surfaceSubtle, borderColor: c.cardBorder }]}
          >
            <Text style={[styles.whenPillText, { color: c.text }]}>{outputKindLabel(form.kind)}</Text>
            <FlareLucideIcon icon={FLARE_CHROME_LUCIDE.down} size={NAV_ROW_CHEVRON_SIZE} color={c.textMuted} />
          </Pressable>

          <View style={[styles.whenRow, { marginTop: 16 }]}>
            <View style={styles.whenCol}>
              <FlareScreenSectionTitle compact>Date *</FlareScreenSectionTitle>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Date"
                onPress={() => {
                  setKindPickerOpen(false);
                  setTimePickerOpen(false);
                  setPickerDraftTime(null);
                  setPickerDraftDate(form.date ? parseYmd(form.date) : new Date());
                  setDatePickerOpen(true);
                }}
                style={[styles.whenPill, { backgroundColor: c.surfaceSubtle, borderColor: c.cardBorder }]}
              >
                <FlareLucideIcon icon={FLARE_CHROME_LUCIDE.calendar} size={18} color={c.textSecondary} />
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
                  setKindPickerOpen(false);
                  setDatePickerOpen(false);
                  setPickerDraftDate(null);
                  setPickerDraftTime(formDateTimeToDate(form.date, form.time));
                  setTimePickerOpen(true);
                }}
                style={[styles.whenPill, { backgroundColor: c.surfaceSubtle, borderColor: c.cardBorder }]}
              >
                <FlareLucideIcon icon={FLARE_CHROME_LUCIDE.time} size={18} color={c.textSecondary} />
                <Text style={[styles.whenPillText, { color: form.time ? c.text : c.textMuted }]}>{form.time || ""}</Text>
              </Pressable>
            </View>
          </View>

          <FlareScreenSectionTitle compact style={{ marginTop: 16 }}>
            Amount (ml) *
          </FlareScreenSectionTitle>
          <FlareTextInput
            value={form.amountMl}
            onChangeText={(amountMl) => setField("amountMl", normalizeOutputMlInput(amountMl))}
            placeholder="e.g. 200"
            keyboardType="decimal-pad"
          />

          <FlareScreenSectionTitle compact style={{ marginTop: 16 }}>
            Notes
          </FlareScreenSectionTitle>
          <FlareTextInput
            multiline
            value={form.notes}
            onChangeText={(notes) => setField("notes", notes)}
            placeholder="Optional"
            style={styles.notesInput}
          />

          {fieldError ? <Text style={[errTextStyle, styles.fieldError]}>{fieldError}</Text> : null}
          {saveError ? <Text style={[errTextStyle, styles.fieldError]}>{saveError}</Text> : null}

          <View style={styles.sheetActions}>
            <PrimaryButton title={saving ? "Saving…" : "Save"} onPress={handleSavePress} disabled={saving} />
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
            minuteInterval={TIME_PICKER_MINUTE_INTERVAL as 1 | 5 | 10 | 15 | 30}
            onChange={handleTimePickerChange}
          />
        ) : null}
        <OptionPickerModal
          visible={kindPickerOpen}
          options={OUTPUT_KIND_OPTIONS.map((o) => o.label)}
          onSelect={(label) => {
            const match = OUTPUT_KIND_OPTIONS.find((o) => o.label === label);
            if (match) setField("kind", match.value);
            setKindPickerOpen(false);
          }}
          onCancel={() => setKindPickerOpen(false)}
        />
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function OutputScreen({ user }: { user: SessionUser }) {
  const c = useFlareColors();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const tabBarClearance = bottomTabBarHeight(insets.bottom);
  const { scrollBottomPad } = useTrackerThumbFabLayout(tabBarClearance);

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
  } = usePaginatedLogList<OutputRow>({
    userId: user.id,
    table: TABLES.TRACK_OUTPUT,
    select: "*",
    orderColumn: "occurred_at",
    ascending: false,
    initialVisible: LOG_HISTORY_LOAD_MORE_BATCH,
    cache: {
      get: getOutputListCache,
      set: setOutputListCache,
    },
  });

  const [form, setForm] = useState<OutputFormState>(() => quickOutputFormState());
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [todayTotalMl, setTodayTotalMl] = useState<number | null>(
    () => getTodayOutputTotalCache(user.id) ?? null,
  );

  const outputItemIds = useMemo(() => historyRows.map((row) => String(row.id)), [historyRows]);
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
    routeName: "Output",
    itemIds: outputItemIds,
    navigation,
    headerTitle: "My Output",
  });

  const refreshTodayTotal = useCallback(async () => {
    try {
      const totals = await fetchTodayOutputTotals(user.id);
      setTodayTotalMl(totals.totalMl);
    } catch {
      // non-fatal — list still works
    }
  }, [user.id]);

  const handleBulkDeleteConfirm = useCallback(() => {
    void runBulkDelete(async (ids) => {
      try {
        await deleteOutputsForUser(user.id, ids);
        invalidateDashboardSnapshot(user.id);
        invalidateOutputListCache(user.id);
        await refreshHistoryLoad();
        await refreshTodayTotal();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Could not delete these entries.";
        showFlareAlert("Could not delete", message);
        throw err;
      }
    });
  }, [refreshHistoryLoad, refreshTodayTotal, runBulkDelete, user.id]);

  const refreshHistoryLoadRef = useRef(refreshHistoryLoad);
  refreshHistoryLoadRef.current = refreshHistoryLoad;
  const syncExpandedFromCacheRef = useRef(syncExpandedFromCache);
  syncExpandedFromCacheRef.current = syncExpandedFromCache;
  const refreshTodayTotalRef = useRef(refreshTodayTotal);
  refreshTodayTotalRef.current = refreshTodayTotal;

  useFocusEffect(
    useCallback(() => {
      syncExpandedFromCacheRef.current();
      // Load immediately — InteractionManager delay made the first-open list flash longer.
      void refreshHistoryLoadRef.current();
      void refreshTodayTotalRef.current();
    }, []),
  );

  const closeSheet = useCallback(() => {
    setSheetOpen(false);
    setSaveError("");
    setEditingId(null);
    setForm(quickOutputFormState());
  }, []);

  const openNewLog = useCallback(() => {
    setForm(quickOutputFormState());
    setEditingId(null);
    setSaveError("");
    setSheetOpen(true);
  }, []);

  const handleSave = async (values: OutputFormState) => {
    setSaveError("");
    setSaving(true);
    try {
      const payload = outputPayloadFromForm(values);
      if (editingId) {
        const { error } = await supabase
          .from(TABLES.TRACK_OUTPUT)
          .update(payload)
          .eq("id", editingId)
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from(TABLES.TRACK_OUTPUT).insert([{ ...payload, user_id: user.id }]);
        if (error) throw error;
      }
      closeSheet();
      invalidateDashboardSnapshot(user.id);
      void refreshHistoryLoad();
      void refreshTodayTotal();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Could not save this entry.";
      setSaveError(message);
    } finally {
      setSaving(false);
    }
  };

  const listInitialLoad = historyLoading && historyRows.length === 0;
  const [showListLoading, setShowListLoading] = useState(false);
  useEffect(() => {
    if (!listInitialLoad) {
      setShowListLoading(false);
      return;
    }
    // Skip spinner for fast first paints — avoids a spit-second loading flash.
    const t = setTimeout(() => setShowListLoading(true), 160);
    return () => clearTimeout(t);
  }, [listInitialLoad]);
  const historyEmpty = !historyLoading && historyTotalCount === 0;
  const scrollBottomPadTotal = selectionMode ? tabBarClearance : scrollBottomPad;

  return (
    <InstructionScreenShell
      showInstruction={false}
      contentPaddingBottom={scrollBottomPadTotal}
      instruction={null}
      floatingAction={
        !selectionMode ? (
          <TrackerThumbFab
            accessibilityLabel="Log output"
            onPress={openNewLog}
            tabBarClearance={tabBarClearance}
          />
        ) : null
      }
      footer={
        <>
          <ConfirmModal
            visible={bulkDeleteOpen}
            title={selectedIds.size === 1 ? "Delete output entry?" : `Delete ${selectedIds.size} output entries?`}
            message="This action cannot be undone."
            confirmLabel={bulkDeleting ? "Deleting…" : "Delete"}
            confirmDestructive
            onConfirm={handleBulkDeleteConfirm}
            onCancel={() => setBulkDeleteOpen(false)}
          />
          {sheetOpen ? (
            <OutputLogSheet
              visible={sheetOpen}
              editingId={editingId}
              initialValues={form}
              saving={saving}
              saveError={saveError}
              onClose={closeSheet}
              onSave={handleSave}
            />
          ) : null}
        </>
      }
    >
      <View style={[styles.todayTotalCard, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
        <Text style={[styles.todayTotalLabel, { color: c.textMuted }]}>Today’s total</Text>
        <Text style={[styles.todayTotalValue, { color: todayTotalMl == null ? c.textMuted : c.text }]}>
          {todayTotalMl == null ? "…" : formatOutputMl(todayTotalMl)}
        </Text>
      </View>

      <LogHistoryCard>
        <View style={logHistoryCardStyles.trackerCardBody}>
          {showListLoading ? (
            <LogHistoryListLoading />
          ) : listInitialLoad ? (
            <View style={styles.listQuietPlaceholder} />
          ) : historyEmpty ? (
            <LogHistoryEmptyState icon={OUTPUT_FEATURE_ICON} />
          ) : (
            <LogHistoryPreviewList
              items={historyRows.map((row) =>
                buildTimestampLogRowItem({
                  id: String(row.id),
                  title: formatOutputListTitle(row),
                  whenIso: row.occurred_at,
                  accessibilityLabel: `${outputKindLabel(row.kind)}. ${formatOutputMl(row.amount_ml)}. View details`,
                }),
              )}
              visibleCount={historyVisibleCount}
              hasMore={historyHasMore}
              loadingMore={historyLoadingMore}
              loadMoreLabel="load more"
              onLoadMore={() => void loadMoreHistory()}
              rowTextLayout="default"
              onPressItem={(logId) => navigation.navigate("OutputLogDetail", { id: logId })}
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
  whenRow: { flexDirection: "row", gap: 10 },
  whenCol: { flex: 1 },
  whenPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 42,
    paddingHorizontal: 12,
    borderRadius: FLARE_INPUT_BORDER_RADIUS,
    borderWidth: 1,
  },
  whenPillText: { flex: 1, fontSize: FLARE_FONT_SIZE.body, fontFamily: FLARE_FONT_FAMILY.regular },
  notesInput: { marginTop: 0 },
  fieldError: { marginTop: 8, marginBottom: 4 },
  sheetActions: { marginTop: STACKED_DETAIL_ROW_EDGE, gap: 8 },
  todayTotalCard: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: SCREEN_EDGE_PADDING,
  },
  todayTotalLabel: {
    fontSize: FLARE_FONT_SIZE.caption,
    fontFamily: FLARE_FONT_FAMILY.medium,
    marginBottom: 4,
  },
  todayTotalValue: {
    fontSize: 28,
    fontFamily: FLARE_FONT_FAMILY.bold,
  },
  listQuietPlaceholder: {
    minHeight: 72,
  },
});
