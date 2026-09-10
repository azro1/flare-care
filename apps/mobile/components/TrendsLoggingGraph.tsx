/**
 * Logging-over-time chart for Trends — entry counts, not a health score.
 * Spacing / type from `layoutConstants` — no one-off hardcodes in this file.
 */
import { FLARE_CHROME_LUCIDE, FlareLucideIcon } from "../lib/flareLucideIcons";
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, LayoutChangeEvent, Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Rect } from "react-native-svg";
import { formatUkDateShort } from "../lib/formatUkDate";
import {
  CARD_INNER_PADDING,
  CARD_SECTION_INNER_GAP,
  FLARE_FONT_FAMILY,
  FLARE_FONT_SIZE,
  FLARE_LINE_HEIGHT,
  NAV_ROW_CHEVRON_SIZE,
  STACKED_LINE_GAP,
  TRENDS_AXIS_LABEL,
  TRENDS_BAR_DENSE_DAY_COUNT,
  TRENDS_BAR_EMPTY_HEIGHT,
  TRENDS_BAR_EMPTY_OPACITY,
  TRENDS_BAR_FILL_OPACITY,
  TRENDS_BAR_GAP_COMFORT,
  TRENDS_BAR_GAP_DENSE,
  TRENDS_BAR_GAP_TIGHT,
  TRENDS_BAR_MIN_HEIGHT,
  TRENDS_BAR_MIN_WIDTH,
  TRENDS_BAR_RADIUS_MAX,
  TRENDS_BAR_TIGHT_DAY_COUNT,
  TRENDS_BLOCK_GAP,
  TRENDS_CHART_BLOCK_GAP,
  TRENDS_CHART_HEIGHT,
  TRENDS_CHART_PAD_BOTTOM,
  TRENDS_CHART_PAD_TOP,
  TRENDS_CHART_TRAY_PAD_BOTTOM,
  TRENDS_CHART_TRAY_PAD_H,
  TRENDS_CHART_TRAY_PAD_V,
  TRENDS_CONTROL_ROW_PAD_H,
  TRENDS_CONTROL_ROW_PAD_Y,
  TRENDS_CONTROL_VALUE_GAP,
  TRENDS_EMPTY_COPY_PAD_H,
  TRENDS_HERO_MIN_HEIGHT,
  TRENDS_HERO_VALUE,
  TRENDS_INSET_TRAY_RADIUS,
} from "../lib/layoutConstants";
import {
  DEFAULT_TRENDS_FILTER,
  DEFAULT_TRENDS_PERIOD,
  TRENDS_FILTER_LABELS,
  TRENDS_PERIOD_LABELS,
  fetchTrendsDayPoints,
  getTrendsDayPointsCache,
  setTrendsDayPointsCache,
  totalTrendsEntries,
  trendsChartYMax,
  trendsFilterFromLabel,
  trendsFilterLabel,
  trendsPeriodFromLabel,
  trendsPeriodLabel,
  type TrendsDayPoint,
  type TrendsFilterId,
  type TrendsPeriod,
} from "../lib/trendsLoggingShared";
import { useFlareColors } from "../theme";
import { OptionPickerModal } from "./OptionPickerModal";

function trendsBarGap(dayCount: number): number {
  if (dayCount > TRENDS_BAR_DENSE_DAY_COUNT) return TRENDS_BAR_GAP_DENSE;
  if (dayCount > TRENDS_BAR_TIGHT_DAY_COUNT) return TRENDS_BAR_GAP_TIGHT;
  return TRENDS_BAR_GAP_COMFORT;
}

