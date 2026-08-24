import { FLARE_CHROME_LUCIDE, FlareLucideIcon } from "../lib/flareLucideIcons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
    InteractionManager,
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
import { TrackerThumbFab, useTrackerThumbFabLayout } from "../components/TrackerThumbFab";
import { STACKED_DETAIL_ROW_EDGE } from "../components/StackedDetailField";
import { invalidateDashboardSnapshot } from "../lib/dashboardSnapshotCache";
import { recordRecentActivityEvent } from "../lib/recentActivityEvents";
import { useLogListSelection } from "../lib/useLogListSelection";
import { usePaginatedLogList } from "../lib/paginatedLogList";
import { formatUkDate } from "../lib/formatUkDate";
import {
  FLARE_FONT_FAMILY,
  FLARE_FONT_SIZE,
  CARD_SECTION_INNER_GAP,
  SCREEN_EDGE_PADDING,
  bottomTabBarHeight,
} from "../lib/layoutConstants";
import {
  WEIGHT_FEATURE_ICON,
  deleteWeightsForUser,
  formatWeightKg,
  getWeightListCache,
  invalidateWeightListCache,
  normalizeWeightKgInput,
  quickWeightFormState,
  setWeightListCache,
  validateWeightForm,
  weightPayloadFromForm,
  type WeightFormState,
  type WeightRow,
} from "../lib/weightShared";
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

function isAndroidPickerDismissed(event: { type?: string }): boolean {
  return Platform.OS === "android" && event.type === "dismissed";
}

