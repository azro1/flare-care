import { FLARE_CHROME_LUCIDE, FlareLucideIcon, FLARE_FEATURE_LUCIDE } from "../lib/flareLucideIcons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { showFlareAlert } from "../components/FlareAlertHost";
import { ScrollView } from "../lib/scrollViews";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PrimaryButton, SecondaryButton } from "../components/FlareButton";
import { flareFieldErrorStyle, FlareTextInput } from "../components/FlareInput";
import { Card } from "../components/MidnightLagoonCard";
import { TrayRow } from "../components/MidnightLagoonTray";
import { ConfirmModal } from "../components/ConfirmModal";
import { useDeferredListLoading } from "../lib/useDeferredListLoading";
import { useLogListSelection } from "../lib/useLogListSelection";
import { formatUkDate } from "../lib/formatUkDate";
import { SPACING, TYPOGRAPHY } from "../designTokens";
import { FLARE_FONT_FAMILY, FLARE_FONT_SIZE, SCREEN_EDGE_PADDING } from "../lib/layoutConstants";
import { STACKED_DETAIL_ROW_EDGE } from "../components/StackedDetailField";
import {
  APPOINTMENT_QUESTIONS_HINT,
  appointmentQuestionFormFromRow,
  appointmentQuestionPayloadFromForm,
  deleteAppointmentQuestionsForUser,
  emptyAppointmentQuestionForm,
  fetchAppointmentQuestionsForUser,
  getAppointmentQuestionsCache,
  invalidateAppointmentQuestionsCache,
  validateAppointmentQuestionForm,
  type AppointmentQuestionFormState,
  type AppointmentQuestionRow,
} from "../lib/appointmentQuestionsShared";
import { supabase, TABLES } from "../lib/supabase";
import { useFlareColors } from "../theme";

type SessionUser = { id: string };

const QUESTIONS_EMPTY_ICON = FLARE_CHROME_LUCIDE.edit;

