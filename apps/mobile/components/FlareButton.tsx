import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { FLARE_FONT_FAMILY, FLARE_FONT_SIZE } from "../lib/layoutConstants";
import { useFlareColors } from "../theme";

/** Shared by primary/secondary buttons and appearance toggles on Settings. */
export const FLARE_BUTTON_BORDER_RADIUS = 10;
export const FLARE_BUTTON_MIN_HEIGHT = 46;
export const FLARE_BUTTON_PADDING_H = 12;
/** Label size for all primary/secondary CTAs — 16 (`navTitle`), not body 14. */
export const FLARE_BUTTON_FONT_SIZE = FLARE_FONT_SIZE.navTitle;

/**
 * Entry / orientation CTAs (welcome, auth, wizard landings).
 * Same type scale and height as `PrimaryButton` — full-bleed width for stacked entry layouts.
 */
export const FLARE_ENTRY_BUTTON_BORDER_RADIUS = FLARE_BUTTON_BORDER_RADIUS;
export const FLARE_ENTRY_BUTTON_MIN_HEIGHT = FLARE_BUTTON_MIN_HEIGHT;
export const FLARE_ENTRY_BUTTON_PADDING_H = FLARE_BUTTON_PADDING_H;
export const FLARE_ENTRY_BUTTON_FONT_SIZE = FLARE_BUTTON_FONT_SIZE;

export const flareButtonStyles = StyleSheet.create({
  button: {
    borderRadius: FLARE_BUTTON_BORDER_RADIUS,
    minHeight: FLARE_BUTTON_MIN_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: FLARE_BUTTON_PADDING_H,
    marginTop: 6,
  },
  buttonText: { fontFamily: FLARE_FONT_FAMILY.bold, fontSize: FLARE_BUTTON_FONT_SIZE },
  entryButton: {
    borderRadius: FLARE_ENTRY_BUTTON_BORDER_RADIUS,
    minHeight: FLARE_ENTRY_BUTTON_MIN_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: FLARE_ENTRY_BUTTON_PADDING_H,
    marginTop: 6,
    alignSelf: "stretch",
    width: "100%",
  },
  entryButtonText: {
    fontFamily: FLARE_FONT_FAMILY.bold,
    fontSize: FLARE_ENTRY_BUTTON_FONT_SIZE,
  },
  buttonSecondary: {
    borderRadius: FLARE_BUTTON_BORDER_RADIUS,
    minHeight: FLARE_BUTTON_MIN_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: FLARE_BUTTON_PADDING_H,
    marginTop: 6,
  },
  buttonSecondaryContent: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  buttonSecondaryText: { fontFamily: FLARE_FONT_FAMILY.bold, fontSize: FLARE_BUTTON_FONT_SIZE },
});

/** Optional denser label (14) — height stays `FLARE_BUTTON_MIN_HEIGHT`. */

