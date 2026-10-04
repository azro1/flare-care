import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, View, Text, StyleSheet, type LayoutChangeEvent } from "react-native";
import Svg, { Path } from "react-native-svg";
import { useFlareColors } from "../theme";
import { RADIUS, SPACING, TYPOGRAPHY, OPACITY, DIMENSIONS } from "../designTokens";

const WAVE_AMP = SPACING.sm;

/** One repeat per tile width, drawn twice so a sideways loop has no seam. */
function surfaceWavePath(tileWidth: number, amp: number): string {
  const span = tileWidth * 2;
  const steps = 32;
  let d = "";
  for (let i = 0; i <= steps; i += 1) {
    const x = (i / steps) * span;
    const y = amp / 2 - Math.sin((x / tileWidth) * Math.PI * 2) * (amp / 2);
    d += i === 0 ? `M ${x.toFixed(1)} ${y.toFixed(1)}` : ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  d += ` L ${span} ${amp} L 0 ${amp} Z`;
  return d;
}

type FillStatTileProps = {
  label: string;
  value: string;
  total: string;
  caption: string;
  /** 0 empty through 1 full. The wash rises from the bottom of the card. */
  ratio: number;
  hue: string;
};

function withAlpha(hex: string, alpha: number): string {
  const clamped = Math.min(1, Math.max(0, alpha));
  const channel = Math.round(clamped * 255)
    .toString(16)
    .padStart(2, "0");
  return `${hex}${channel}`;
}

export function FillStatTile({ label, value, total, caption, ratio, hue }: FillStatTileProps) {
  const colors = useFlareColors();
  const fill = Math.min(1, Math.max(0, ratio));
  const fillHeight = useRef(new Animated.Value(0)).current;
  const waveShift = useRef(new Animated.Value(0)).current;
  const [tileWidth, setTileWidth] = useState(0);
  const wash = withAlpha(hue, OPACITY.iconTile);
  const wavePath = useMemo(() => (tileWidth > 0 ? surfaceWavePath(tileWidth, WAVE_AMP) : ""), [tileWidth]);

  const onLayout = (event: LayoutChangeEvent) => {
    const width = event.nativeEvent.layout.width;
    setTileWidth((prev) => (prev === width ? prev : width));
  };

  useEffect(() => {
    Animated.timing(fillHeight, {
      toValue: fill * DIMENSIONS.statTileHeight,
      duration: 900,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [fill, fillHeight]);

  useEffect(() => {
    if (tileWidth <= 0) return;
    waveShift.setValue(0);
    const loop = Animated.loop(
      Animated.timing(waveShift, {
        toValue: -tileWidth,
        duration: 3200,
        easing: Easing.linear,
        useNativeDriver: false,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [tileWidth, waveShift]);

  return (
    <View
      onLayout={onLayout}
      style={[styles.container, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          styles.fill,
          {
            height: fillHeight,
            backgroundColor: wash,
          },
        ]}
      />
      {tileWidth > 0 ? (
        <Animated.View pointerEvents="none" style={[styles.waveClip, { bottom: fillHeight, width: tileWidth }]}>
          <Animated.View style={{ width: tileWidth * 2, height: WAVE_AMP, transform: [{ translateX: waveShift }] }}>
            <Svg width={tileWidth * 2} height={WAVE_AMP}>
              <Path d={wavePath} fill={wash} />
            </Svg>
          </Animated.View>
        </Animated.View>
      ) : null}
      <Text style={[styles.label, { color: colors.textSecondary, fontFamily: TYPOGRAPHY.fontFamily.regular }]}>
        {label}
      </Text>
      <View style={styles.bottom}>
        <Text style={styles.valueRow}>
          <Text style={[styles.value, { color: colors.text, fontFamily: TYPOGRAPHY.fontFamily.bold }]}>{value}</Text>
          <Text style={[styles.total, { color: colors.textSecondary, fontFamily: TYPOGRAPHY.fontFamily.medium }]}>
            /{total}
          </Text>
        </Text>
        <Text style={[styles.caption, { color: colors.textSecondary, fontFamily: TYPOGRAPHY.fontFamily.regular }]}>
          {caption}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    height: DIMENSIONS.statTileHeight,
    borderRadius: RADIUS.card,
    borderWidth: 1,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.lg,
    paddingHorizontal: SPACING.card,
    overflow: "hidden",
  },
  fill: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
  },
  waveClip: {
    position: "absolute",
    left: 0,
    height: WAVE_AMP,
    overflow: "hidden",
  },
  label: {
    fontSize: TYPOGRAPHY.fontSize.sm,
  },
  bottom: {
    marginTop: "auto",
  },
  valueRow: {
    marginBottom: SPACING.xs,
  },
  value: {
    fontSize: TYPOGRAPHY.fontSize.tileValue,
    lineHeight: TYPOGRAPHY.fontSize.tileValue,
  },
  total: {
    fontSize: TYPOGRAPHY.fontSize.stat,
  },
  caption: {
    fontSize: TYPOGRAPHY.fontSize.xs,
  },
});
