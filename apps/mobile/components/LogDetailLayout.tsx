import React from "react";
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { flareCardSectionStyles, FlareScreenSectionTitle } from "./FlareScreenSectionTitle";
import { WizardReviewEditButton } from "./WizardReviewEditButton";
import { StackedDetailField, STACKED_DETAIL_ROW_HORIZONTAL_PADDING } from "./StackedDetailField";
import {
  FLARE_FONT_FAMILY,
  FLARE_FONT_SIZE,
  FLARE_LINE_HEIGHT,
  SCREEN_EDGE_PADDING,
} from "../lib/layoutConstants";
import { useFlareColors } from "../theme";

/** Horizontal inset when fields sit flush inside a headed tray. */
export const REVIEW_TRAY_HORIZONTAL_PADDING = 12;

export const logDetailStyles = StyleSheet.create({
  loggedAt: {
    fontSize: FLARE_FONT_SIZE.caption,
    fontFamily: FLARE_FONT_FAMILY.regular,
    marginBottom: 16,
    textAlign: "center",
    lineHeight: FLARE_LINE_HEIGHT.caption,
  },
  detailCard: { borderRadius: 14, padding: 14, marginBottom: 12 },
  notesTitle: {
    fontSize: FLARE_FONT_SIZE.navTitle,
    fontFamily: FLARE_FONT_FAMILY.bold,
    marginBottom: 10,
  },
  notesBody: {
    fontSize: FLARE_FONT_SIZE.body,
    fontFamily: FLARE_FONT_FAMILY.regular,
    lineHeight: 20,
  },
  fieldGroups: { gap: 10 },
  fieldGroup: { borderRadius: 14, overflow: "hidden" },
  /** Fields inside a headed review tray — no second background. */
  fieldGroupFlush: { overflow: "hidden" },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: FLARE_LINE_HEIGHT.caption,
  },
  /** Title + Edit on the tray surface (same padding as field rows). */
  reviewSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: REVIEW_TRAY_HORIZONTAL_PADDING,
    paddingVertical: 12,
  },
  reviewShell: {},
  reviewSection: {},
  /** Section stack inside `WizardReviewShell` (wizard review + matching log detail). */
  reviewSections: { gap: 12 },
  scroll: { flex: 1, paddingHorizontal: SCREEN_EDGE_PADDING },
});