export function PrimaryButton({
  title,
  onPress,
  disabled,
  loading,
  fitContent,
  variant,
  leftIcon,
  noTopMargin,
  compact,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  /** Width follows label + padding instead of stretching full row. */
  fitContent?: boolean;
  variant?: "default" | "onPrimary" | "destructive" | "danger";
  leftIcon?: React.ReactNode;
  /** Use when parent layout already sets spacing above the button (e.g. confirm modals). */
  noTopMargin?: boolean;
  /** Keep label at 14 while using shared button height (e.g. auth landing). */
  compact?: boolean;
}) {
  const c = useFlareColors();
  const onPrimary = variant === "onPrimary";
  const destructive = variant === "destructive";
  const danger = variant === "danger";
  const inactive = disabled || loading;
  const spinnerColor = onPrimary ? (inactive ? c.primaryHover : c.primary) : inactive ? c.primaryHover : c.white;
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      style={[
        flareButtonStyles.button,
        noTopMargin ? { marginTop: 0 } : null,
        fitContent ? { alignSelf: "flex-start" } : null,
        onPrimary
          ? { backgroundColor: inactive ? "rgba(255,255,255,0.78)" : c.white }
          : danger
            ? { backgroundColor: c.destructiveFill, opacity: inactive ? 0.5 : 1 }
            : destructive
              ? { backgroundColor: c.primary, opacity: inactive ? 0.5 : 1 }
              : { backgroundColor: inactive ? c.primaryDisabledBg : c.primary },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={spinnerColor} />
      ) : (
        <View style={flareButtonStyles.buttonSecondaryContent}>
          {leftIcon ? leftIcon : null}
          <Text
            style={[
              flareButtonStyles.buttonText,
              compact ? { fontSize: FLARE_FONT_SIZE.body } : null,
              onPrimary
                ? { color: inactive ? c.primaryHover : c.primary }
                : { color: inactive ? c.primaryHover : c.white },
            ]}
          >
            {title}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

/**
 * Primary CTA for entry / orientation screens (welcome intro, auth, wizard landings).
 * Same label size/height as `PrimaryButton`; stretches full width for stacked entry layouts.
 */
export function EntryPrimaryButton({
  title,
  onPress,
  disabled,
  loading,
  variant,
  leftIcon,
  noTopMargin,
  /** Optional denser label (14) — default is the shared 16px CTA size. */
  compactLabel,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: "default" | "onPrimary";
  leftIcon?: React.ReactNode;
  noTopMargin?: boolean;
  compactLabel?: boolean;
}) {
  const c = useFlareColors();
  const onPrimary = variant === "onPrimary";
  const inactive = disabled || loading;
  const spinnerColor = onPrimary ? (inactive ? c.primaryHover : c.primary) : inactive ? c.primaryHover : c.white;
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      style={[
        flareButtonStyles.entryButton,
        noTopMargin ? { marginTop: 0 } : null,
        onPrimary
          ? { backgroundColor: inactive ? "rgba(255,255,255,0.78)" : c.white }
          : { backgroundColor: inactive ? c.primaryDisabledBg : c.primary },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={spinnerColor} />
      ) : (
        <View style={flareButtonStyles.buttonSecondaryContent}>
          {leftIcon ? leftIcon : null}
          <Text
            style={[
              flareButtonStyles.entryButtonText,
              compactLabel ? { fontSize: FLARE_FONT_SIZE.body } : null,
              onPrimary
                ? { color: inactive ? c.primaryHover : c.primary }
                : { color: inactive ? c.primaryHover : c.white },
            ]}
          >
            {title}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

/** Secondary CTA matching `EntryPrimaryButton` scale (auth method / email / OTP stacks). */
export function EntrySecondaryButton({
  title,
  onPress,
  disabled,
  leftIcon,
  variant,
  noTopMargin,
  compactLabel,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  leftIcon?: React.ReactNode;
  variant?: "default" | "onPrimary";
  noTopMargin?: boolean;
  compactLabel?: boolean;
}) {
  const c = useFlareColors();
  const onPrimary = variant === "onPrimary";
  const labelColor = onPrimary
    ? disabled
      ? "rgba(255,255,255,0.72)"
      : c.white
    : c.secondaryBtnText;
  const outline = onPrimary
    ? { borderWidth: 1, borderColor: "rgba(255,255,255,0.55)" }
    : { borderWidth: 1, borderColor: c.secondaryBtnBorder };
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[
        flareButtonStyles.entryButton,
        noTopMargin ? { marginTop: 0 } : null,
        onPrimary
          ? {
              backgroundColor: disabled ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.12)",
              ...outline,
            }
          : {
              backgroundColor: c.secondaryBtnBg,
              ...outline,
            },
        !onPrimary && disabled ? { opacity: 0.55 } : null,
      ]}
    >
      <View style={flareButtonStyles.buttonSecondaryContent}>
        {leftIcon ? leftIcon : null}
        <Text
          style={[
            flareButtonStyles.entryButtonText,
            compactLabel ? { fontSize: FLARE_FONT_SIZE.body } : null,
            { color: labelColor },
          ]}
        >
          {title}
        </Text>
      </View>
    </Pressable>
  );
}

export function SecondaryButton({
  title,
  onPress,
  disabled,
  leftIcon,
  variant,
  titleColor,
  softOutline,
  borderless,
  borderlessFill = "card",
  noTopMargin,
  compact,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  leftIcon?: React.ReactNode;
  variant?: "default" | "onPrimary";
  titleColor?: "default" | "primary" | "destructive";
  /** Lighter edge (e.g. dashboard Recent logs) — still bordered, not as heavy as default. */
  softOutline?: boolean;
  /** No border — e.g. Mark as taken vs filled Taken state. */
  borderless?: boolean;
  /** `borderless` fill — `card` on screen bg; `surfaceSubtle` inside a white card. */
  borderlessFill?: "card" | "surfaceSubtle";
  /** Use when parent layout already sets spacing above the button (e.g. confirm modals). */
  noTopMargin?: boolean;
  /** Keep label at 14 while using shared button height (e.g. auth landing). */
  compact?: boolean;
}) {
  const c = useFlareColors();
  const onPrimary = variant === "onPrimary";
  const labelColor = onPrimary
    ? disabled
      ? "rgba(255,255,255,0.72)"
      : c.white
    : titleColor === "primary"
      ? c.primary
      : titleColor === "destructive"
        ? c.destructiveFill
        : c.secondaryBtnText;
  const outline = borderless
    ? null
    : onPrimary
      ? softOutline
        ? { borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(255,255,255,0.28)" }
        : { borderWidth: 1, borderColor: "rgba(255,255,255,0.55)" }
      : softOutline
        ? { borderWidth: StyleSheet.hairlineWidth, borderColor: c.cardBorder }
        : { borderWidth: 1, borderColor: c.secondaryBtnBorder };
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[
        flareButtonStyles.buttonSecondary,
        noTopMargin ? { marginTop: 0 } : null,
        onPrimary
          ? {
              backgroundColor: disabled ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.12)",
              ...(outline ?? null),
            }
          : {
              backgroundColor: borderless
                ? borderlessFill === "surfaceSubtle"
                  ? c.surfaceSubtle
                  : c.card
                : c.secondaryBtnBg,
              ...(outline ?? null),
            },
        !onPrimary && disabled ? { opacity: 0.55 } : null,
      ]}
    >
      <View style={flareButtonStyles.buttonSecondaryContent}>
        {leftIcon ? leftIcon : null}
        <Text
          style={[
            flareButtonStyles.buttonSecondaryText,
            compact ? { fontSize: FLARE_FONT_SIZE.body } : null,
            { color: labelColor },
          ]}
        >
          {title}
        </Text>
      </View>
    </Pressable>
  );
}
