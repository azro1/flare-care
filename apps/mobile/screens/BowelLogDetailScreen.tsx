import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import React, { useCallback, useLayoutEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { ScrollView } from "../lib/scrollViews";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ConfirmModal } from "../components/ConfirmModal";
import {
  LogDetailAddedHeader,
  LogDetailCard,
  LogDetailFieldGroup,
  LogDetailNotesCard,
} from "../components/LogDetailLayout";
import { flareCardSectionStyles } from "../components/FlareScreenSectionTitle";
import { formatBristolLine } from "../lib/bristolStoolChart";
import {
  boolToTri,
  invalidateBowelListCache,
  type BowelMovementRow,
  formatUkTimeFromOccurred,
  triStateDisplayLabel,
} from "../lib/bowelMovementShared";
import { invalidateDashboardSnapshot } from "../lib/dashboardSnapshotCache";
import { formatAddedAtHeader } from "../lib/logDisplay";
import { formatUkDate } from "../lib/formatUkDate";
import { FLARE_FONT_FAMILY, FLARE_FONT_SIZE, SCREEN_EDGE_PADDING } from "../lib/layoutConstants";
import { supabase, TABLES } from "../lib/supabase";
import { useFlareColors } from "../theme";
import type { BowelReturnParams, BristolGuideParams } from "./BristolGuideScreen";
import { BowelLogSheet } from "./BowelScreen";
import {
  bowelFormFromRow,
  bowelFormHasOptionalDetails,
  bowelPayloadFromForm,
  quickBowelFormState,
  type BowelFormState,
} from "../lib/bowelMovementShared";

type SessionUser = { id: string };

export type BowelLogDetailParams = {
  id: string;
  pickedBristolType?: number;
  openLogSheet?: boolean;
};

function triStateFromBool(value: boolean | null): string {
  return triStateDisplayLabel(boolToTri(value));
}

function DetailEditHeaderButton({ onPress, disabled }: { onPress: () => void; disabled?: boolean }) {
  const c = useFlareColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Edit entry"
      onPress={onPress}
      disabled={disabled}
      hitSlop={10}
      style={styles.headerEditButton}
    >
      <Ionicons name="create-outline" size={22} color={c.textMuted} accessibilityIgnoresInvertColors />
    </Pressable>
  );
}

function DetailDeleteHeaderButton({ onPress, disabled }: { onPress: () => void; disabled?: boolean }) {
  const c = useFlareColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Delete entry"
      onPress={onPress}
      disabled={disabled}
      hitSlop={10}
      style={styles.headerDeleteButton}
    >
      <MaterialCommunityIcons name="trash-can-outline" size={22} color={c.textMuted} accessibilityIgnoresInvertColors />
    </Pressable>
  );
}

function DetailEditDeleteHeaderButtons({
  onEdit,
  onDelete,
  disabled,
}: {
  onEdit: () => void;
  onDelete: () => void;
  disabled?: boolean;
}) {
  return (
    <View style={styles.headerEditDeleteRow}>
      <DetailEditHeaderButton onPress={onEdit} disabled={disabled} />
      <DetailDeleteHeaderButton onPress={onDelete} disabled={disabled} />
    </View>
  );
}

