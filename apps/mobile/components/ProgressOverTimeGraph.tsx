/**
 * Progress-over-time graph (area/line + period chips).
 * Not wired into My progress yet — kept for feat/progress-graph.
 * Pair with `lib/progressGraphShared.ts`.
 */
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, LayoutChangeEvent, Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from "react-native-svg";
import { formatUkDateShort } from "../lib/formatUkDate";
import { FLARE_FONT_FAMILY, FLARE_FONT_SIZE, FLARE_LINE_HEIGHT } from "../lib/layoutConstants";
import {
  PROGRESS_GRAPH_PERIODS,
  averageProgressPct,
  fetchProgressDayPoints,
  type ProgressDayPoint,
  type ProgressGraphPeriod,
} from "../lib/progressGraphShared";
import { useFlareColors } from "../theme";

const CHART_HEIGHT = 168;
const PAD_L = 28;
const PAD_R = 8;
const PAD_T = 12;
const PAD_B = 28;

function buildAreaAndLine(points: ProgressDayPoint[], width: number) {
  const innerW = Math.max(1, width - PAD_L - PAD_R);
  const innerH = Math.max(1, CHART_HEIGHT - PAD_T - PAD_B);
  if (points.length === 0) {
    return { line: "", area: "", dots: [] as { x: number; y: number }[] };
  }

  const coords = points.map((p, i) => {
    const t = points.length === 1 ? 0 : i / (points.length - 1);
    const x = PAD_L + t * innerW;
    const y = PAD_T + (1 - Math.max(0, Math.min(100, p.pct)) / 100) * innerH;
    return { x, y };
  });

  let line = `M ${coords[0].x.toFixed(1)} ${coords[0].y.toFixed(1)}`;
  for (let i = 1; i < coords.length; i += 1) {
    const prev = coords[i - 1];
    const cur = coords[i];
    const cx = (prev.x + cur.x) / 2;
    line += ` C ${cx.toFixed(1)} ${prev.y.toFixed(1)}, ${cx.toFixed(1)} ${cur.y.toFixed(1)}, ${cur.x.toFixed(1)} ${cur.y.toFixed(1)}`;
  }

  const last = coords[coords.length - 1];
  const first = coords[0];
  const baseline = PAD_T + innerH;
  const area = `${line} L ${last.x.toFixed(1)} ${baseline} L ${first.x.toFixed(1)} ${baseline} Z`;

  // A few guide dots — start / mid / end — so it doesn’t look clinical-dense.
  const dotIdx =
    coords.length < 3
      ? coords.map((_, i) => i)
      : [0, Math.floor((coords.length - 1) / 2), coords.length - 1];
  const dots = [...new Set(dotIdx)].map((i) => coords[i]);

  return { line, area, dots };
}