function QuestionSheet({
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
  initialValues: AppointmentQuestionFormState;
  saving: boolean;
  saveError: string;
  onClose: () => void;
  onSave: (values: AppointmentQuestionFormState) => void;
}) {
  const c = useFlareColors();
  const insets = useSafeAreaInsets();
  const errTextStyle = flareFieldErrorStyle(c, "input");
  const [form, setForm] = useState(initialValues);
  const [fieldError, setFieldError] = useState("");

  useEffect(() => {
    if (visible) {
      setForm(initialValues);
      setFieldError("");
    }
  }, [visible, initialValues]);

  const handleSavePress = () => {
    const validationError = validateAppointmentQuestionForm(form);
    if (validationError) {
      setFieldError(validationError);
      return;
    }
    setFieldError("");
    onSave(form);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={[styles.sheetRoot, { backgroundColor: c.screen, paddingTop: insets.top }]}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={[styles.sheetHeader, { borderBottomColor: c.cardBorder }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={onClose}
            style={styles.sheetClose}
            hitSlop={10}
          >
            <FlareLucideIcon icon={FLARE_CHROME_LUCIDE.close} size={22} color={c.text} />
          </Pressable>
          <Text style={[styles.sheetTitle, { color: c.text }]}>
            {editingId ? "Edit question" : "New question"}
          </Text>
          <View style={styles.sheetClose} />
        </View>

        <ScrollView
          contentContainerStyle={[styles.sheetScroll, { paddingBottom: Math.max(insets.bottom, 16) + 24 }]}
          keyboardShouldPersistTaps="handled"
        >
          <FlareTextInput
            value={form.body}
            onChangeText={(body) => setForm({ body })}
            placeholder="Ask about…"
            multiline
            style={styles.bodyInput}
          />
          {fieldError ? <Text style={[errTextStyle, styles.fieldError]}>{fieldError}</Text> : null}
          {saveError ? <Text style={[errTextStyle, styles.fieldError]}>{saveError}</Text> : null}

          <View style={styles.sheetActions}>
            <PrimaryButton title={saving ? "Saving…" : "Save"} onPress={handleSavePress} disabled={saving} />
            <SecondaryButton title="Cancel" onPress={onClose} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/**
 * Appointments hub — Questions tab. User-authored clinic prep notes (not medical advice).
 */
export function AppointmentQuestionsPane({
  user,
  embedded = false,
  selectionRouteName = "Appointments",
  headerActive = true,
  registerOpenAdd,
  onSelectionModeChange,
}: {
  user: SessionUser;
  embedded?: boolean;
  selectionRouteName?: string;
  /** When false, don’t overwrite the hub header (other tab is showing). */
  headerActive?: boolean;
  registerOpenAdd?: (openAdd: () => void) => void;
  onSelectionModeChange?: (selectionMode: boolean) => void;
}) {
  const c = useFlareColors();
  const navigation = useNavigation<any>();
  const cached = getAppointmentQuestionsCache(user.id);
  const [rows, setRows] = useState<AppointmentQuestionRow[]>(() => cached?.rows ?? []);
  const [loading, setLoading] = useState(() => cached == null);
  const [form, setForm] = useState<AppointmentQuestionFormState>(() => emptyAppointmentQuestionForm());
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const itemIds = useMemo(() => rows.map((row) => String(row.id)), [rows]);
  const renderHint = useCallback(
    () => (
      <InfoHintButton
        title="Questions"
        message={APPOINTMENT_QUESTIONS_HINT}
        accessibilityLabel="About Questions"
      />
    ),
    [],
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
    routeName: selectionRouteName,
    itemIds,
    navigation,
    headerTitle: "Questions",
    renderIdleHeaderRight: headerActive ? renderHint : undefined,
    ownsHeader: headerActive,
  });

  useEffect(() => {
    onSelectionModeChange?.(selectionMode);
  }, [onSelectionModeChange, selectionMode]);

  const refresh = useCallback(
    async (opts?: { alertOnError?: boolean }) => {
      try {
        const next = await fetchAppointmentQuestionsForUser(user.id);
        setRows(next);
      } catch (err: unknown) {
        if (opts?.alertOnError !== false) {
          const message = err instanceof Error ? err.message : "Could not load questions.";
          showFlareAlert("Could not load", message);
        }
      } finally {
        setLoading(false);
      }
    },
    [user.id],
  );

  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  // Hub keeps all panes mounted — only fetch when Questions is the active tab
  // (avoids an error modal the moment Appointments opens).
  useEffect(() => {
    if (!headerActive) return;
    const seed = getAppointmentQuestionsCache(user.id);
    if (seed) {
      setRows(seed.rows);
      setLoading(false);
    } else {
      setLoading(true);
    }
    void refreshRef.current({ alertOnError: true });
  }, [headerActive, user.id]);

  useFocusEffect(
    useCallback(() => {
      if (!headerActive) return;
      void refreshRef.current({ alertOnError: false });
    }, [headerActive]),
  );

  const closeSheet = useCallback(() => {
    setSheetOpen(false);
    setSaveError("");
    setEditingId(null);
    setForm(emptyAppointmentQuestionForm());
  }, []);

  const openAdd = useCallback(() => {
    setForm(emptyAppointmentQuestionForm());
    setEditingId(null);
    setSaveError("");
    setSheetOpen(true);
  }, []);

  useEffect(() => {
    registerOpenAdd?.(openAdd);
  }, [openAdd, registerOpenAdd]);

  const openEdit = useCallback((row: AppointmentQuestionRow) => {
    setForm(appointmentQuestionFormFromRow(row));
    setEditingId(row.id);
    setSaveError("");
    setSheetOpen(true);
  }, []);

  const handleSave = async (values: AppointmentQuestionFormState) => {
    setSaveError("");
    setSaving(true);
    try {
      const payload = appointmentQuestionPayloadFromForm(values);
      if (editingId) {
        const { error } = await supabase
          .from(TABLES.APPOINTMENT_QUESTIONS)
          .update(payload)
          .eq("id", editingId)
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from(TABLES.APPOINTMENT_QUESTIONS)
          .insert([{ body: payload.body, user_id: user.id }]);
        if (error) throw error;
      }
      closeSheet();
      invalidateAppointmentQuestionsCache(user.id);
      await refresh();
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Could not save this question.");
    } finally {
      setSaving(false);
    }
  };

  const handleBulkDeleteConfirm = useCallback(() => {
    void runBulkDelete(async (ids) => {
      try {
        await deleteAppointmentQuestionsForUser(user.id, ids);
        await refresh();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Could not delete these questions.";
        showFlareAlert("Could not delete", message);
        throw err;
      }
    });
  }, [refresh, runBulkDelete, user.id]);

  const listInitialLoad = loading && rows.length === 0;
  const showListLoading = useDeferredListLoading(listInitialLoad);
  const listEmpty = !loading && rows.length === 0;

  return (
    <>
      {showListLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="small" color={c.primary} />
        </View>
      ) : listEmpty ? (
        <Card>
          <View style={styles.emptyWrap}>
            <FlareLucideIcon icon={QUESTIONS_EMPTY_ICON} size={40} color={c.textSecondary} />
            <Text style={[styles.emptyText, { color: c.textSecondary, fontFamily: TYPOGRAPHY.fontFamily.regular }]}>
              No questions yet.
            </Text>
          </View>
        </Card>
      ) : (
        <Card noPadding style={{ paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md }}>
          {rows.map((row) => {
            const timestamp = new Date(row.created_at).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
            });
            return (
              <TrayRow
                key={row.id}
                icon={FLARE_FEATURE_LUCIDE.questions}
                label={row.body}
                value={timestamp}
                showChevron
                onPress={() => openEdit(row)}
                onLongPress={selectionMode ? undefined : () => enterSelectionWith(String(row.id))}
              />
            );
          })}
        </Card>
      )}

      <ConfirmModal
        visible={bulkDeleteOpen}
        title={selectedIds.size === 1 ? "Delete question?" : `Delete ${selectedIds.size} questions?`}
        message="This action cannot be undone."
        confirmLabel={bulkDeleting ? "Deleting…" : "Delete"}
        confirmDanger
        onConfirm={handleBulkDeleteConfirm}
        onCancel={() => setBulkDeleteOpen(false)}
      />

      {sheetOpen ? (
        <QuestionSheet
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
  );
}

const styles = StyleSheet.create({
  loadingWrap: {
    paddingVertical: 24,
    alignItems: "center",
  },
  emptyWrap: {
    alignItems: "center",
    paddingVertical: SPACING.xl,
    gap: SPACING.md,
  },
  emptyText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    textAlign: "center",
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
  bodyInput: {
    minHeight: 120,
    textAlignVertical: "top",
  },
  fieldError: { marginTop: 8, marginBottom: 4 },
  sheetActions: { marginTop: STACKED_DETAIL_ROW_EDGE, gap: 8 },
});
