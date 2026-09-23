/**
 * My Card — personal notes the user chooses to share.
 * Per-field input morphs to saved text + check after Save (Google-style).
 * Not a medical record / official ID / access card.
 */
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LogHistoryCard } from "../components/LogHistoryList";
import { FLARE_CHROME_LUCIDE, FlareLucideIcon } from "../lib/flareLucideIcons";
import {
  CARD_INNER_PADDING,
  CARD_SECTION_INNER_GAP,
  FLARE_FONT_FAMILY,
  FLARE_FONT_SIZE,
  FLARE_INLINE_ACTION_LINK,
  FLARE_LINE_HEIGHT,
  INSTRUCTION_CARD_RADIUS,
  SCREEN_EDGE_PADDING,
  STACKED_LINE_GAP,
  TRAY_ROW_PADDING_H,
  TRAY_ROW_PADDING_Y,
  bottomTabBarScrollInset,
} from "../lib/layoutConstants";
import {
  emptyMyIbdProfile,
  loadMyIbdProfile,
  MY_IBD_FIELD_MAX,
  MY_IBD_FIELDS,
  myIbdFieldIsSaved,
  saveMyIbdField,
  type MyIbdFieldKey,
  type MyIbdProfile,
} from "../lib/myIbdShared";
import { useFlareColors } from "../theme";

type Props = {
  userId: string;
};