export function LogDetailCard({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const c = useFlareColors();
  return <View style={[logDetailStyles.detailCard, { backgroundColor: c.card }, style]}>{children}</View>;
}

/** One white card wrapping review sections (inset trays + in-card Submit). */
export function WizardReviewShell({ children }: { children: React.ReactNode }) {
  return <LogDetailCard style={logDetailStyles.reviewShell}>{children}</LogDetailCard>;
}

/** Muted in-card section title + body — log detail screens. */
export function LogDetailSectionCard({
  title,
  children,
  last,
  onEdit,
  editAccessibilityLabel,
  /** Inside `WizardReviewShell` — no extra card chrome. */
  embedded,
}: {
  title: string;
  children: React.ReactNode;
  last?: boolean;
  onEdit?: () => void;
  editAccessibilityLabel?: string;
  embedded?: boolean;
}) {
  const c = useFlareColors();

  if (embedded) {
    return (
      <View style={[logDetailStyles.fieldGroup, { backgroundColor: c.surfaceSubtle }]}>
        <View
          style={[
            logDetailStyles.reviewSectionHeader,
            { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.cardBorder },
          ]}
        >
          <View style={{ flex: 1, minWidth: 0 }}>
            <FlareScreenSectionTitle inCard style={{ color: c.primary }}>
              {title}
            </FlareScreenSectionTitle>
          </View>
          {onEdit ? (
            <WizardReviewEditButton
              onPress={onEdit}
              accessibilityLabel={editAccessibilityLabel ?? `Edit ${title}`}
            />
          ) : null}
        </View>
        {children}
      </View>
    );
  }

  const titleRow = onEdit ? (
    <View style={logDetailStyles.sectionTitleRow}>
      <View style={{ flex: 1 }}>
        <FlareScreenSectionTitle inCard>{title}</FlareScreenSectionTitle>
      </View>
      <WizardReviewEditButton onPress={onEdit} accessibilityLabel={editAccessibilityLabel ?? `Edit ${title}`} />
    </View>
  ) : (
    <FlareScreenSectionTitle inCard>{title}</FlareScreenSectionTitle>
  );

  return (
    <View
      style={[
        logDetailStyles.detailCard,
        { backgroundColor: c.card },
        flareCardSectionStyles.container,
        last ? { marginBottom: 0 } : null,
      ]}
    >
      {titleRow}
      {children}
    </View>
  );
}

export function LogDetailAddedHeader({ text }: { text: string }) {
  const c = useFlareColors();
  return <Text style={[logDetailStyles.loggedAt, { color: c.textMuted }]}>{text}</Text>;
}

export function LogDetailNotesTray({ notes, flush }: { notes: string; flush?: boolean }) {
  const c = useFlareColors();
  return (
    <View
      style={[
        flush ? logDetailStyles.fieldGroupFlush : logDetailStyles.fieldGroup,
        !flush ? { backgroundColor: c.surfaceSubtle } : null,
      ]}
    >
      <StackedDetailField
        label=""
        hideLabel
        value={notes}
        style={{
          paddingHorizontal: flush ? REVIEW_TRAY_HORIZONTAL_PADDING : STACKED_DETAIL_ROW_HORIZONTAL_PADDING,
        }}
      />
    </View>
  );
}

export function LogDetailNotesCard({ notes }: { notes: string }) {
  return (
    <LogDetailSectionCard title="Notes" last>
      <LogDetailNotesTray notes={notes} />
    </LogDetailSectionCard>
  );
}

export function LogDetailFields({ fields }: { fields: { label: string; value: string }[] }) {
  return <LogDetailFieldGroup fields={fields} />;
}

/** One `surfaceSubtle` tray per entry — fields inside share dividers (medication lists). */
export function LogDetailFieldGroup({
  fields,
  compact,
  /** Flat on parent card — no nested rounded tray (wizard review summary). */
  flush,
  /** Extra hairline after the last field (between med entries in a flush tray). */
  trailingDivider,
  /** No hairlines between fields (TM named entry: dose / date / time as one block). */
  hideFieldDividers,
}: {
  fields: { label: string; value: string; selectable?: boolean }[];
  /** Match dashboard Today / Account compact lists (13). */
  compact?: boolean;
  flush?: boolean;
  trailingDivider?: boolean;
  hideFieldDividers?: boolean;
}) {
  const c = useFlareColors();
  const visible = fields.filter((f) => f.value !== "");
  if (!visible.length) return null;
  return (
    <View
      style={[
        flush ? logDetailStyles.fieldGroupFlush : logDetailStyles.fieldGroup,
        !flush ? { backgroundColor: c.surfaceSubtle } : null,
      ]}
    >
      {visible.map((field, index) => (
        <StackedDetailField
          key={`${index}-${field.label}`}
          label={field.label}
          value={field.value}
          selectable={field.selectable}
          compact={compact}
          showDivider={
            !hideFieldDividers &&
            !flush &&
            (index < visible.length - 1 || (Boolean(trailingDivider) && index === visible.length - 1))
          }
          style={{
            paddingHorizontal: flush ? REVIEW_TRAY_HORIZONTAL_PADDING : STACKED_DETAIL_ROW_HORIZONTAL_PADDING,
          }}
        />
      ))}
    </View>
  );
}

export function LogDetailFieldGroups({
  groups,
  flush,
}: {
  groups: { label: string; value: string }[][];
  flush?: boolean;
}) {
  return (
    <View style={flush ? undefined : logDetailStyles.fieldGroups}>
      {groups.map((fields, index) => (
        <LogDetailFieldGroup
          key={index}
          fields={fields}
          flush={flush}
          trailingDivider={Boolean(flush && index < groups.length - 1)}
        />
      ))}
    </View>
  );
}
