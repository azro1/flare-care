import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { RADIUS, SPACING, TYPOGRAPHY } from "../designTokens";
import { useFlareColors } from "../theme";
import { FlareLucideIcon, FLARE_CHROME_LUCIDE } from "../lib/flareLucideIcons";

export function NumberStepper({
  value,
  onChange,
  min = 0,
  max = 99,
  disabled,
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
}) {
  const c = useFlareColors();

  const decrement = () => {
    if (value > min) {
      onChange(value - 1);
    }
  };

  const increment = () => {
    if (value < max) {
      onChange(value + 1);
    }
  };

  return (
    <View style={styles.container}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Decrease"
        onPress={decrement}
        disabled={disabled || value <= min}
        style={({ pressed }) => [
          styles.button,
          {
            backgroundColor: c.inputBg,
            borderColor: c.inputBorder,
          },
          pressed && !disabled && value > min && { opacity: 0.8 },
          (disabled || value <= min) && { opacity: 0.3 },
        ]}
      >
        <Text style={{ color: c.text, fontSize: 20, fontFamily: TYPOGRAPHY.fontFamily.bold }}>−</Text>
      </Pressable>

      <View style={[styles.valueContainer, { backgroundColor: c.inputBg, borderColor: c.inputBorder }]}>
        <Text style={[styles.value, { color: c.text, fontFamily: TYPOGRAPHY.fontFamily.semibold }]}>{value}</Text>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Increase"
        onPress={increment}
        disabled={disabled || value >= max}
        style={({ pressed }) => [
          styles.button,
          {
            backgroundColor: c.inputBg,
            borderColor: c.inputBorder,
          },
          pressed && !disabled && value < max && { opacity: 0.8 },
          (disabled || value >= max) && { opacity: 0.3 },
        ]}
      >
        <FlareLucideIcon icon={FLARE_CHROME_LUCIDE.add} size={20} color={c.text} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
  },
  button: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: RADIUS.button,
    borderWidth: 1.5,
  },
  valueContainer: {
    minWidth: 80,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: RADIUS.button,
    borderWidth: 1.5,
    paddingHorizontal: SPACING.md,
  },
  value: {
    fontSize: TYPOGRAPHY.fontSize.cardTitle,
  },
});