export function ProgressOverTimeGraph({
  userId,
  active,
}: {
  userId: string;
  /** Load when this swipe page is active (or becoming active). */
  active: boolean;
}) {
  const c = useFlareColors();
  const [period, setPeriod] = useState<ProgressGraphPeriod>("4w");
  const [points, setPoints] = useState<ProgressDayPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [chartW, setChartW] = useState(0);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    void (async () => {
      try {
        const next = await fetchProgressDayPoints(userId, period);
        if (!cancelled) setPoints(next);
      } catch (err) {
        console.error("PROGRESS_GRAPH_LOAD_ERROR", err);
        if (!cancelled) {
          setPoints([]);
          setError("Couldn’t load progress.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [active, period, userId]);

  const paths = useMemo(() => buildAreaAndLine(points, chartW), [points, chartW]);
  const avg = useMemo(() => averageProgressPct(points), [points]);
  const startLabel = points[0] ? formatUkDateShort(points[0].date) : "";
  const endLabel = points.length ? formatUkDateShort(points[points.length - 1].date) : "";

  const onChartLayout = (e: LayoutChangeEvent) => {
    const w = Math.round(e.nativeEvent.layout.width);
    if (w > 0 && w !== chartW) setChartW(w);
  };

  return (
    <View style={styles.root}>
      <View style={styles.periodRow}>
        {PROGRESS_GRAPH_PERIODS.map((item) => {
          const selected = item.id === period;
          return (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={item.label}
              onPress={() => setPeriod(item.id)}
              style={[
                styles.periodChip,
                {
                  backgroundColor: selected ? c.primary : c.surfaceSubtle,
                },
              ]}
            >
              <Text
                style={[
                  styles.periodChipText,
                  { color: selected ? c.white : c.textMuted },
                ]}
                numberOfLines={1}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={[styles.avgLine, { color: c.textSecondary }]}>
        {loading ? "Loading…" : error ? error : `Average ${avg}% over this period`}
      </Text>

      <View style={styles.chartWrap} onLayout={onChartLayout}>
        {loading && points.length === 0 ? (
          <View style={styles.chartPlaceholder}>
            <ActivityIndicator color={c.primary} />
          </View>
        ) : chartW > 0 ? (
          <Svg width={chartW} height={CHART_HEIGHT}>
            <Defs>
              <LinearGradient id="progressFill" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor={c.primary} stopOpacity={0.35} />
                <Stop offset="100%" stopColor={c.primary} stopOpacity={0.02} />
              </LinearGradient>
            </Defs>
            {/* Soft guides */}
            {[0, 0.5, 1].map((t) => {
              const y = PAD_T + (1 - t) * (CHART_HEIGHT - PAD_T - PAD_B);
              return (
                <Path
                  key={`g-${t}`}
                  d={`M ${PAD_L} ${y} L ${chartW - PAD_R} ${y}`}
                  stroke={c.cardBorder}
                  strokeWidth={StyleSheet.hairlineWidth}
                  strokeDasharray="4 6"
                />
              );
            })}
            {paths.area ? <Path d={paths.area} fill="url(#progressFill)" /> : null}
            {paths.line ? (
              <Path d={paths.line} stroke={c.primary} strokeWidth={2.5} fill="none" strokeLinecap="round" />
            ) : null}
            {paths.dots.map((d, i) => (
              <Circle key={`d-${i}`} cx={d.x} cy={d.y} r={3.5} fill={c.card} stroke={c.primary} strokeWidth={2} />
            ))}
          </Svg>
        ) : (
          <View style={[styles.chartPlaceholder, { height: CHART_HEIGHT }]} />
        )}

        <View style={styles.yLabels} pointerEvents="none">
          <Text style={[styles.axisLabel, { color: c.textMuted }]}>100</Text>
          <Text style={[styles.axisLabel, { color: c.textMuted }]}>50</Text>
          <Text style={[styles.axisLabel, { color: c.textMuted }]}>0</Text>
        </View>
        <View style={styles.xLabels} pointerEvents="none">
          <Text style={[styles.axisLabel, { color: c.textMuted }]}>{startLabel}</Text>
          <Text style={[styles.axisLabel, { color: c.textMuted }]}>{endLabel}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignSelf: "stretch",
    gap: 12,
    flexGrow: 1,
  },
  periodRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  periodChip: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  periodChipText: {
    fontSize: FLARE_FONT_SIZE.caption,
    lineHeight: FLARE_LINE_HEIGHT.caption,
    fontFamily: FLARE_FONT_FAMILY.medium,
  },
  avgLine: {
    fontSize: FLARE_FONT_SIZE.caption,
    lineHeight: FLARE_LINE_HEIGHT.caption,
    fontFamily: FLARE_FONT_FAMILY.medium,
  },
  chartWrap: {
    alignSelf: "stretch",
    minHeight: CHART_HEIGHT + 8,
    position: "relative",
  },
  chartPlaceholder: {
    height: CHART_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  yLabels: {
    position: "absolute",
    left: 0,
    top: PAD_T - 6,
    bottom: PAD_B - 6,
    width: PAD_L - 4,
    justifyContent: "space-between",
  },
  xLabels: {
    position: "absolute",
    left: PAD_L,
    right: PAD_R,
    bottom: 0,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  axisLabel: {
    fontSize: 10,
    lineHeight: 14,
    fontFamily: FLARE_FONT_FAMILY.regular,
  },
});
