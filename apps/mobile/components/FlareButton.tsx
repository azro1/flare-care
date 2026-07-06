import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useFlareColors } from "../theme";

/** Shared by primary/secondary buttons and appearance toggles on Settings. */
export const FLARE_BUTTON_BORDER_RADIUS = 10;
export const FLARE_BUTTON_MIN_HEIGHT = 42;
export const FLARE_BUTTON_PADDING_H = 12;

export const flareButtonStyles = StyleSheet.create({
  button: {
    borderRadius: FLARE_BUTTON_BORDER_RADIUS,
    minHeight: FLARE_BUTTON_MIN_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: FLARE_BUTTON_PADDING_H,
    marginTop: 6,
  },
  buttonText: { fontFamily: "Inter_700Bold", fontSize: 14 },
  buttonSecondary: {
    borderRadius: FLARE_BUTTON_BORDER_RADIUS,
    minHeight: FLARE_BUTTON_MIN_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: FLARE_BUTTON_PADDING_H,
    marginTop: 6,
  },
  buttonSecondaryContent: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  buttonSecondaryText: { fontFamily: "Inter_700Bold", fontSize: 14 },
});

export function PrimaryButton({
  title,
  onPress,
  disabled,
  loading,
  fitContent,
  variant,
  leftIcon,
  noTopMargin,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  /** Width follows label + padding instead of stretching full row. */
  fitContent?: boolean;
  variant?: "default" | "onPrimary" | "destructive";
  leftIcon?: React.ReactNode;
  /** Use when parent layout already sets spacing above the button (e.g. confirm modals). */
  noTopMargin?: boolean;
}) {
  const c = useFlareColors();
  const onPrimary = variant === "onPrimary";
  const destructive = variant === "destructive";
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
          : destructive
            ? { backgroundColor: c.destructiveFill, opacity: inactive ? 0.5 : 1 }
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
        <Text style={[flareButtonStyles.buttonSecondaryText, { color: labelColor }]}>{title}</Text>
      </View>
    </Pressable>
  );
}
