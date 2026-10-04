import React from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { RADIUS, SPACING, TYPOGRAPHY } from "../designTokens";
import { useFlareColors } from "../theme";

export function OptionChip({
  label,
  selected,
  onPress,
  disabled,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
}) {
  const c = useFlareColors();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? c.cta : c.inputBg,
          borderColor: selected ? c.cta : c.inputBorder,
        },
        pressed && !disabled && { opacity: 0.8 },
        disabled && { opacity: 0.5 },
      ]}
    >
      <Text
        style={[
          styles.label,
          {
            color: selected ? c.white : c.text,
            fontFamily: selected ? TYPOGRAPHY.fontFamily.semibold : TYPOGRAPHY.fontFamily.regular,
          },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.button,
    borderWidth: 1.5,
  },
  label: {
    fontSize: TYPOGRAPHY.fontSize.md,
    textAlign: "center",
  },
});
