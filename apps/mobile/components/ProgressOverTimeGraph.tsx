/**
 * Progress-over-time graph (area/line + compact period dropdown).
 * Used on My progress sheet (graph swipe page).
 * Pair with `lib/progressGraphShared.ts`.
 */
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, LayoutChangeEvent, Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from "react-native-svg";
import { formatUkDateShort } from "../lib/formatUkDate";
import { FLARE_FONT_FAMILY, FLARE_FONT_SIZE, FLARE_LINE_HEIGHT } from "../lib/layoutConstants";
import {
  DEFAULT_PROGRESS_GRAPH_PERIOD,
  PROGRESS_GRAPH_PERIOD_LABELS,
  averageProgressPct,
  fetchProgressDayPoints,
  progressGraphPeriodFromLabel,
  progressGraphPeriodLabel,
  type ProgressDayPoint,
  type ProgressGraphPeriod,
} from "../lib/progressGraphShared";
import { useFlareColors } from "../theme";
import { OptionPickerModal } from "./OptionPickerModal";

const CHART_HEIGHT = 168;
const CHART_HEIGHT_FALLBACK = 160;
const PAD_L = 28;
const PAD_R = 8;
const PAD_T = 12;
const PAD_B = 28;

function buildAreaAndLine(points: ProgressDayPoint[], width: number, chartHeight: number) {
  const innerW = Math.max(1, width - PAD_L - PAD_R);
  const innerH = Math.max(1, chartHeight - PAD_T - PAD_B);
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
  compact = false,
}: {
  userId: string;
  /** Load when this swipe page is active (or becoming active). */
  active: boolean;
  /** Fill the My progress sheet page — chart grows into leftover space. */
  compact?: boolean;
}) {
  const c = useFlareColors();
  const [period, setPeriod] = useState<ProgressGraphPeriod>(DEFAULT_PROGRESS_GRAPH_PERIOD);
  const [periodPickerOpen, setPeriodPickerOpen] = useState(false);
  const [points, setPoints] = useState<ProgressDayPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [chartW, setChartW] = useState(0);
  const [chartH, setChartH] = useState(0);
  const periodLabel = progressGraphPeriodLabel(period);

  const chartHeight = chartH > 0 ? chartH : compact ? CHART_HEIGHT_FALLBACK : CHART_HEIGHT;

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

  const paths = useMemo(() => buildAreaAndLine(points, chartW, chartHeight), [points, chartW, chartHeight]);
  const avg = useMemo(() => averageProgressPct(points), [points]);
  const startLabel = points[0] ? formatUkDateShort(points[0].date) : "";
  const endLabel = points.length ? formatUkDateShort(points[points.length - 1].date) : "";

  const onChartLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    const w = Math.round(width);
    const h = Math.round(height);
    if (w > 0 && w !== chartW) setChartW(w);
    if (h > 0 && h !== chartH) setChartH(h);
  };

  return (
    <>
      <View style={[styles.root, compact ? styles.rootSheet : null]}>
        <View style={styles.periodRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Time period, ${periodLabel}`}
            onPress={() => setPeriodPickerOpen(true)}
            style={[styles.periodField, { backgroundColor: c.inputBg, borderColor: c.inputBorder }]}
          >
            <Text style={[styles.periodFieldText, { color: c.text }]} numberOfLines={1}>
              {periodLabel}
            </Text>
            <Ionicons name="chevron-down" size={16} color={c.textMuted} />
          </Pressable>
          <Text style={[styles.avgLine, { color: c.textSecondary }]} numberOfLines={1}>
            {loading ? "Loading…" : error ? error : `Average ${avg}% over this period`}
          </Text>
        </View>

      <View
        style={[styles.chartWrap, compact ? styles.chartWrapSheet : { minHeight: chartHeight + 8 }]}
        onLayout={onChartLayout}
      >
        {loading && points.length === 0 ? (
          <View style={[styles.chartPlaceholder, { height: chartHeight }]}>
            <ActivityIndicator color={c.primary} />
          </View>
        ) : chartW > 0 && chartHeight > 0 ? (
          <Svg width={chartW} height={chartHeight}>
            <Defs>
              <LinearGradient id="progressFill" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor={c.primary} stopOpacity={0.35} />
                <Stop offset="100%" stopColor={c.primary} stopOpacity={0.02} />
              </LinearGradient>
            </Defs>
            {/* Soft guides */}
            {[0, 0.5, 1].map((t) => {
              const y = PAD_T + (1 - t) * (chartHeight - PAD_T - PAD_B);
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
          <View style={[styles.chartPlaceholder, compact ? styles.chartPlaceholderSheet : { height: chartHeight }]} />
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

      <OptionPickerModal
        visible={periodPickerOpen}
        options={PROGRESS_GRAPH_PERIOD_LABELS}
        onSelect={(label) => {
          const next = progressGraphPeriodFromLabel(label);
          if (next) setPeriod(next);
          setPeriodPickerOpen(false);
        }}
        onCancel={() => setPeriodPickerOpen(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  root: {
    alignSelf: "stretch",
    gap: 12,
  },
  rootSheet: {
    flex: 1,
    gap: 16,
  },
  periodRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  periodField: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 0,
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 7,
    paddingLeft: 10,
    paddingRight: 8,
  },
  periodFieldText: {
    fontSize: FLARE_FONT_SIZE.caption,
    lineHeight: FLARE_LINE_HEIGHT.caption,
    fontFamily: FLARE_FONT_FAMILY.regular,
  },
  avgLine: {
    flex: 1,
    fontSize: FLARE_FONT_SIZE.caption,
    lineHeight: FLARE_LINE_HEIGHT.caption,
    fontFamily: FLARE_FONT_FAMILY.medium,
  },
  chartWrap: {
    alignSelf: "stretch",
    position: "relative",
  },
  chartWrapSheet: {
    flex: 1,
    minHeight: 140,
  },
  chartPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  chartPlaceholderSheet: {
    ...StyleSheet.absoluteFillObject,
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
