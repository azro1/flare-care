/**
 * Going Out — short suggestions + custom items; then tick checklist when leaving.
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PrimaryButton, SecondaryButton } from "../components/FlareButton";
import { ConfirmModal } from "../components/ConfirmModal";
import { LogHistoryCard } from "../components/LogHistoryList";
import { FLARE_CHROME_LUCIDE, FlareLucideIcon } from "../lib/flareLucideIcons";
import {
  CARD_INNER_PADDING,
  FLARE_FONT_FAMILY,
  FLARE_FONT_SIZE,
  FLARE_INLINE_ACTION_LINK,
  FLARE_LINE_HEIGHT,
  HEADER_CHROME_ICON_SIZE,
  SCREEN_EDGE_PADDING,
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
  const [saving, setSaving] = useState(false);
  const [addingCustom, setAddingCustom] = useState(false);
  const [newCustomLabel, setNewCustomLabel] = useState("");
  const [editingCustomId, setEditingCustomId] = useState<string | null>(null);
  const [editCustomLabel, setEditCustomLabel] = useState("");
  const [deleteCustomId, setDeleteCustomId] = useState<string | null>(null);
  const addInputRef = useRef<TextInput>(null);
  const skipEditBlurCommit = useRef(false);
  /** Blur + Save can fire twice — only add once. */
  const addCommitLock = useRef(false);

  const leaveProfileEditor = useCallback(() => {
    if (profile) setDraft(profile);
    setEditingProfile(false);
    setAddingCustom(false);
    setNewCustomLabel("");
    setEditingCustomId(null);
    setEditCustomLabel("");
    setDeleteCustomId(null);
    addCommitLock.current = false;
  }, [profile]);

  const refresh = useCallback(async () => {
    try {
      const next = await loadGoingOutProfile(userId);
      setProfile(next);
      const unset = !goingOutProfileIsSet(next);
      setDraft(unset ? defaultGoingOutProfile() : next);
      setEditingProfile(unset);
    } catch {
      setProfile(emptyGoingOutProfile());
      setDraft(defaultGoingOutProfile());
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

  const saveProfile = async () => {
    if (!draft || draft.selectedIds.length === 0 || saving) return;
    setSaving(true);
    try {
      const toSave: GoingOutProfile = {
        selectedIds: draft.selectedIds,
        customItems: draft.customItems,
      };
      await saveGoingOutProfile(userId, toSave);
      setProfile(toSave);
      setDraft(toSave);
      setEditingProfile(false);
      setCheckedIds(new Set());
      setAddingCustom(false);
      setNewCustomLabel("");
      setEditingCustomId(null);
    } catch {
      Alert.alert("Couldn't save checklist", "Check your connection and try again.");
    } finally {
      setSaving(false);
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
    const canSave = draft.selectedIds.length > 0;
    const customCount = draft.customItems.length;
    return (
      <>
        <ScrollView
          style={[styles.screen, { backgroundColor: c.screen }]}
          contentContainerStyle={[styles.content, { paddingBottom: bottomScrollInset + 24 }]}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={[styles.lead, { color: c.text }]}>Edit checklist</Text>
          <Text style={[styles.support, { color: c.textMuted }]}>
            Choose the items you want on your Going Out checklist. Add your own items or remove
            anything you don't need.
          </Text>

          <LogHistoryCard style={{ padding: CARD_INNER_PADDING + 2, gap: 0 }}>
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
                        { color: c.text, borderColor: c.cardBorder, backgroundColor: c.surfaceSubtle },
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
                    { color: c.text, borderColor: c.cardBorder, backgroundColor: c.surfaceSubtle },
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
          </LogHistoryCard>

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

          <PrimaryButton
            title={saving ? "Saving…" : "Save checklist"}
            onPress={() => void saveProfile()}
            disabled={!canSave || saving}
          />
          {goingOutProfileIsSet(profile) ? (
            <SecondaryButton title="Cancel" onPress={leaveProfileEditor} />
          ) : null}
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
      <Text style={[styles.lead, { color: c.text }]}>Checklist</Text>
      <Text style={[styles.support, { color: c.textMuted }]}>
        Tick off as you go. Change what appears here anytime in your checklist.
      </Text>

      <LogHistoryCard style={{ padding: CARD_INNER_PADDING + 2, gap: 0 }}>
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
  lead: {
    fontSize: FLARE_FONT_SIZE.subhead,
    lineHeight: FLARE_LINE_HEIGHT.subhead,
    fontFamily: FLARE_FONT_FAMILY.bold,
  },
  support: {
    fontSize: FLARE_FONT_SIZE.muted,
    lineHeight: FLARE_LINE_HEIGHT.muted,
    fontFamily: FLARE_FONT_FAMILY.regular,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 12,
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
    marginTop: -4,
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