export function MyCardScreen({ userId }: Props) {
  const c = useFlareColors();
  const insets = useSafeAreaInsets();
  const bottomScrollInset = bottomTabBarScrollInset(insets.bottom);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<MyIbdProfile>(() => emptyMyIbdProfile());
  /** Which field is in edit mode (null = none editing; saved fields show as locked). */
  const [editingKey, setEditingKey] = useState<MyIbdFieldKey | null>(null);
  const [draft, setDraft] = useState("");
  const [savingKey, setSavingKey] = useState<MyIbdFieldKey | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const next = await loadMyIbdProfile(userId);
      setProfile(next);
    } catch {
      Alert.alert("Couldn't load My Card", "Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const showEvt = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvt = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSub = Keyboard.addListener(showEvt, (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvt, () => setKeyboardHeight(0));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const beginEdit = (key: MyIbdFieldKey) => {
    setEditingKey(key);
    setDraft(profile[key]);
  };

  const cancelEdit = () => {
    setEditingKey(null);
    setDraft("");
  };

  const commitField = async (key: MyIbdFieldKey) => {
    if (savingKey) return;
    setSavingKey(key);
    try {
      const next = await saveMyIbdField(userId, key, draft, profile);
      setProfile(next);
      setEditingKey(null);
      setDraft("");
    } catch {
      Alert.alert("Couldn't save", "Check your connection and try again.");
    } finally {
      setSavingKey(null);
    }
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: c.screen }]}>
        <ActivityIndicator color={c.primary} />
      </View>
    );
  }

  const padBottom =
    keyboardHeight > 0 ? keyboardHeight + STACKED_LINE_GAP * 2 : bottomScrollInset + 24;

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: c.screen }]}
      contentContainerStyle={[styles.content, { paddingBottom: padBottom }]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
    >
      <LogHistoryCard style={styles.shellCard}>
        <Text style={[styles.lead, { color: c.text }]}>My Card</Text>
        <Text style={[styles.support, { color: c.textMuted }]}>
          A personal card containing information you choose to share.
        </Text>

        <View style={[styles.tray, { backgroundColor: c.surfaceSubtle }]}>
          {MY_IBD_FIELDS.map((field, index) => {
            const saved = myIbdFieldIsSaved(profile[field.key]);
            const isEditing = editingKey === field.key;
            const showBorder = index < MY_IBD_FIELDS.length - 1;
            const borderStyle = showBorder
              ? { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.cardBorder }
              : null;

            if (isEditing) {
              const busy = savingKey === field.key;
              return (
                <View key={field.key} style={[styles.fieldBlock, borderStyle]}>
                  <Text style={[styles.fieldLabel, { color: c.textSecondary }]}>{field.label}</Text>
                  <View style={styles.inputRow}>
                    <TextInput
                      value={draft}
                      onChangeText={setDraft}
                      placeholder={field.placeholder}
                      placeholderTextColor={c.textMuted}
                      maxLength={MY_IBD_FIELD_MAX[field.key]}
                      multiline={!!field.multiline}
                      autoFocus
                      editable={!busy}
                      style={[
                        styles.input,
                        field.multiline ? styles.inputMultiline : null,
                        {
                          color: c.text,
                          borderColor: c.cardBorder,
                          backgroundColor: c.card,
                        },
                      ]}
                    />
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Save ${field.label}`}
                      disabled={busy || !draft.trim()}
                      onPress={() => void commitField(field.key)}
                      hitSlop={8}
                      style={styles.saveHit}
                    >
                      <Text
                        style={[
                          styles.saveLabel,
                          { color: busy || !draft.trim() ? c.textMuted : c.primary },
                        ]}
                      >
                        {busy ? "…" : "Save"}
                      </Text>
                    </Pressable>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Cancel"
                    onPress={cancelEdit}
                    hitSlop={8}
                    style={styles.cancelHit}
                  >
                    <Text style={[styles.cancelLabel, { color: c.textMuted }]}>Cancel</Text>
                  </Pressable>
                </View>
              );
            }

            if (!saved) {
              return (
                <Pressable
                  key={field.key}
                  accessibilityRole="button"
                  accessibilityLabel={`Add ${field.label}`}
                  onPress={() => beginEdit(field.key)}
                  style={[styles.savedRow, borderStyle]}
                >
                  <View style={styles.savedTextCol}>
                    <Text style={[styles.fieldLabel, { color: c.textSecondary }]}>{field.label}</Text>
                    <Text style={[styles.addHint, { color: c.textMuted }]}>{field.placeholder}</Text>
                  </View>
                  <Text style={[styles.addAction, { color: c.primary }]}>Add</Text>
                </Pressable>
              );
            }

            return (
              <Pressable
                key={field.key}
                accessibilityRole="button"
                accessibilityLabel={`${field.label}: ${profile[field.key]}. Tap to edit`}
                onPress={() => beginEdit(field.key)}
                style={[styles.savedRow, borderStyle]}
              >
                <View style={styles.savedTextCol}>
                  <Text style={[styles.fieldLabel, { color: c.textSecondary }]}>{field.label}</Text>
                  <Text style={[styles.savedValue, { color: c.text }]}>{profile[field.key]}</Text>
                </View>
                <FlareLucideIcon
                  icon={FLARE_CHROME_LUCIDE.checkCircle}
                  size={22}
                  color={c.primary}
                />
              </Pressable>
            );
          })}
        </View>
      </LogHistoryCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: {
    paddingHorizontal: SCREEN_EDGE_PADDING,
    paddingTop: 8,
    gap: 14,
  },
  shellCard: {
    padding: CARD_INNER_PADDING,
    gap: CARD_SECTION_INNER_GAP,
    marginBottom: 0,
  },
  lead: {
    fontSize: FLARE_FONT_SIZE.navTitle,
    lineHeight: FLARE_LINE_HEIGHT.navTitle,
    fontFamily: FLARE_FONT_FAMILY.bold,
  },
  support: {
    fontSize: FLARE_FONT_SIZE.muted,
    lineHeight: FLARE_LINE_HEIGHT.muted,
    fontFamily: FLARE_FONT_FAMILY.regular,
    marginBottom: STACKED_LINE_GAP,
  },
  tray: {
    borderRadius: INSTRUCTION_CARD_RADIUS - 2,
    overflow: "hidden",
  },
  fieldBlock: {
    paddingHorizontal: TRAY_ROW_PADDING_H,
    paddingVertical: TRAY_ROW_PADDING_Y,
    gap: 8,
  },
  fieldLabel: {
    fontSize: FLARE_FONT_SIZE.caption,
    lineHeight: FLARE_LINE_HEIGHT.caption,
    fontFamily: FLARE_FONT_FAMILY.medium,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  input: {
    flex: 1,
    minWidth: 0,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: FLARE_FONT_SIZE.body,
    fontFamily: FLARE_FONT_FAMILY.regular,
  },
  inputMultiline: {
    minHeight: 72,
    textAlignVertical: "top",
  },
  saveHit: {
    paddingTop: 10,
    flexShrink: 0,
  },
  saveLabel: {
    ...FLARE_INLINE_ACTION_LINK,
  },
  cancelHit: {
    alignSelf: "flex-start",
    paddingVertical: 2,
  },
  cancelLabel: {
    fontSize: FLARE_FONT_SIZE.caption,
    fontFamily: FLARE_FONT_FAMILY.medium,
  },
  savedRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingHorizontal: TRAY_ROW_PADDING_H,
    paddingVertical: TRAY_ROW_PADDING_Y,
  },
  savedTextCol: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  savedValue: {
    fontSize: FLARE_FONT_SIZE.body,
    lineHeight: FLARE_LINE_HEIGHT.body,
    fontFamily: FLARE_FONT_FAMILY.medium,
  },
  addHint: {
    fontSize: FLARE_FONT_SIZE.body,
    lineHeight: FLARE_LINE_HEIGHT.body,
    fontFamily: FLARE_FONT_FAMILY.regular,
  },
  addAction: {
    ...FLARE_INLINE_ACTION_LINK,
    marginTop: 14,
  },
});