export function BowelLogDetailScreen({ user }: { user: SessionUser }) {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const c = useFlareColors();
  const insets = useSafeAreaInsets();
  const routeParams = (route.params as BowelLogDetailParams | undefined) ?? {};
  const id = String(routeParams.id ?? "");

  const [loading, setLoading] = useState(true);
  const [row, setRow] = useState<BowelMovementRow | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [form, setForm] = useState<BowelFormState>(() => quickBowelFormState());
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [showOptional, setShowOptional] = useState(false);
  const deleteInFlight = useRef(false);

  const load = useCallback(async () => {
    if (!id) {
      setRow(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from(TABLES.BOWEL_MOVEMENTS)
      .select("*")
      .eq("user_id", user.id)
      .eq("id", id)
      .maybeSingle();
    setRow(error || !data ? null : (data as BowelMovementRow));
    setLoading(false);
  }, [id, user.id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  useFocusEffect(
    useCallback(() => {
      const params = route.params as BowelLogDetailParams | undefined;
      const picked = params?.pickedBristolType;
      if (picked == null || picked < 1 || picked > 7) return;
      setForm((prev) => ({ ...prev, bristolType: picked }));
      if (params?.openLogSheet) {
        setSheetOpen(true);
        setSaveError("");
      }
      navigation.setParams({ pickedBristolType: undefined, openLogSheet: undefined });
    }, [navigation, route.params]),
  );

  const closeSheet = useCallback(() => {
    setSheetOpen(false);
    setSaveError("");
    setShowOptional(false);
    setForm(quickBowelFormState());
  }, []);

  const openGuide = useCallback(
    (highlightedType: number | null) => {
      const reopenSheet = sheetOpen;
      if (reopenSheet) setSheetOpen(false);
      const guideParams: BristolGuideParams = {
        pickMode: true,
        highlightedType: (highlightedType ?? form.bristolType) ?? undefined,
        returnOpenLogSheet: reopenSheet,
        returnRoute: "BowelLogDetail",
        returnRouteParams: { id },
      };
      navigation.navigate("BristolGuide", guideParams);
    },
    [form.bristolType, id, navigation, sheetOpen],
  );

  const handleSave = useCallback(
    async (values: BowelFormState) => {
      if (!id) return;
      setSaveError("");
      setSaving(true);
      try {
        const payload = bowelPayloadFromForm(values);
        const { error } = await supabase
          .from(TABLES.BOWEL_MOVEMENTS)
          .update(payload)
          .eq("id", id)
          .eq("user_id", user.id);
        if (error) throw error;
        closeSheet();
        invalidateDashboardSnapshot(user.id);
        await load();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Could not save this log.";
        setSaveError(message);
      } finally {
        setSaving(false);
      }
    },
    [closeSheet, id, load, user.id],
  );

  const handleDelete = useCallback(async () => {
    if (deleteInFlight.current || !id) return;
    deleteInFlight.current = true;
    setDeleting(true);
    setDeleteOpen(false);
    try {
      const { error } = await supabase.from(TABLES.BOWEL_MOVEMENTS).delete().eq("id", id).eq("user_id", user.id);
      if (error) throw error;
      invalidateDashboardSnapshot(user.id);
      invalidateBowelListCache(user.id);
      if (navigation.canGoBack()) navigation.goBack();
      else navigation.navigate("Bowel");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Could not delete this log.";
      Alert.alert("Could not delete", message);
    } finally {
      setDeleting(false);
      deleteInFlight.current = false;
    }
  }, [id, navigation, user.id]);

  const handleEdit = useCallback(() => {
    if (!row) return;
    const next = bowelFormFromRow(row);
    setForm(next);
    setSaveError("");
    setShowOptional(bowelFormHasOptionalDetails(next));
    setSheetOpen(true);
  }, [row]);

  useLayoutEffect(() => {
    if (loading || !row) {
      navigation.setOptions({ headerRight: undefined });
      return;
    }
    navigation.setOptions({
      headerRight: () => (
        <DetailEditDeleteHeaderButtons
          onEdit={handleEdit}
          onDelete={() => setDeleteOpen(true)}
          disabled={deleting}
        />
      ),
    });
    return () => {
      navigation.setOptions({ headerRight: undefined });
    };
  }, [deleting, handleEdit, loading, navigation, row]);

  const bottomPad = Math.max(insets.bottom, 16) + 24;
  const notes = row?.notes?.trim() ?? "";

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: c.screen, paddingBottom: bottomPad }]}>
        <ActivityIndicator color={c.primary} />
        <Text style={[styles.muted, { color: c.textMuted }]}>Loading…</Text>
      </View>
    );
  }

  if (!row) {
    return (
      <ScrollView
        style={[styles.screen, { backgroundColor: c.screen }]}
        contentContainerStyle={{ paddingBottom: bottomPad }}
      >
        <Text style={[styles.muted, { color: c.textMuted }]}>Could not load this entry.</Text>
      </ScrollView>
    );
  }

  return (
    <>
      <ScrollView
        style={[styles.screen, { backgroundColor: c.screen }]}
        contentContainerStyle={{ paddingBottom: bottomPad }}
        showsVerticalScrollIndicator={false}
      >
        <LogDetailAddedHeader text={formatAddedAtHeader(row.created_at)} />

        <LogDetailCard style={flareCardSectionStyles.container}>
          <LogDetailFieldGroup
            fields={[
              { label: "Date", value: formatUkDate(row.occurred_at) || "Not set" },
              { label: "Time", value: formatUkTimeFromOccurred(row.occurred_at) || "Not set" },
              { label: "Bristol type", value: formatBristolLine(row.bristol_type) },
              { label: "Blood visible?", value: triStateFromBool(row.blood) },
              { label: "Pain or straining?", value: triStateFromBool(row.strain) },
              { label: "Urgent need to go?", value: triStateFromBool(row.urgency) },
            ]}
          />
        </LogDetailCard>

        {notes ? <LogDetailNotesCard notes={notes} /> : null}
      </ScrollView>

      <ConfirmModal
        visible={deleteOpen}
        title="Delete bowel log"
        message="Are you sure you want to delete this log? This action cannot be undone."
        confirmLabel={deleting ? "Deleting…" : "Delete"}
        confirmDestructive
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
      />

      <BowelLogSheet
        visible={sheetOpen}
        editingId={id}
        initialValues={form}
        saving={saving}
        saveError={saveError}
        showOptional={showOptional}
        setShowOptional={setShowOptional}
        onClose={closeSheet}
        onSave={handleSave}
        onOpenGuide={(highlightedType) => openGuide(highlightedType)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: SCREEN_EDGE_PADDING },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  muted: { fontSize: FLARE_FONT_SIZE.body, fontFamily: FLARE_FONT_FAMILY.regular },
  headerEditDeleteRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerEditButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  headerDeleteButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
});