export function WeightLogSheet({
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
  initialValues: WeightFormState;
  saving: boolean;
  saveError: string;
  onClose: () => void;
  onSave: (values: WeightFormState) => void;
}) {
  const c = useFlareColors();
  const insets = useSafeAreaInsets();
  const errTextStyle = flareFieldErrorStyle(c, "input");
  const [form, setForm] = useState<WeightFormState>(initialValues);
  const [fieldError, setFieldError] = useState("");
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [pickerDraftDate, setPickerDraftDate] = useState<Date | null>(null);

  React.useEffect(() => {
    if (visible) {
      setForm(initialValues);
      setFieldError("");
    }
  }, [visible, initialValues]);

  const setField = <K extends keyof WeightFormState>(key: K, value: WeightFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSavePress = () => {
    const validationError = validateWeightForm(form);
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
          <Text style={[styles.sheetTitle, { color: c.text }]}>{editingId ? "Edit weight" : "Log weight"}</Text>
          <View style={styles.sheetClose} />
        </View>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.sheetScroll, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
        >
          <FlareScreenSectionTitle compact>Date *</FlareScreenSectionTitle>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Date"
            onPress={() => {
              setPickerDraftDate(form.date ? parseYmd(form.date) : new Date());
              setDatePickerOpen(true);
            }}
            style={[styles.datePill, { backgroundColor: c.surfaceSubtle, borderColor: c.cardBorder }]}
          >
            <FlareLucideIcon icon={FLARE_CHROME_LUCIDE.calendar} size={18} color={c.textSecondary} />
            <Text style={[styles.datePillText, { color: form.date ? c.text : c.textMuted }]}>
              {form.date ? formatUkDate(form.date) : ""}
            </Text>
          </Pressable>

          <FlareScreenSectionTitle compact style={{ marginTop: 16 }}>
            Weight (kg) *
          </FlareScreenSectionTitle>
          <FlareTextInput
            value={form.valueKg}
            onChangeText={(valueKg) => setField("valueKg", normalizeWeightKgInput(valueKg))}
            placeholder="e.g. 70.5"
            keyboardType="decimal-pad"
          />

          <FlareScreenSectionTitle compact style={{ marginTop: 16 }}>
            Notes
          </FlareScreenSectionTitle>
          <FlareTextInput
            multiline
            value={form.notes}
            onChangeText={(notes) => setField("notes", notes)}
            placeholder="e.g. morning, after breakfast"
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
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function WeightScreen({ user }: { user: SessionUser }) {
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
  } = usePaginatedLogList<WeightRow>({
    userId: user.id,
    table: TABLES.TRACK_WEIGHT,
    select: "*",
    orderColumn: "date",
    ascending: false,
    initialVisible: LOG_HISTORY_LOAD_MORE_BATCH,
    cache: {
      get: getWeightListCache,
      set: setWeightListCache,
    },
  });

  const [form, setForm] = useState<WeightFormState>(() => quickWeightFormState());
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const weightItemIds = useMemo(() => historyRows.map((row) => String(row.id)), [historyRows]);
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
    routeName: "Weight",
    itemIds: weightItemIds,
    navigation,
    headerTitle: "My Weight",
  });

  const handleBulkDeleteConfirm = useCallback(() => {
    void runBulkDelete(async (ids) => {
      try {
        await deleteWeightsForUser(user.id, ids);
        await recordRecentActivityEvent(user.id, "weight-deleted");
        invalidateDashboardSnapshot(user.id);
        invalidateWeightListCache(user.id);
        await refreshHistoryLoad();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Could not delete these entries.";
        showFlareAlert("Could not delete", message);
        throw err;
      }
    });
  }, [refreshHistoryLoad, runBulkDelete, user.id]);

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
    setForm(quickWeightFormState());
  }, []);

  const openNewLog = useCallback(() => {
    setForm(quickWeightFormState());
    setEditingId(null);
    setSaveError("");
    setSheetOpen(true);
  }, []);

  const handleSave = async (values: WeightFormState) => {
    setSaveError("");
    setSaving(true);
    try {
      const payload = weightPayloadFromForm(values);
      if (editingId) {
        const { error } = await supabase
          .from(TABLES.TRACK_WEIGHT)
          .update(payload)
          .eq("id", editingId)
          .eq("user_id", user.id);
        if (error) throw error;
        await recordRecentActivityEvent(user.id, "weight-updated");
      } else {
        const { error } = await supabase.from(TABLES.TRACK_WEIGHT).insert([{ ...payload, user_id: user.id }]);
        if (error) throw error;
      }
      closeSheet();
      invalidateDashboardSnapshot(user.id);
      void refreshHistoryLoad();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Could not save this entry.";
      setSaveError(message);
    } finally {
      setSaving(false);
    }
  };

  const listInitialLoad = historyLoading && historyRows.length === 0;
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
            accessibilityLabel="Log weight"
            onPress={openNewLog}
            tabBarClearance={tabBarClearance}
          />
        ) : null
      }
      footer={
        <>
          <ConfirmModal
            visible={bulkDeleteOpen}
            title={selectedIds.size === 1 ? "Delete weight entry?" : `Delete ${selectedIds.size} weight entries?`}
            message="This action cannot be undone."
            confirmLabel={bulkDeleting ? "Deleting…" : "Delete"}
            confirmDestructive
            onConfirm={handleBulkDeleteConfirm}
            onCancel={() => setBulkDeleteOpen(false)}
          />
          {sheetOpen ? (
            <WeightLogSheet
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
      <LogHistoryCard>
        <View style={logHistoryCardStyles.trackerCardBody}>
          {listInitialLoad ? (
            <LogHistoryListLoading />
          ) : historyEmpty ? (
            <LogHistoryEmptyState icon={WEIGHT_FEATURE_ICON} />
          ) : (
            <LogHistoryPreviewList
              items={historyRows.map((row) =>
                buildTimestampLogRowItem({
                  id: String(row.id),
                  title: formatWeightKg(row.value_kg),
                  whenIso: row.created_at,
                  accessibilityLabel: `${formatUkDate(row.date)}. ${formatWeightKg(row.value_kg)}. View details`,
                }),
              )}
              visibleCount={historyVisibleCount}
              hasMore={historyHasMore}
              loadingMore={historyLoadingMore}
              loadMoreLabel="load more"
              onLoadMore={() => void loadMoreHistory()}
              rowTextLayout="compact"
              onPressItem={(logId) => navigation.navigate("WeightLogDetail", { id: logId })}
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
  datePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 42,
    paddingHorizontal: 12,
    borderRadius: FLARE_INPUT_BORDER_RADIUS,
    borderWidth: 1,
  },
  datePillText: { flex: 1, fontSize: FLARE_FONT_SIZE.body, fontFamily: FLARE_FONT_FAMILY.regular },
  notesInput: { marginTop: 0 },
  fieldError: { marginTop: 8, marginBottom: 4 },
  sheetActions: { marginTop: STACKED_DETAIL_ROW_EDGE, gap: 8 },
});
