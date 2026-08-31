import { FLARE_CHROME_LUCIDE, FlareLucideIcon } from "../lib/flareLucideIcons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  Animated,
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
import {
  flareFieldErrorStyle,
  FlareInputTrigger,
  FlareTextInput,
  FLARE_INPUT_BORDER_RADIUS,
} from "../components/FlareInput";
import { FlareScreenSectionTitle } from "../components/FlareScreenSectionTitle";
import {
  LogHistoryCard,
  LogHistoryListLoading,
  LogHistoryEmptyState,
  LogHistoryPreviewList,
  LOG_HISTORY_LOAD_MORE_BATCH,
  buildTimestampLogRowItem,
  logHistoryCardStyles,
  LogHistoryListQuietPlaceholder,
} from "../components/LogHistoryList";
import { ConfirmModal } from "../components/ConfirmModal";
import { InfoHintButton } from "../components/InfoHintButton";
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
  INTAKE_FEATURE_ICON,
  INTAKE_KIND_OPTIONS,
  deleteIntakesForUser,
  getIntakeListCache,
  intakeKindLabel,
  intakePayloadFromForm,
  invalidateIntakeListCache,
  normalizeIntakeKind,
  normalizeIntakeMlInput,
  quickIntakeFormState,
  setIntakeListCache,
  validateIntakeForm,
  type IntakeFormState,
  type IntakeKind,
  type IntakeRow,
} from "../lib/intakeShared";
import { hubTabFadeStyles, useHubTabFade } from "../lib/useHubTabFade";
import { useDeferredListLoading } from "../lib/useDeferredListLoading";
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

