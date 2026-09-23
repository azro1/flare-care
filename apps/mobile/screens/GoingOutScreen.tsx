/**
 * Going Out — short suggestions + custom items; then tick checklist when leaving.
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
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
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SecondaryButton } from "../components/FlareButton";
import { ConfirmModal } from "../components/ConfirmModal";
import { LogHistoryCard } from "../components/LogHistoryList";
import { FLARE_CHROME_LUCIDE, FlareLucideIcon } from "../lib/flareLucideIcons";
import {
  CARD_INNER_PADDING,
  CARD_SECTION_INNER_GAP,
  FLARE_FONT_FAMILY,
  FLARE_FONT_SIZE,
  FLARE_INLINE_ACTION_LINK,
  FLARE_LINE_HEIGHT,
  HEADER_CHROME_ICON_SIZE,
  INSTRUCTION_CARD_RADIUS,
  SCREEN_EDGE_PADDING,
  STACKED_LINE_GAP,
  TRAY_ROW_PADDING_H,
  TRAY_ROW_PADDING_Y,
  bottomTabBarScrollInset,
} from "../lib/layoutConstants";
import {
  clampGoingOutCustomLabel,
  defaultGoingOutProfile,
  emptyGoingOutProfile,
  GOING_OUT_CUSTOM_LABEL_MAX,
  GOING_OUT_SUGGESTIONS,
  goingOutProfileIsSet,
  labelForGoingOutItem,
  loadGoingOutProfile,
  newGoingOutCustomId,
  saveGoingOutProfile,
  type GoingOutProfile,
} from "../lib/goingOutShared";
import { useFlareColors } from "../theme";

type Props = {
  userId: string;
};

export function GoingOutScreen({ userId }: Props) {
  const navigation = useNavigation();
  const c = useFlareColors();
  const insets = useSafeAreaInsets();
  const bottomScrollInset = bottomTabBarScrollInset(insets.bottom);
  const [loading, setLoading] = useState(true);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profile, setProfile] = useState<GoingOutProfile | null>(null);
  const [draft, setDraft] = useState<GoingOutProfile | null>(null);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(() => new Set());
  const [addingCustom, setAddingCustom] = useState(false);
  const [newCustomLabel, setNewCustomLabel] = useState("");
  const [editingCustomId, setEditingCustomId] = useState<string | null>(null);
  const [editCustomLabel, setEditCustomLabel] = useState("");
  const [deleteCustomId, setDeleteCustomId] = useState<string | null>(null);
  const addInputRef = useRef<TextInput>(null);
  const editScrollRef = useRef<ScrollView>(null);
  const skipEditBlurCommit = useRef(false);
  /** Blur + Save can fire twice — only add once. */
  const addCommitLock = useRef(false);
  const lastSavedKey = useRef("");
  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const persistFailAlerted = useRef(false);
  const draftRef = useRef<GoingOutProfile | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const profileKey = (p: GoingOutProfile) =>
    JSON.stringify({ selectedIds: p.selectedIds, customItems: p.customItems });

  const persistDraft = useCallback(
    async (next: GoingOutProfile) => {
      if (next.selectedIds.length === 0) return;
      const key = profileKey(next);
      if (key === lastSavedKey.current) return;
      try {
        await saveGoingOutProfile(userId, next);
        lastSavedKey.current = key;
        setProfile(next);
        persistFailAlerted.current = false;
      } catch {
        if (!persistFailAlerted.current) {
          persistFailAlerted.current = true;
          Alert.alert("Couldn't save checklist", "Check your connection and try again.");
        }
      }
    },
    [userId],
  );

  const leaveProfileEditor = useCallback(() => {
    if (persistTimer.current) {
      clearTimeout(persistTimer.current);
      persistTimer.current = null;
    }
    const pending = draftRef.current;
    if (pending && pending.selectedIds.length > 0) {
      void persistDraft(pending);
    }
    setEditingProfile(false);
    setAddingCustom(false);
    setNewCustomLabel("");
    setEditingCustomId(null);
    setEditCustomLabel("");
    setDeleteCustomId(null);
    addCommitLock.current = false;
  }, [persistDraft]);

  const refresh = useCallback(async () => {
    try {
      const next = await loadGoingOutProfile(userId);
      setProfile(next);
      const unset = !goingOutProfileIsSet(next);
      const draftNext = unset ? defaultGoingOutProfile() : next;
      setDraft(draftNext);
      draftRef.current = draftNext;
      lastSavedKey.current = unset ? "" : profileKey(next);
      setEditingProfile(unset);
    } catch {
      const fallback = defaultGoingOutProfile();
      setProfile(emptyGoingOutProfile());
      setDraft(fallback);
      draftRef.current = fallback;
      lastSavedKey.current = "";
      setEditingProfile(true);
      Alert.alert("Couldn't load checklist", "Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  useEffect(() => {
    if (!editingProfile) {
      setKeyboardHeight(0);
      return;
    }
    const showEvt = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvt = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSub = Keyboard.addListener(showEvt, (e) => {
      setKeyboardHeight(e.endCoordinates.height);
      requestAnimationFrame(() => {
        editScrollRef.current?.scrollToEnd({ animated: true });
      });
    });
    const hideSub = Keyboard.addListener(hideEvt, () => setKeyboardHeight(0));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [editingProfile]);

  useEffect(() => {
    if (!addingCustom && editingCustomId == null) return;
    const t = setTimeout(() => {
      editScrollRef.current?.scrollToEnd({ animated: true });
    }, 80);
    return () => clearTimeout(t);
  }, [addingCustom, editingCustomId, draft?.customItems.length]);

  useEffect(() => {
    if (addingCustom) {
      const t = setTimeout(() => addInputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [addingCustom]);

  /** Prep profile is an in-screen mode — back should return to Going Out checklist, not Out & About. */
  useEffect(() => {
    if (!editingProfile || !profile || !goingOutProfileIsSet(profile)) return;
    const unsub = navigation.addListener("beforeRemove", (e) => {
      e.preventDefault();
      leaveProfileEditor();
    });
    return unsub;
  }, [editingProfile, leaveProfileEditor, navigation, profile]);

  /** Auto-save toggles / add / rename / delete — no separate Save checklist button. */
  useEffect(() => {
    if (!editingProfile || !draft || draft.selectedIds.length === 0) return;
    if (profileKey(draft) === lastSavedKey.current) return;
    if (persistTimer.current) clearTimeout(persistTimer.current);
    persistTimer.current = setTimeout(() => {
      void persistDraft(draft);
    }, 450);
    return () => {
      if (persistTimer.current) clearTimeout(persistTimer.current);
    };
  }, [draft, editingProfile, persistDraft]);

  const toggleDraftId = (id: string) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const has = prev.selectedIds.includes(id);
      return {
        ...prev,
        selectedIds: has ? prev.selectedIds.filter((x) => x !== id) : [...prev.selectedIds, id],
      };
    });
  };

  const commitNewCustom = () => {
    if (addCommitLock.current) return;
    const label = clampGoingOutCustomLabel(newCustomLabel);
    if (!label) {
      setAddingCustom(false);
      setNewCustomLabel("");
      return;
    }
    addCommitLock.current = true;
    const id = newGoingOutCustomId();
    setDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        customItems: [...prev.customItems, { id, label }],
        selectedIds: prev.selectedIds.includes(id) ? prev.selectedIds : [...prev.selectedIds, id],
      };
    });
    setNewCustomLabel("");
    setAddingCustom(false);
  };

  const commitEditCustom = () => {
    if (!editingCustomId) return;
    const label = clampGoingOutCustomLabel(editCustomLabel);
    if (!label) {
      setEditingCustomId(null);
      setEditCustomLabel("");
      return;
    }
    setDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        customItems: prev.customItems.map((item) =>
          item.id === editingCustomId ? { ...item, label } : item,
        ),
      };
    });
    setEditingCustomId(null);
    setEditCustomLabel("");
  };

  const removeCustom = (id: string) => {
    setDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        customItems: prev.customItems.filter((item) => item.id !== id),
        selectedIds: prev.selectedIds.filter((x) => x !== id),
      };
    });
    setDeleteCustomId(null);
    if (editingCustomId === id) {
      setEditingCustomId(null);
      setEditCustomLabel("");
    }
  };

  const toggleChecked = (id: string) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (loading || !profile || !draft) {
    return (
      <View style={[styles.centered, { backgroundColor: c.screen }]}>
        <ActivityIndicator color={c.primary} />
      </View>
    );
  }

  if (editingProfile) {
    const customCount = draft.customItems.length;
    const padBottom =
      keyboardHeight > 0
        ? keyboardHeight + STACKED_LINE_GAP * 2
        : bottomScrollInset + 24;
    return (
      <>
        <ScrollView
          ref={editScrollRef}
          style={[styles.screen, { backgroundColor: c.screen }]}
          contentContainerStyle={[styles.content, { paddingBottom: padBottom }]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          <LogHistoryCard style={styles.shellCard}>
            <Text style={[styles.lead, { color: c.text }]}>Edit checklist</Text>
            <Text style={[styles.support, { color: c.textMuted }]}>
              Choose the items you want on your Going Out checklist. Add your own items or remove
              anything you don't need. Changes save as you go.
            </Text>

            <View style={[styles.checklistTray, { backgroundColor: c.surfaceSubtle }]}>
              {GOING_OUT_SUGGESTIONS.map((item, index) => {
                const on = draft.selectedIds.includes(item.id);
                const showBorder =
                  index < GOING_OUT_SUGGESTIONS.length - 1 || customCount > 0 || addingCustom;
                return (
                  <Pressable
                    key={item.id}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: on }}
                    accessibilityLabel={item.label}
                    onPress={() => toggleDraftId(item.id)}
                    style={[
                      styles.itemRow,
                      showBorder
                        ? { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.cardBorder }
                        : null,
                    ]}
                  >
                    <View style={styles.itemIcon}>
                      <FlareLucideIcon
                        icon={on ? FLARE_CHROME_LUCIDE.checkCircle : FLARE_CHROME_LUCIDE.circle}
                        size={22}
                        color={on ? c.primary : c.textMuted}
                      />
                    </View>
                    <Text style={[styles.itemLabel, { color: c.text }]}>{item.label}</Text>
                  </Pressable>
                );
              })}

              {draft.customItems.map((item, index) => {
                const on = draft.selectedIds.includes(item.id);
                const isLast = index === customCount - 1 && !addingCustom;
                const editing = editingCustomId === item.id;
                const rowBorder = !isLast
                  ? { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.cardBorder }
                  : null;
                if (editing) {
                  return (
                    <View key={item.id} style={[styles.addRow, rowBorder]}>
                      <TextInput
                        value={editCustomLabel}
                        onChangeText={setEditCustomLabel}
                        onBlur={() => {
                          if (skipEditBlurCommit.current) {
                            skipEditBlurCommit.current = false;
                            return;
                          }
                          commitEditCustom();
                        }}
                        onSubmitEditing={commitEditCustom}
                        autoFocus
                        maxLength={GOING_OUT_CUSTOM_LABEL_MAX}
                        placeholder="Item name"
                        placeholderTextColor={c.textMuted}
                        style={[
                          styles.inlineInput,
                          { color: c.text, borderColor: c.cardBorder, backgroundColor: c.card },
                        ]}
                      />
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Save item"
                        onPress={commitEditCustom}
                        hitSlop={8}
                      >
                        <Text style={[styles.addAction, { color: c.primary }]}>Save</Text>
                      </Pressable>
                    </View>
                  );
                }
                return (
                  <View key={item.id} style={[styles.itemRow, rowBorder]}>
                    <Pressable
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: on }}
                      accessibilityLabel={item.label}
                      onPress={() => toggleDraftId(item.id)}
                      style={styles.customCheckHit}
                    >
                      <View style={styles.itemIcon}>
                        <FlareLucideIcon
                          icon={on ? FLARE_CHROME_LUCIDE.checkCircle : FLARE_CHROME_LUCIDE.circle}
                          size={22}
                          color={on ? c.primary : c.textMuted}
                        />
                      </View>
                      <Text style={[styles.itemLabel, { color: c.text }]}>{item.label}</Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Edit ${item.label}`}
                      hitSlop={8}
                      style={styles.rowAction}
                      onPress={() => {
                        setAddingCustom(false);
                        setEditingCustomId(item.id);
                        setEditCustomLabel(item.label);
                      }}
                    >
                      <FlareLucideIcon
                        icon={FLARE_CHROME_LUCIDE.rowEdit}
                        size={HEADER_CHROME_ICON_SIZE}
                        color={c.textMuted}
                      />
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Delete ${item.label}`}
                      hitSlop={8}
                      style={styles.rowAction}
                      onPress={() => setDeleteCustomId(item.id)}
                    >
                      <FlareLucideIcon
                        icon={FLARE_CHROME_LUCIDE.rowDelete}
                        size={HEADER_CHROME_ICON_SIZE}
                        color={c.textMuted}
                      />
                    </Pressable>
                  </View>
                );
              })}

              {addingCustom ? (
                <View style={styles.addRow}>
                  <TextInput
                    ref={addInputRef}
                    value={newCustomLabel}
                    onChangeText={setNewCustomLabel}
                    onBlur={commitNewCustom}
                    onSubmitEditing={commitNewCustom}
                    maxLength={GOING_OUT_CUSTOM_LABEL_MAX}
                    placeholder="Your item"
                    placeholderTextColor={c.textMuted}
                    style={[
                      styles.inlineInput,
                      { color: c.text, borderColor: c.cardBorder, backgroundColor: c.card },
                    ]}
                  />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Save item"
                    onPress={commitNewCustom}
                    hitSlop={8}
                  >
                    <Text style={[styles.addAction, { color: c.primary }]}>Save</Text>
                  </Pressable>
                </View>
              ) : null}
            </View>

            {!addingCustom ? (
              <View style={styles.addBar}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Add your own item"
                  onPress={() => {
                    addCommitLock.current = false;
                    setEditingCustomId(null);
                    setAddingCustom(true);
                    setNewCustomLabel("");
                  }}
                  style={styles.addLinkHit}
                >
                  <FlareLucideIcon icon={FLARE_CHROME_LUCIDE.add} size={16} color={c.primary} />
                  <Text style={[styles.addLink, { color: c.primary }]}>Add item</Text>
                </Pressable>
              </View>
            ) : null}
          </LogHistoryCard>
        </ScrollView>

        <ConfirmModal
          visible={deleteCustomId != null}
          title="Remove item?"
          message="It will leave your checklist."
          confirmLabel="Remove"
          confirmDestructive
          onCancel={() => setDeleteCustomId(null)}
          onConfirm={() => {
            if (deleteCustomId) removeCustom(deleteCustomId);
          }}
        />
      </>
    );
  }

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: c.screen }]}
      contentContainerStyle={[styles.content, { paddingBottom: bottomScrollInset + 24 }]}
      keyboardShouldPersistTaps="handled"
    >
      <LogHistoryCard style={styles.shellCard}>
        <Text style={[styles.lead, { color: c.text }]}>Checklist</Text>
        <Text style={[styles.support, { color: c.textMuted }]}>
          Tick off as you go. Change what appears here anytime in your checklist.
        </Text>

        <View style={[styles.checklistTray, { backgroundColor: c.surfaceSubtle }]}>
          {profile.selectedIds.map((id, index) => {
            const label = labelForGoingOutItem(profile, id);
            const on = checkedIds.has(id);
            return (
              <Pressable
                key={id}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
                accessibilityLabel={label}
                onPress={() => toggleChecked(id)}
                style={[
                  styles.itemRow,
                  index < profile.selectedIds.length - 1
                    ? { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.cardBorder }
                    : null,
                ]}
              >
                <View style={styles.itemIcon}>
                  <FlareLucideIcon
                    icon={on ? FLARE_CHROME_LUCIDE.checkCircle : FLARE_CHROME_LUCIDE.circle}
                    size={22}
                    color={on ? c.primary : c.textMuted}
                  />
                </View>
                <Text
                  style={[
                    styles.itemLabel,
                    { color: c.text },
                    on ? styles.itemLabelDone : null,
                  ]}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </LogHistoryCard>

      <SecondaryButton
        title="Edit checklist"
        onPress={() => {
          setDraft(profile);
          setEditingProfile(true);
        }}
      />
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
  checklistTray: {
    borderRadius: INSTRUCTION_CARD_RADIUS - 2,
    overflow: "hidden",
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
  itemRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingHorizontal: TRAY_ROW_PADDING_H,
    paddingVertical: TRAY_ROW_PADDING_Y,
    minWidth: 0,
  },
  itemIcon: {
    flexShrink: 0,
    marginTop: 1,
  },
  rowAction: {
    flexShrink: 0,
    marginTop: 2,
  },
  customCheckHit: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    minWidth: 0,
  },
  itemLabel: {
    flex: 1,
    minWidth: 0,
    flexShrink: 1,
    fontSize: FLARE_FONT_SIZE.body,
    lineHeight: FLARE_LINE_HEIGHT.body,
    fontFamily: FLARE_FONT_FAMILY.medium,
  },
  itemLabelDone: {
    textDecorationLine: "line-through",
    opacity: 0.7,
  },
  addBar: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  addLinkHit: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
  },
  addLink: {
    ...FLARE_INLINE_ACTION_LINK,
  },
  addRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: TRAY_ROW_PADDING_H,
    paddingVertical: 8,
  },
  inlineInput: {
    flex: 1,
    minWidth: 0,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: FLARE_FONT_SIZE.body,
    fontFamily: FLARE_FONT_FAMILY.regular,
  },
  addAction: {
    flexShrink: 0,
    fontSize: FLARE_FONT_SIZE.body,
    fontFamily: FLARE_FONT_FAMILY.medium,
  },
});
