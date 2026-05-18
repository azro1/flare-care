import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
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
  fitContent,
  variant,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  /** Width follows label + padding instead of stretching full row. */
  fitContent?: boolean;
  variant?: "default" | "onPrimary" | "destructive";
}) {
  const c = useFlareColors();
  const onPrimary = variant === "onPrimary";
  const destructive = variant === "destructive";
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[
        flareButtonStyles.button,
        fitContent ? { alignSelf: "flex-start" } : null,
        onPrimary
          ? { backgroundColor: disabled ? "rgba(255,255,255,0.45)" : c.white }
          : destructive
            ? { backgroundColor: c.destructiveFill, opacity: disabled ? 0.5 : 1 }
            : { backgroundColor: disabled ? c.primaryDisabledBg : c.primary },
      ]}
    >
      <Text
        style={[
          flareButtonStyles.buttonText,
          onPrimary
            ? { color: c.primary, ...(disabled ? { opacity: 0.55 } : null) }
            : { color: c.white },
        ]}
      >
        {title}
      </Text>
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
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  leftIcon?: React.ReactNode;
  variant?: "default" | "onPrimary";
  titleColor?: "default" | "primary";
  /** Lighter edge (e.g. dashboard Recent logs) — still bordered, not as heavy as default. */
  softOutline?: boolean;
}) {
  const c = useFlareColors();
  const onPrimary = variant === "onPrimary";
  const labelColor = onPrimary ? c.white : titleColor === "primary" ? c.primary : c.secondaryBtnText;
  const outline = onPrimary
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
        onPrimary
          ? { backgroundColor: "rgba(255,255,255,0.12)", ...outline }
          : { backgroundColor: c.secondaryBtnBg, ...outline },
        disabled ? { opacity: 0.55 } : null,
      ]}
    >
      <View style={flareButtonStyles.buttonSecondaryContent}>
        {leftIcon ? leftIcon : null}
        <Text style={[flareButtonStyles.buttonSecondaryText, { color: labelColor }]}>{title}</Text>
      </View>
    </Pressable>
  );
}