export function IntakeLogSheet({
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
  initialValues: IntakeFormState;
  saving: boolean;
  saveError: string;
  onClose: () => void;
  onSave: (values: IntakeFormState) => void;
}) {
  const c = useFlareColors();
  const insets = useSafeAreaInsets();
  const errTextStyle = flareFieldErrorStyle(c, "input");
  const [form, setForm] = useState<IntakeFormState>(initialValues);
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

  const setField = <K extends keyof IntakeFormState>(key: K, value: IntakeFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSavePress = () => {
    const validationError = validateIntakeForm(form);
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

  const kindLabel = intakeKindLabel(form.kind);

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
          <Text style={[styles.sheetTitle, { color: c.text }]}>
            {editingId ? "Edit entry" : "Log entry"}
          </Text>
          <View style={styles.sheetClose} />
        </View>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.sheetScroll, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
        >
          <FlareScreenSectionTitle compact>Type *</FlareScreenSectionTitle>
          <FlareInputTrigger
            accessibilityRole="button"
            accessibilityLabel={kindLabel ? `Type, ${kindLabel}` : "Choose type"}
            onPress={() => {
              setDatePickerOpen(false);
              setTimePickerOpen(false);
              setPickerDraftDate(null);
              setPickerDraftTime(null);
              setKindPickerOpen(true);
            }}
          >
            <View style={styles.kindPickerRow}>
              <Text style={[styles.kindPickerText, { color: kindLabel ? c.text : c.textMuted }]} numberOfLines={1}>
                {kindLabel || "Select"}
              </Text>
              <FlareLucideIcon icon={FLARE_CHROME_LUCIDE.down} size={NAV_ROW_CHEVRON_SIZE} color={c.textMuted} />
            </View>
          </FlareInputTrigger>

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
            Item *
          </FlareScreenSectionTitle>
          <FlareTextInput
            value={form.body}
            onChangeText={(body) => setField("body", body)}
            placeholder={form.kind === "drink" ? "e.g. Water" : "e.g. Sandwich"}
            autoCapitalize="sentences"
          />

          {form.kind === "drink" ? (
            <>
              <FlareScreenSectionTitle compact style={{ marginTop: 16 }}>
                Amount (ml) *
              </FlareScreenSectionTitle>
              <FlareTextInput
                value={form.amountMl}
                onChangeText={(amountMl) => setField("amountMl", normalizeIntakeMlInput(amountMl))}
                placeholder="e.g. 300"
                keyboardType="decimal-pad"
              />
            </>
          ) : null}

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
          options={INTAKE_KIND_OPTIONS.map((o) => o.label)}
          onSelect={(label) => {
            const match = INTAKE_KIND_OPTIONS.find((o) => o.label === label);
            if (match) {
              setForm((prev) => ({
                ...prev,
                kind: match.value,
                amountMl: match.value === "food" ? "" : prev.amountMl,
              }));
            }
            setKindPickerOpen(false);
          }}
          onCancel={() => setKindPickerOpen(false)}
        />
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function IntakeScreen({ user }: { user: SessionUser }) {
  const c = useFlareColors();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const tabBarClearance = bottomTabBarHeight(insets.bottom);
  const { scrollBottomPad } = useTrackerThumbFabLayout(tabBarClearance);

  const {
    rows: historyRows,
    totalCount: historyTotalCount,
    loading: historyLoading,
    loadingMore: historyLoadingMore,
    hasMore: historyHasMore,
    loadMore: loadMoreHistory,
    refresh: refreshHistoryLoad,
    syncExpandedFromCache,
  } = usePaginatedLogList<IntakeRow>({
    userId: user.id,
    table: TABLES.TRACK_INTAKE,
    select: "*",
    orderColumn: "occurred_at",
    ascending: false,
    initialVisible: LOG_HISTORY_LOAD_MORE_BATCH,
    cache: {
      get: getIntakeListCache,
      set: setIntakeListCache,
    },
  });

  const [form, setForm] = useState<IntakeFormState>(() => quickIntakeFormState());
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const { tabIndex, goToTab, paneStyle } = useHubTabFade(0, INTAKE_KIND_OPTIONS.length);

  const activeKind: IntakeKind = INTAKE_KIND_OPTIONS[tabIndex]?.value ?? "food";
  const onFoodTab = tabIndex === 0;
  const foodRows = useMemo(
    () => historyRows.filter((row) => normalizeIntakeKind(row.kind) === "food"),
    [historyRows],
  );
  const drinkRows = useMemo(
    () => historyRows.filter((row) => normalizeIntakeKind(row.kind) === "drink"),
    [historyRows],
  );
  const activeRows = onFoodTab ? foodRows : drinkRows;

  const intakeItemIds = useMemo(() => activeRows.map((row) => String(row.id)), [activeRows]);
  const renderIntakeHeaderTitle = useCallback(
    () => (
      <View style={styles.headerTitleWithHint}>
        <InfoHintButton
          title="Food & Drink"
          message="Log what you eat and drink when your care team asks you to. Optional — skip if you don’t need it."
          accessibilityLabel="About Food & Drink"
        />
        <Text
          style={{
            fontFamily: FLARE_FONT_FAMILY.bold,
            fontSize: FLARE_FONT_SIZE.navTitle,
            color: c.text,
          }}
        >
          Food & Drink
        </Text>
      </View>
    ),
    [c.text],
  );
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
    routeName: "Intake",
    itemIds: intakeItemIds,
    navigation,
    headerTitle: renderIntakeHeaderTitle,
  });

  const handleBulkDeleteConfirm = useCallback(() => {
    void runBulkDelete(async (ids) => {
      try {
        await deleteIntakesForUser(user.id, ids);
        invalidateDashboardSnapshot(user.id);
        invalidateIntakeListCache(user.id);
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
      void refreshHistoryLoadRef.current();
    }, []),
  );

  const closeSheet = useCallback(() => {
    setSheetOpen(false);
    setSaveError("");
    setEditingId(null);
    setForm(quickIntakeFormState(activeKind));
  }, [activeKind]);

  const openNewLog = useCallback(() => {
    setForm(quickIntakeFormState(activeKind));
    setEditingId(null);
    setSaveError("");
    setSheetOpen(true);
  }, [activeKind]);

  const handleSave = async (values: IntakeFormState) => {
    setSaveError("");
    setSaving(true);
    try {
      const payload = intakePayloadFromForm(values);
      if (editingId) {
        const { error } = await supabase
          .from(TABLES.TRACK_INTAKE)
          .update(payload)
          .eq("id", editingId)
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from(TABLES.TRACK_INTAKE).insert([{ ...payload, user_id: user.id }]);
        if (error) throw error;
      }
      // Land on the tab that matches what was saved.
      const savedKind = normalizeIntakeKind(payload.kind);
      const savedIndex = INTAKE_KIND_OPTIONS.findIndex((o) => o.value === savedKind);
      if (savedIndex >= 0 && savedIndex !== tabIndex) {
        goToTab(savedIndex, true);
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
  const showListLoading = useDeferredListLoading(listInitialLoad);
  const scrollBottomPadTotal = selectionMode ? tabBarClearance : scrollBottomPad;

  const renderKindList = (kind: IntakeKind, rows: IntakeRow[]) => {
    const tabEmpty = !historyLoading && rows.length === 0 && historyTotalCount >= 0;
    return (
      <LogHistoryCard>
        <View style={logHistoryCardStyles.trackerCardBody}>
          {showListLoading ? (
            <LogHistoryListLoading />
          ) : listInitialLoad ? (
            <LogHistoryListQuietPlaceholder />
          ) : tabEmpty ? (
            <LogHistoryEmptyState icon={INTAKE_FEATURE_ICON} />
          ) : (
            <LogHistoryPreviewList
              items={rows.map((row) => {
                const label = intakeKindLabel(row.kind);
                return buildTimestampLogRowItem({
                  id: String(row.id),
                  title: row.body,
                  whenIso: row.occurred_at,
                  accessibilityLabel: `${label}. ${row.body}. View details`,
                });
              })}
              visibleCount={rows.length}
              hasMore={historyHasMore}
              loadingMore={historyLoadingMore}
              loadMoreLabel="load more"
              onLoadMore={() => void loadMoreHistory()}
              rowTextLayout="default"
              onPressItem={(logId) => {
                const row = rows.find((r) => String(r.id) === logId);
                navigation.navigate("IntakeLogDetail", {
                  id: logId,
                  kind: row?.kind ?? kind,
                });
              }}
              selectionMode={selectionMode}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
              onLongPressItem={enterSelectionWith}
            />
          )}
        </View>
      </LogHistoryCard>
    );
  };

  return (
    <InstructionScreenShell
      showInstruction={false}
      contentPaddingBottom={scrollBottomPadTotal}
      instruction={null}
      floatingAction={
        !selectionMode ? (
          <TrackerThumbFab
            accessibilityLabel={`Log ${intakeKindLabel(activeKind).toLowerCase()}`}
            onPress={openNewLog}
            tabBarClearance={tabBarClearance}
          />
        ) : null
      }
      footer={
        <>
          <ConfirmModal
            visible={bulkDeleteOpen}
            title={
              selectedIds.size === 1
                ? "Delete entry?"
                : `Delete ${selectedIds.size} entries?`
            }
            message="This action cannot be undone."
            confirmLabel={bulkDeleting ? "Deleting…" : "Delete"}
            confirmDestructive
            onConfirm={handleBulkDeleteConfirm}
            onCancel={() => setBulkDeleteOpen(false)}
          />
          {sheetOpen ? (
            <IntakeLogSheet
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
      <View style={styles.tabRow}>
        {INTAKE_KIND_OPTIONS.map((opt, index) => {
          const active = index === tabIndex;
          return (
            <Pressable
              key={opt.value}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={opt.label}
              onPress={() => goToTab(index)}
              style={styles.tabHit}
            >
              <Text
                style={[
                  styles.tabLabel,
                  { color: active ? c.text : c.textMuted },
                  active ? styles.tabLabelActive : null,
                ]}
              >
                {opt.label}
              </Text>
              <View
                style={[
                  styles.tabUnderline,
                  { backgroundColor: active ? c.primary : "transparent" },
                ]}
              />
            </Pressable>
          );
        })}
      </View>

      <View style={hubTabFadeStyles.stack}>
        <Animated.View
          style={paneStyle[0]}
          pointerEvents={onFoodTab ? "auto" : "none"}
          accessibilityElementsHidden={!onFoodTab}
          importantForAccessibility={onFoodTab ? "yes" : "no-hide-descendants"}
        >
          {renderKindList("food", foodRows)}
        </Animated.View>
        <Animated.View
          style={paneStyle[1]}
          pointerEvents={onFoodTab ? "none" : "auto"}
          accessibilityElementsHidden={onFoodTab}
          importantForAccessibility={onFoodTab ? "no-hide-descendants" : "yes"}
        >
          {renderKindList("drink", drinkRows)}
        </Animated.View>
      </View>
    </InstructionScreenShell>
  );
}

const styles = StyleSheet.create({
  headerTitleWithHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  tabRow: {
    flexDirection: "row",
    marginBottom: SCREEN_EDGE_PADDING,
    gap: 20,
  },
  tabHit: {
    paddingBottom: 8,
  },
  tabLabel: {
    fontSize: FLARE_FONT_SIZE.subhead,
    fontFamily: FLARE_FONT_FAMILY.regular,
  },
  tabLabelActive: {
    fontFamily: FLARE_FONT_FAMILY.bold,
  },
  tabUnderline: {
    marginTop: 6,
    height: 2,
    borderRadius: 1,
  },
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
  kindPickerRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  kindPickerText: { flex: 1, fontSize: FLARE_FONT_SIZE.body, fontFamily: FLARE_FONT_FAMILY.regular },
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
});