export function TrendsLoggingGraph({
  userId,
  active = true,
}: {
  userId: string;
  active?: boolean;
}) {
  const c = useFlareColors();
  const [period, setPeriod] = useState<TrendsPeriod>(DEFAULT_TRENDS_PERIOD);
  const [filter, setFilter] = useState<TrendsFilterId>(DEFAULT_TRENDS_FILTER);
  const [periodPickerOpen, setPeriodPickerOpen] = useState(false);
  const [filterPickerOpen, setFilterPickerOpen] = useState(false);
  const [points, setPoints] = useState<TrendsDayPoint[]>(
    () => getTrendsDayPointsCache(userId, DEFAULT_TRENDS_PERIOD, DEFAULT_TRENDS_FILTER) ?? [],
  );
  // No cache yet → spinner; cached (including empty period) paints immediately.
  const [loading, setLoading] = useState(
    () => getTrendsDayPointsCache(userId, DEFAULT_TRENDS_PERIOD, DEFAULT_TRENDS_FILTER) === undefined,
  );
  const [error, setError] = useState("");
  const [chartW, setChartW] = useState(0);

  const periodLabel = trendsPeriodLabel(period);
  const filterLabel = trendsFilterLabel(filter);
  const yMax = useMemo(() => trendsChartYMax(points), [points]);
  const total = useMemo(() => totalTrendsEntries(points), [points]);
  const empty = !loading && !error && total === 0;
  const startLabel = points[0] ? formatUkDateShort(points[0].date) : "";
  const endLabel = points.length ? formatUkDateShort(points[points.length - 1].date) : "";

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    const cached = getTrendsDayPointsCache(userId, period, filter);
    if (cached !== undefined) {
      setPoints(cached);
      setLoading(false);
    } else {
      // Cold combo — clear so hero + chart show spinners, not a stale period/filter.
      setPoints([]);
      setLoading(true);
    }
    setError("");
    void (async () => {
      try {
        const next = await fetchTrendsDayPoints(userId, period, filter);
        if (cancelled) return;
        setTrendsDayPointsCache(userId, period, filter, next);
        setPoints(next);
      } catch (err) {
        console.error("TRENDS_GRAPH_LOAD_ERROR", err);
        if (!cancelled) {
          setPoints([]);
          setError("Couldn’t load trends.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [active, filter, period, userId]);

  const bars = useMemo(() => {
    if (chartW <= 0 || points.length === 0) return [];
    const n = points.length;
    const gap = trendsBarGap(n);
    const slot = chartW / n;
    const barW = Math.max(TRENDS_BAR_MIN_WIDTH, slot - gap);
    const innerH = TRENDS_CHART_HEIGHT - TRENDS_CHART_PAD_TOP - TRENDS_CHART_PAD_BOTTOM;
    return points.map((p, i) => {
      const h = p.count <= 0 ? 0 : Math.max(TRENDS_BAR_MIN_HEIGHT, (p.count / yMax) * innerH);
      return {
        key: p.date,
        x: i * slot + (slot - barW) / 2,
        y: TRENDS_CHART_PAD_TOP + (innerH - h),
        width: barW,
        height: h,
      };
    });
  }, [chartW, points, yMax]);

  const onChartLayout = (e: LayoutChangeEvent) => {
    const w = Math.round(e.nativeEvent.layout.width);
    if (w > 0 && w !== chartW) setChartW(w);
  };

  return (
    <>
      <View style={styles.root}>
        <View style={styles.hero}>
          {loading && points.length === 0 ? (
            <ActivityIndicator color={c.primary} style={styles.heroSpinner} />
          ) : error ? (
            <Text style={[styles.heroError, { color: c.textSecondary }]}>{error}</Text>
          ) : (
            <>
              <Text style={[styles.heroValue, { color: c.text }]}>{empty ? "—" : total}</Text>
              <Text style={[styles.heroLabel, { color: c.textSecondary }]}>
                {empty
                  ? "No entries in this period"
                  : total === 1
                    ? `entry · ${periodLabel.toLowerCase()}`
                    : `entries · ${periodLabel.toLowerCase()}`}
              </Text>
            </>
          )}
        </View>

        <View style={[styles.controlsTray, { backgroundColor: c.surfaceSubtle }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Show, ${filterLabel}`}
            onPress={() => setFilterPickerOpen(true)}
            style={({ pressed }) => [styles.controlRow, pressed && { opacity: 0.7 }]}
          >
            <Text style={[styles.controlKey, { color: c.textMuted }]}>Show</Text>
            <View style={styles.controlValueWrap}>
              <Text style={[styles.controlValue, { color: c.text }]} numberOfLines={1}>
                {filterLabel}
              </Text>
              <FlareLucideIcon icon={FLARE_CHROME_LUCIDE.down} size={NAV_ROW_CHEVRON_SIZE} color={c.textMuted} />
            </View>
          </Pressable>
          <View style={[styles.controlRule, { backgroundColor: c.cardBorder }]} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Time period, ${periodLabel}`}
            onPress={() => setPeriodPickerOpen(true)}
            style={({ pressed }) => [styles.controlRow, pressed && { opacity: 0.7 }]}
          >
            <Text style={[styles.controlKey, { color: c.textMuted }]}>Period</Text>
            <View style={styles.controlValueWrap}>
              <Text style={[styles.controlValue, { color: c.text }]} numberOfLines={1}>
                {periodLabel}
              </Text>
              <FlareLucideIcon icon={FLARE_CHROME_LUCIDE.down} size={NAV_ROW_CHEVRON_SIZE} color={c.textMuted} />
            </View>
          </Pressable>
        </View>

        <View style={styles.chartBlock}>
          <Text style={[styles.chartTitle, { color: c.textMuted }]}>Entries per day</Text>
          <View style={[styles.chartTray, { backgroundColor: c.surfaceSubtle }]}>
            {loading && points.length === 0 ? (
              <View style={styles.chartPlaceholder}>
                <ActivityIndicator color={c.primary} />
              </View>
            ) : empty ? (
              <View style={styles.chartPlaceholder}>
                <Text style={[styles.emptyChartCopy, { color: c.textMuted }]}>
                  Log something and your days will show up here.
                </Text>
              </View>
            ) : (
              <View style={styles.chartPlot} onLayout={onChartLayout}>
                {chartW > 0 ? (
                  <Svg width={chartW} height={TRENDS_CHART_HEIGHT}>
                    {bars.map((b) =>
                      b.height > 0 ? (
                        <Rect
                          key={b.key}
                          x={b.x}
                          y={b.y}
                          width={b.width}
                          height={b.height}
                          rx={Math.min(TRENDS_BAR_RADIUS_MAX, b.width / 2)}
                          fill={c.primary}
                          opacity={TRENDS_BAR_FILL_OPACITY}
                        />
                      ) : (
                        <Rect
                          key={b.key}
                          x={b.x}
                          y={TRENDS_CHART_HEIGHT - TRENDS_CHART_PAD_BOTTOM - TRENDS_BAR_EMPTY_HEIGHT}
                          width={b.width}
                          height={TRENDS_BAR_EMPTY_HEIGHT}
                          rx={TRENDS_BAR_EMPTY_HEIGHT / 2}
                          fill={c.cardBorder}
                          opacity={TRENDS_BAR_EMPTY_OPACITY}
                        />
                      ),
                    )}
                  </Svg>
                ) : (
                  <View style={styles.chartPlaceholder} />
                )}
              </View>
            )}
          </View>
          {!empty && startLabel && endLabel ? (
            <View style={styles.xLabels}>
              <Text style={[styles.axisLabel, { color: c.textMuted }]}>{startLabel}</Text>
              <Text style={[styles.axisLabel, { color: c.textMuted }]}>{endLabel}</Text>
            </View>
          ) : null}
        </View>
      </View>

      <OptionPickerModal
        visible={filterPickerOpen}
        options={TRENDS_FILTER_LABELS}
        onSelect={(label) => {
          const next = trendsFilterFromLabel(label);
          if (next) setFilter(next);
          setFilterPickerOpen(false);
        }}
        onCancel={() => setFilterPickerOpen(false)}
      />
      <OptionPickerModal
        visible={periodPickerOpen}
        options={TRENDS_PERIOD_LABELS}
        onSelect={(label) => {
          const next = trendsPeriodFromLabel(label);
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
    gap: TRENDS_BLOCK_GAP,
  },
  hero: {
    alignItems: "center",
    paddingTop: STACKED_LINE_GAP,
    paddingBottom: STACKED_LINE_GAP / 2,
    minHeight: TRENDS_HERO_MIN_HEIGHT,
    justifyContent: "center",
  },
  heroSpinner: {
    marginVertical: CARD_SECTION_INNER_GAP,
  },
  heroValue: {
    fontFamily: FLARE_FONT_FAMILY.bold,
    ...TRENDS_HERO_VALUE,
  },
  heroLabel: {
    marginTop: STACKED_LINE_GAP,
    fontFamily: FLARE_FONT_FAMILY.medium,
    fontSize: FLARE_FONT_SIZE.caption,
    lineHeight: FLARE_LINE_HEIGHT.caption,
    textAlign: "center",
  },
  heroError: {
    fontFamily: FLARE_FONT_FAMILY.medium,
    fontSize: FLARE_FONT_SIZE.body,
    lineHeight: FLARE_LINE_HEIGHT.body,
    textAlign: "center",
  },
  controlsTray: {
    borderRadius: TRENDS_INSET_TRAY_RADIUS,
    overflow: "hidden",
  },
  controlRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: CARD_SECTION_INNER_GAP,
    paddingVertical: TRENDS_CONTROL_ROW_PAD_Y,
    paddingHorizontal: TRENDS_CONTROL_ROW_PAD_H,
  },
  controlRule: {
    height: StyleSheet.hairlineWidth,
    marginLeft: TRENDS_CONTROL_ROW_PAD_H,
  },
  controlKey: {
    fontFamily: FLARE_FONT_FAMILY.regular,
    fontSize: FLARE_FONT_SIZE.caption,
    lineHeight: FLARE_LINE_HEIGHT.caption,
  },
  controlValueWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: TRENDS_CONTROL_VALUE_GAP,
    flexShrink: 1,
    minWidth: 0,
  },
  controlValue: {
    flexShrink: 1,
    fontFamily: FLARE_FONT_FAMILY.medium,
    fontSize: FLARE_FONT_SIZE.body,
    lineHeight: FLARE_LINE_HEIGHT.body,
    textAlign: "right",
  },
  chartBlock: {
    gap: TRENDS_CHART_BLOCK_GAP,
  },
  chartTitle: {
    fontFamily: FLARE_FONT_FAMILY.medium,
    fontSize: FLARE_FONT_SIZE.caption,
    lineHeight: FLARE_LINE_HEIGHT.caption,
    paddingHorizontal: STACKED_LINE_GAP / 2,
  },
  chartTray: {
    borderRadius: TRENDS_INSET_TRAY_RADIUS,
    paddingHorizontal: TRENDS_CHART_TRAY_PAD_H,
    paddingTop: TRENDS_CHART_TRAY_PAD_V,
    paddingBottom: TRENDS_CHART_TRAY_PAD_BOTTOM,
    overflow: "hidden",
  },
  chartPlot: {
    alignSelf: "stretch",
    height: TRENDS_CHART_HEIGHT,
  },
  chartPlaceholder: {
    height: TRENDS_CHART_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: TRENDS_EMPTY_COPY_PAD_H,
  },
  emptyChartCopy: {
    fontFamily: FLARE_FONT_FAMILY.regular,
    fontSize: FLARE_FONT_SIZE.body,
    lineHeight: FLARE_LINE_HEIGHT.body,
    textAlign: "center",
  },
  xLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: STACKED_LINE_GAP,
  },
  axisLabel: {
    ...TRENDS_AXIS_LABEL,
    fontFamily: FLARE_FONT_FAMILY.regular,
  },
});
