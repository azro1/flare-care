import React, { useCallback, useEffect, useRef } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { FLARE_FONT_FAMILY, FLARE_FONT_SIZE } from "../lib/layoutConstants";
import { useFlareColors } from "../theme";

const BTN = 56;
const HOLD_DELAY_MS = 420;
const HOLD_INTERVAL_MS = 110;

/** Stable control row height — stepper and Reset share this so the card doesn’t jump. */
export const HYDRATION_STEPPER_ROW_HEIGHT = BTN + 8;

/**
 * Horizontal − / + stepper. At goal, swaps to Reset in the same footprint.
 */
export function HydrationStepper({
  value,
  min = 0,
  max,
  onChange,
  atGoal = false,
  onReset,
}: {
  value: number;
  min?: number;
  max: number;
  onChange: (next: number) => void;
  atGoal?: boolean;
  onReset?: () => void;
}) {
  const c = useFlareColors();
  const valueRef = useRef(value);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  const clearHold = useCallback(() => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }
  }, []);

  useEffect(() => clearHold, [clearHold]);

  /** Hitting goal unmounts +/− without pressOut — stop any active hold or it keeps stepping after reset. */
  useEffect(() => {
    if (atGoal) clearHold();
  }, [atGoal, clearHold]);

  const stepBy = useCallback(
    (delta: number) => {
      const next = Math.max(min, Math.min(max, valueRef.current + delta));
      if (next === valueRef.current) {
        clearHold();
        return;
      }
      valueRef.current = next;
      onChange(next);
      if (next === min || next === max) clearHold();
    },
    [clearHold, max, min, onChange],
  );

  const startHold = useCallback(
    (delta: number) => {
      clearHold();
      stepBy(delta);
      holdTimerRef.current = setTimeout(() => {
        holdIntervalRef.current = setInterval(() => stepBy(delta), HOLD_INTERVAL_MS);
      }, HOLD_DELAY_MS);
    },
    [clearHold, stepBy],
  );

  const canDecrement = value > min;
  const canIncrement = value < max;

  return (
    <View style={styles.row}>
      {atGoal ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Reset today's hydration count"
          onPress={onReset}
          style={({ pressed }) => [
            styles.resetBtn,
            {
              backgroundColor: c.secondaryBtnBg,
              borderColor: c.secondaryBtnBorder,
              opacity: pressed ? 0.88 : 1,
            },
          ]}
        >
          <Text style={[styles.resetLabel, { color: c.text }]}>Reset</Text>
        </Pressable>
      ) : (
        <>
          <StepperButton
            label="Decrease glasses"
            symbol="−"
            disabled={!canDecrement}
            color={c.text}
            mutedColor={c.textMuted}
            backgroundColor={c.secondaryBtnBg}
            borderColor={c.secondaryBtnBorder}
            onPressIn={() => startHold(-1)}
            onPressOut={clearHold}
          />

          <StepperButton
            label="Increase glasses"
            symbol="+"
            disabled={!canIncrement}
            color={c.white}
            mutedColor={c.white}
            backgroundColor={canIncrement ? c.primary : c.primaryDisabledBg}
            borderColor={canIncrement ? c.primary : c.primaryDisabledBg}
            filled
            onPressIn={() => startHold(1)}
            onPressOut={clearHold}
          />
        </>
      )}
    </View>
  );
}

function StepperButton({
  label,
  symbol,
  disabled,
  color,
  mutedColor,
  backgroundColor,
  borderColor,
  filled,
  onPressIn,
  onPressOut,
}: {
  label: string;
  symbol: string;
  disabled: boolean;
  color: string;
  mutedColor: string;
  backgroundColor: string;
  borderColor: string;
  filled?: boolean;
  onPressIn: () => void;
  onPressOut: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      onPress={() => {
        /* press handled in onPressIn so hold-repeat stays in sync */
      }}
      hitSlop={4}
      style={({ pressed }) => [
        styles.btn,
        {
          backgroundColor,
          borderColor,
          borderWidth: filled ? 0 : 1,
          opacity: disabled ? 0.45 : pressed ? 0.88 : 1,
        },
      ]}
    >
      <Text style={[styles.btnSymbol, { color: disabled ? mutedColor : color }]}>{symbol}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "stretch",
    gap: 40,
    height: HYDRATION_STEPPER_ROW_HEIGHT,
  },
  btn: {
    width: BTN,
    height: BTN,
    borderRadius: BTN / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  btnSymbol: {
    fontSize: 28,
    fontFamily: FLARE_FONT_FAMILY.bold,
    lineHeight: 32,
    marginTop: -2,
  },
  resetBtn: {
    minWidth: 152,
    height: BTN,
    borderRadius: BTN / 2,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  resetLabel: {
    fontSize: FLARE_FONT_SIZE.body,
    fontFamily: FLARE_FONT_FAMILY.bold,
  },
});
