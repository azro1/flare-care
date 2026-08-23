import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PrimaryButton, SecondaryButton } from "./FlareButton";
import { flareFieldErrorStyle, FlareTextInput, flareInputStyles } from "./FlareInput";
import { FlareScreenSectionTitle } from "./FlareScreenSectionTitle";
import { ScrollView } from "../lib/scrollViews";
import { type MedicalSupplyFormState } from "../lib/medicalSuppliesShared";
import {
  CARD_INNER_PADDING,
  CARD_SECTION_INNER_GAP,
  COLLAPSING_TITLE_CONTENT_GAP,
  CONFIRM_MODAL_ACTIONS_GAP,
  CONFIRM_MODAL_STACK_GAP,
  FLARE_FONT_FAMILY,
  FLARE_FONT_SIZE,
  SCREEN_EDGE_PADDING,
  TRAY_IN_CARD_PADDING,
} from "../lib/layoutConstants";
import { useFlareColors } from "../theme";

/** Match bowel / meds / weight sheet close glyph (not the smaller tip-card close). */
const SHEET_CLOSE_ICON_SIZE = FLARE_FONT_SIZE.pageTitle + 4;

export function MedicalSupplyItemSheet({
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
  initialValues: MedicalSupplyFormState;
  saving: boolean;
  saveError: string;
  onClose: () => void;
  onSave: (values: MedicalSupplyFormState) => void;
}) {
  const c = useFlareColors();
  const insets = useSafeAreaInsets();
  const errTextStyle = flareFieldErrorStyle(c, "input");
  const [form, setForm] = useState<MedicalSupplyFormState>(initialValues);
  const [nameError, setNameError] = useState("");
  const [quantityError, setQuantityError] = useState("");

  useEffect(() => {
    if (visible) {
      setForm(initialValues);
      setNameError("");
      setQuantityError("");
    }
  }, [visible, initialValues]);

  const setField = <K extends keyof MedicalSupplyFormState>(key: K, value: MedicalSupplyFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSavePress = () => {
    const nameMissing = !form.name.trim();
    const quantityMissing = !form.quantity.trim();
    setNameError(nameMissing ? "Item name is required." : "");
    setQuantityError(quantityMissing ? "Quantity is required." : "");
    if (nameMissing || quantityMissing) return;
    onSave(form);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={[styles.sheetRoot, { backgroundColor: c.screen }]}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View
          style={[
            styles.sheetHeader,
            { borderBottomColor: c.cardBorder, paddingTop: Math.max(insets.top, SCREEN_EDGE_PADDING) },
          ]}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={onClose}
            hitSlop={SCREEN_EDGE_PADDING}
            style={styles.sheetClose}
          >
            <Ionicons name="close" size={SHEET_CLOSE_ICON_SIZE} color={c.textMuted} />
          </Pressable>
          <Text style={[styles.sheetTitle, { color: c.text }]}>{editingId ? "Edit item" : "Add item"}</Text>
          <View style={styles.sheetClose} />
        </View>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.sheetScroll,
            { paddingBottom: insets.bottom + CONFIRM_MODAL_ACTIONS_GAP + SCREEN_EDGE_PADDING },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <FlareScreenSectionTitle compact>Item name *</FlareScreenSectionTitle>
          <FlareTextInput
            value={form.name}
            onChangeText={(name) => setField("name", name)}
            placeholder="e.g. Dressings, giving sets"
            autoCapitalize="sentences"
          />
          {nameError ? <Text style={errTextStyle}>{nameError}</Text> : null}

          <FlareScreenSectionTitle compact style={styles.sectionSpaced}>
            Quantity *
          </FlareScreenSectionTitle>
          <FlareTextInput
            value={form.quantity}
            onChangeText={(quantity) => setField("quantity", quantity)}
            placeholder="e.g. 7 or 1 pack"
          />
          {quantityError ? <Text style={errTextStyle}>{quantityError}</Text> : null}

          <FlareScreenSectionTitle compact style={styles.sectionSpaced}>
            Notes
          </FlareScreenSectionTitle>
          <FlareTextInput
            multiline
            value={form.notes}
            onChangeText={(notes) => setField("notes", notes)}
            placeholder="Optional"
            style={styles.notesInput}
          />

          {saveError ? <Text style={[errTextStyle, styles.saveError]}>{saveError}</Text> : null}

          <View style={styles.sheetActions}>
            <PrimaryButton title={saving ? "Saving…" : "Save"} onPress={handleSavePress} disabled={saving} />
            <SecondaryButton title="Cancel" onPress={onClose} disabled={saving} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheetRoot: { flex: 1 },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: CONFIRM_MODAL_STACK_GAP,
    paddingBottom: SCREEN_EDGE_PADDING,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sheetClose: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  sheetTitle: { fontSize: FLARE_FONT_SIZE.navTitle, fontFamily: FLARE_FONT_FAMILY.bold },
  sheetScroll: { paddingHorizontal: TRAY_IN_CARD_PADDING, paddingTop: CARD_INNER_PADDING },
  sectionSpaced: { marginTop: COLLAPSING_TITLE_CONTENT_GAP },
  notesInput: { minHeight: flareInputStyles.textarea.minHeight, textAlignVertical: "top" },
  saveError: { marginTop: CARD_SECTION_INNER_GAP },
  sheetActions: { gap: CONFIRM_MODAL_STACK_GAP, marginTop: CONFIRM_MODAL_ACTIONS_GAP + SCREEN_EDGE_PADDING },
});
