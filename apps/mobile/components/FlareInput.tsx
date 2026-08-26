import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type PressableProps,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { FLARE_BUTTON_BORDER_RADIUS } from "./FlareButton";
import { FLARE_CHROME_LUCIDE, FLARE_FEATURE_LUCIDE, FlareLucideIcon } from "../lib/flareLucideIcons";
import type { FlareColors } from "../theme";
import { useFlareColors } from "../theme";

/** All text fields, text areas, and picker triggers — same radius as buttons. */
export const FLARE_INPUT_BORDER_RADIUS = FLARE_BUTTON_BORDER_RADIUS;

export const flareInputStyles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderRadius: FLARE_INPUT_BORDER_RADIUS,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 6,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  textarea: {
    borderWidth: 1,
    borderRadius: FLARE_INPUT_BORDER_RADIUS,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 6,
    minHeight: 100,
    textAlignVertical: "top",
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "Inter_400Regular",
  },
  trigger: {
    borderWidth: 1,
    borderRadius: FLARE_INPUT_BORDER_RADIUS,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 6,
    minHeight: 42,
    justifyContent: "center",
  },
  triggerRow: { flexDirection: "row", alignItems: "center", gap: 8, width: "100%" },
  triggerValue: { flex: 1, minWidth: 0 },
  inputWithIcon: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  inputWithIconField: {
    flex: 1,
    marginTop: 0,
    borderWidth: 0,
    paddingHorizontal: 0,
    paddingVertical: 0,
    backgroundColor: "transparent",
  },
  inputTrailingLabel: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    flexShrink: 0,
  },
  fieldBlock: { gap: 6, marginBottom: 2 },
  label: { fontSize: 13, fontFamily: "Inter_500Medium", marginTop: 2 },
});

/** Shared validation/error copy — always use `c.danger` for color. */
export const flareFieldErrorStyles = StyleSheet.create({
  input: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  wizard: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 8 },
});

export function flareFieldErrorStyle(c: FlareColors, variant: "input" | "wizard" = "input") {
  return [flareFieldErrorStyles[variant], { color: c.danger }];
}

export function flareInputThemeColors(c: FlareColors, onPrimary?: boolean) {
  if (onPrimary) {
    return {
      backgroundColor: c.white,
      borderColor: "rgba(255,255,255,0.45)",
      color: c.text,
      placeholderColor: "rgba(15,23,42,0.45)",
    };
  }
  return {
    backgroundColor: c.inputBg,
    borderColor: c.inputBorder,
    color: c.text,
    placeholderColor: c.textMuted,
  };
}

export function flareInputStyle(
  c: FlareColors,
  opts?: { onPrimary?: boolean; multiline?: boolean },
): StyleProp<TextStyle> {
  const theme = flareInputThemeColors(c, opts?.onPrimary);
  return [opts?.multiline ? flareInputStyles.textarea : flareInputStyles.input, theme];
}

export const FlareTextInput = React.forwardRef<
  TextInput,
  TextInputProps & {
    onPrimary?: boolean;
    /** Leading Lucide glyph (e.g. medication / dose in TM wizard). */
    fieldIcon?: "pill" | "dose";
    /** Fixed unit after the value (e.g. mg) — keeps placeholder-free fields readable. */
    trailingLabel?: string;
  }
>(function FlareTextInput({ style, onPrimary, multiline, fieldIcon, trailingLabel, ...props }, ref) {
  const c = useFlareColors();
  const theme = flareInputThemeColors(c, onPrimary);
  const icon =
    fieldIcon === "pill"
      ? FLARE_FEATURE_LUCIDE.meds
      : fieldIcon === "dose"
        ? FLARE_CHROME_LUCIDE.dose
        : null;
  if ((icon || trailingLabel) && !multiline) {
    return (
      <View style={[flareInputStyles.input, flareInputStyles.inputWithIcon, theme, style]}>
        {icon ? <FlareLucideIcon icon={icon} size={18} color={c.textSecondary} /> : null}
        <TextInput
          ref={ref}
          style={[flareInputStyles.inputWithIconField, { color: theme.color, fontSize: 14, fontFamily: "Inter_400Regular" }]}
          placeholderTextColor={theme.placeholderColor}
          {...props}
        />
        {trailingLabel ? (
          <Text style={[flareInputStyles.inputTrailingLabel, { color: c.textMuted }]}>{trailingLabel}</Text>
        ) : null}
      </View>
    );
  }
  return (
    <TextInput
      ref={ref}
      style={[multiline ? flareInputStyles.textarea : flareInputStyles.input, theme, style]}
      placeholderTextColor={theme.placeholderColor}
      multiline={multiline}
      {...props}
    />
  );
});

/** Date/time (and similar) controls that should look like a text field. */
export function FlareInputTrigger({
  children,
  style,
  onPrimary,
  pickerIcon,
  trailingLabel,
  ...props
}: PressableProps & {
  children: React.ReactNode;
  onPrimary?: boolean;
  /** Leading Lucide glyph for date/time pickers (wizards, forms). */
  pickerIcon?: "date" | "time";
  /** Right-side muted label (e.g. date / time) — matches unit trailers on text fields. */
  trailingLabel?: string;
}) {
  const c = useFlareColors();
  const theme = flareInputThemeColors(c, onPrimary);
  const icon = pickerIcon === "date" ? FLARE_CHROME_LUCIDE.calendar : pickerIcon === "time" ? FLARE_CHROME_LUCIDE.time : null;
  const trailing = trailingLabel ? (
    <Text style={[flareInputStyles.inputTrailingLabel, { color: c.textMuted }]}>{trailingLabel}</Text>
  ) : null;
  if (icon || trailing) {
    return (
      <Pressable style={[flareInputStyles.trigger, theme, style]} {...props}>
        <View style={flareInputStyles.triggerRow}>
          {icon ? <FlareLucideIcon icon={icon} size={18} color={c.textSecondary} /> : null}
          <View style={flareInputStyles.triggerValue}>{children}</View>
          {trailing}
        </View>
      </Pressable>
    );
  }
  return (
    <Pressable style={[flareInputStyles.trigger, theme, style]} {...props}>
      {children}
    </Pressable>
  );
}

export const LabeledInput = React.forwardRef<
  TextInput,
  { label: string; error?: string; onPrimary?: boolean } & TextInputProps
>(function LabeledInput({ label, error, style, onPrimary, multiline, ...props }, ref) {
  const c = useFlareColors();
  const onBlue = Boolean(onPrimary);
  return (
    <View style={flareInputStyles.fieldBlock}>
      <Text style={[flareInputStyles.label, { color: onBlue ? "rgba(255,255,255,0.92)" : c.textSecondary }]}>{label}</Text>
      <FlareTextInput ref={ref} style={style} onPrimary={onPrimary} multiline={multiline} {...props} />
      {error ? <Text style={flareFieldErrorStyle(c, "input")}>{error}</Text> : null}
    </View>
  );
});
