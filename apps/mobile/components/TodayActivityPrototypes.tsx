import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  BackHandler,
  Easing,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { ScrollView as GHScrollView } from "react-native-gesture-handler";
import Svg, { Path } from "react-native-svg";
import { formatUkGreetingDate } from "../lib/formatUkDate";
import { HYDRATION_MCI_ICON, HYDRATION_TARGET } from "../lib/hydrationShared";
import {
  CARD_INNER_PADDING,
  CARD_SECTION_INNER_GAP,
  CONFIRM_MODAL_ACTIONS_GAP,
  CONFIRM_MODAL_STACK_GAP,
  FLARE_FONT_FAMILY,
  FLARE_FONT_SIZE,
  FLARE_LINE_HEIGHT,
  HOME_TILE_GAP,
  INSTRUCTION_CARD_HEADER_GAP,
  INSTRUCTION_CARD_ICON_SIZE,
  INSTRUCTION_CARD_PADDING_BOTTOM,
  INSTRUCTION_CARD_PADDING_H,
  INSTRUCTION_CARD_RADIUS,
  SCREEN_EDGE_PADDING,
  STACKED_LINE_GAP,
  WELCOME_CARD_INNER_PADDING,
  WIZARD_LANDING_BLOCK_PADDING_TOP,
} from "../lib/layoutConstants";
import { MY_MEDS_MCI_ICON } from "../lib/medicationFeatureIcons";
import { Portal } from "../lib/overlayPortal";
import { useFlareColors } from "../theme";
// Progress graph kept for later: `./ProgressOverTimeGraph` + `../lib/progressGraphShared`

const PULSE_METER_HEIGHT = 80;
const PULSE_METER_WIDTH = 34;
const PULSE_METER_RADIUS = PULSE_METER_WIDTH / 2;
/** Card score — readable, not a hero panel. */
const PULSE_SCORE_SIZE = 34;
/** One sine period — path is 2 periods wide; slide by one period for a seamless loop. */
const WAVE_CYCLE = 36;
const WAVE_AMP = 4;
const WAVE_SVG_W = WAVE_CYCLE * 2;
const WAVE_SVG_H = PULSE_METER_HEIGHT + WAVE_AMP * 2;

/** Closed area: sine surface on top, solid body below — the liquid itself (cadet fill). */
function buildSineLiquidPath(width: number, height: number, amplitude: number, phase = 0, cycles = 2) {
  const points = 48;
  const mid = amplitude;
  let d = `M 0 ${(mid + Math.sin(phase) * amplitude).toFixed(2)}`;
  for (let i = 1; i <= points; i += 1) {
    const t = i / points;
    const x = t * width;
    const y = mid + Math.sin(phase + t * cycles * Math.PI * 2) * amplitude;
    d += ` L ${x.toFixed(2)} ${y.toFixed(2)}`;
  }
  d += ` L ${width} ${height} L 0 ${height} Z`;
  return d;
}

const LIQUID_FRONT_PATH = buildSineLiquidPath(WAVE_SVG_W, WAVE_SVG_H, WAVE_AMP, 0, 2);
const LIQUID_BACK_PATH = buildSineLiquidPath(WAVE_SVG_W, WAVE_SVG_H, WAVE_AMP * 0.9, Math.PI * 0.65, 2);

function PulseMeterBar({
  ratio,
  label,
  fillColor,
  trackColor,
  captionColor,
}: {
  ratio: number;
  label: string;
  fillColor: string;
  trackColor: string;
  captionColor: string;
}) {
  const heightAnim = useRef(new Animated.Value(0)).current;
  const waveFrontX = useRef(new Animated.Value(0)).current;
  const waveBackX = useRef(new Animated.Value(0)).current;
  const clamped = Math.max(0, Math.min(1, ratio));
  const isComplete = clamped >= 1;
  const target = clamped * PULSE_METER_HEIGHT;
  /** Wave only while filling — at 100% use solid so troughs don't leave a gap at the top. */
  const showWave = !isComplete && target > 8;
  const showSolid = isComplete || (target > 2 && !showWave);

  useEffect(() => {
    Animated.timing(heightAnim, {
      toValue: target,
      duration: 750,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [heightAnim, target]);

  useEffect(() => {
    if (!showWave) {
      waveFrontX.stopAnimation();
      waveBackX.stopAnimation();
      waveFrontX.setValue(0);
      waveBackX.setValue(0);
      return;
    }
    waveFrontX.setValue(0);
    waveBackX.setValue(0);
    const frontLoop = Animated.loop(
      Animated.timing(waveFrontX, {
        toValue: -WAVE_CYCLE,
        duration: 2200,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    const backLoop = Animated.loop(
      Animated.timing(waveBackX, {
        toValue: -WAVE_CYCLE,
        duration: 3400,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    frontLoop.start();
    backLoop.start();
    return () => {
      frontLoop.stop();
      backLoop.stop();
    };
  }, [showWave, waveFrontX, waveBackX]);

  return (
    <View style={styles.pulseMeterCol}>
      <View style={[styles.pulseMeterTrack, { backgroundColor: trackColor, height: PULSE_METER_HEIGHT }]}>
        <Animated.View style={[styles.pulseMeterFill, { height: heightAnim }]}>
          {showSolid ? (
            <View style={[StyleSheet.absoluteFillObject, { backgroundColor: fillColor }]} />
          ) : null}
          {showWave ? (
            <>
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.pulseMeterWaveLayer,
                  { transform: [{ translateX: waveBackX }] },
                ]}
              >
                <Svg width={WAVE_SVG_W} height={WAVE_SVG_H}>
                  <Path d={LIQUID_BACK_PATH} fill={fillColor} opacity={0.42} />
                </Svg>
              </Animated.View>
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.pulseMeterWaveLayer,
                  { transform: [{ translateX: waveFrontX }] },
                ]}
              >
                <Svg width={WAVE_SVG_W} height={WAVE_SVG_H}>
                  <Path d={LIQUID_FRONT_PATH} fill={fillColor} />
                </Svg>
              </Animated.View>
            </>
          ) : null}
        </Animated.View>
      </View>
      <Text style={[styles.pulseMeterCaption, { color: captionColor }]}>{label}</Text>
    </View>
  );
}

export type TodayActivitySummary = {
  medsTaken: number;
  medsTotal: number;
  hydration: number;
};

type NavHandlers = {
  onOpenMeds: () => void;
  onOpenHydration: () => void;
};

function useActivityCopy(summary: TodayActivitySummary) {
  return useMemo(() => {
    const hasMeds = summary.medsTotal > 0;
    const medsComplete = hasMeds && summary.medsTaken >= summary.medsTotal;
    const medsLabel = !hasMeds
      ? "No meds saved yet"
      : medsComplete
        ? "All taken"
        : `${summary.medsTaken} of ${summary.medsTotal} taken`;
    const medsRatio = hasMeds ? Math.min(1, summary.medsTaken / summary.medsTotal) : 0;
    const hydrationLabel = `${summary.hydration} of ${HYDRATION_TARGET} glasses`;
    const hydrationRatio = Math.min(1, summary.hydration / HYDRATION_TARGET);
    const hydrationComplete = summary.hydration >= HYDRATION_TARGET;
    const anyProgress = (hasMeds && summary.medsTaken > 0) || summary.hydration > 0;

    // %: with meds → average of both; no meds → water only (don't tank the day with a fake 0% meds).
    const pulsePct = Math.round((hasMeds ? (medsRatio + hydrationRatio) / 2 : hydrationRatio) * 100);

    let statusLine: string;
    if (hasMeds) {
      if (medsComplete && hydrationComplete) statusLine = "All done for today!";
      else if (!anyProgress) statusLine = "Nothing taken today";
      else statusLine = "Keep going — still time today";
    } else if (hydrationComplete) {
      statusLine = "All done for today!";
    } else if (summary.hydration > 0) {
      statusLine = "Keep going — still time today";
    } else {
      statusLine = "No meds saved yet";
    }

    return {
      medsLabel,
      medsRatio,
      medsComplete,
      hasMeds,
      hydrationLabel,
      hydrationRatio,
      hydrationComplete,
      statusLine,
      pulsePct,
      dateLabel: formatUkGreetingDate(new Date()),
    };
  }, [summary.hydration, summary.medsTaken, summary.medsTotal]);
}

/** Prototype 1 — Day board: full-width slabs, big numbers, progress fills. */
export function TodayActivityBoardScreen({
  summary,
  onOpenMeds,
  onOpenHydration,
}: { summary: TodayActivitySummary } & NavHandlers) {
  const c = useFlareColors();
  const copy = useActivityCopy(summary);

  return (
    <View style={styles.screenPad}>
      <View style={styles.boardHeader}>
        <Text style={[styles.boardEyebrow, { color: c.textMuted }]}>{copy.dateLabel}</Text>
        <Text style={[styles.boardTitle, { color: c.text }]}>Today</Text>
        <Text style={[styles.boardStatus, { color: c.textMuted }]}>{copy.statusLine}</Text>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`My Meds, ${copy.medsLabel}`}
        onPress={onOpenMeds}
        style={[styles.slab, { backgroundColor: c.card, borderColor: c.cardBorder }]}
      >
        <View style={[styles.slabIcon, { backgroundColor: c.surfaceSubtle }]}>
          <MaterialCommunityIcons name={MY_MEDS_MCI_ICON} size={28} color={c.primary} />
        </View>
        <View style={styles.slabBody}>
          <Text style={[styles.slabTitle, { color: c.text }]}>My Meds</Text>
          <Text style={[styles.slabMeta, { color: c.textMuted }]}>{copy.medsLabel}</Text>
          <View style={[styles.track, { backgroundColor: c.surfaceSubtle }]}>
            <View style={[styles.trackFill, { width: `${copy.medsRatio * 100}%`, backgroundColor: c.primary }]} />
          </View>
        </View>
        <Text style={[styles.slabNum, { color: c.text }]}>
          {summary.medsTotal > 0 ? `${summary.medsTaken}/${summary.medsTotal}` : "—"}
        </Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`My Hydration, ${copy.hydrationLabel}`}
        onPress={onOpenHydration}
        style={[styles.slab, { backgroundColor: c.card, borderColor: c.cardBorder }]}
      >
        <View style={[styles.slabIcon, { backgroundColor: c.surfaceSubtle }]}>
          <MaterialCommunityIcons name={HYDRATION_MCI_ICON} size={28} color={c.primary} />
        </View>
        <View style={styles.slabBody}>
          <Text style={[styles.slabTitle, { color: c.text }]}>My Hydration</Text>
          <Text style={[styles.slabMeta, { color: c.textMuted }]}>{copy.hydrationLabel}</Text>
          <View style={[styles.track, { backgroundColor: c.surfaceSubtle }]}>
            <View
              style={[styles.trackFill, { width: `${copy.hydrationRatio * 100}%`, backgroundColor: c.primary }]}
            />
          </View>
        </View>
        <Text style={[styles.slabNum, { color: c.text }]}>
          {summary.hydration}/{HYDRATION_TARGET}
        </Text>
      </Pressable>
    </View>
  );
}

/** Modal card — fixed title/score; swipe Meds ↔ Hydration body. */
export function TodayActivitiesModal({
  visible,
  leaving = false,
  summary,
  onClose,
  onOpenMeds,
  onOpenHydration,
}: {
  visible: boolean;
  /**
   * Hold an opaque `c.screen` cover (card hidden) until the destination has painted —
   * same idea as AppEntryShell / alert `holdUntilDismissed`. Do not fade the dim away over content.
   */
  leaving?: boolean;
  summary: TodayActivitySummary;
  onClose: () => void;
} & NavHandlers) {
  const c = useFlareColors();
  const copy = useActivityCopy(summary);
  const { width: windowWidth } = useWindowDimensions();
  const pagerRef = useRef<InstanceType<typeof GHScrollView> | null>(null);
  const [pagerWidth, setPagerWidth] = useState(0);
  const [activityIndex, setActivityIndex] = useState(0);
  const [displayPct, setDisplayPct] = useState(0);
  const pageW = pagerWidth > 0 ? pagerWidth : Math.max(0, windowWidth - 64);

  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(0.94)).current;
  const cardLift = useRef(new Animated.Value(14)).current;
  const pctAnim = useRef(new Animated.Value(0)).current;
  const scorePulse = useRef(new Animated.Value(1)).current;

  const activities = [
    {
      id: "meds",
      ratio: copy.medsRatio,
      meterLabel: "Meds",
      title: "My Meds",
      detail: copy.medsLabel,
      icon: MY_MEDS_MCI_ICON,
      onPress: onOpenMeds,
      complete: copy.hasMeds && copy.medsComplete,
    },
    {
      id: "hydration",
      ratio: copy.hydrationRatio,
      meterLabel: "Water",
      title: "My Hydration",
      detail: copy.hydrationLabel,
      icon: HYDRATION_MCI_ICON,
      onPress: onOpenHydration,
      complete: copy.hydrationComplete,
    },
  ] as const;

  const pageStatusLine =
    activityIndex === 0
      ? !copy.hasMeds
        ? "No meds saved yet"
        : copy.medsComplete
          ? "All taken"
          : summary.medsTaken === 0
            ? "Nothing taken today"
            : "Keep going — still time today"
      : copy.hydrationComplete
        ? "All done for today!"
        : summary.hydration === 0
          ? "No water consumed"
          : "Keep going — still time today";

  const pageComplete = activities[activityIndex]?.complete;

  useEffect(() => {
    if (!visible) return;
    setActivityIndex(0);
    overlayOpacity.setValue(0);
    cardOpacity.setValue(0);
    cardScale.setValue(0.94);
    cardLift.setValue(14);
    scorePulse.setValue(1);
    requestAnimationFrame(() => {
      pagerRef.current?.scrollTo({ x: 0, animated: false });
    });

    Animated.parallel([
      Animated.timing(overlayOpacity, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(cardOpacity, {
        toValue: 1,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(cardScale, {
        toValue: 1,
        friction: 8,
        tension: 92,
        useNativeDriver: true,
      }),
      Animated.spring(cardLift, {
        toValue: 0,
        friction: 9,
        tension: 88,
        useNativeDriver: true,
      }),
    ]).start();

    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [visible, onClose, overlayOpacity, cardOpacity, cardScale, cardLift, scorePulse]);

  useEffect(() => {
    if (!visible) {
      setDisplayPct(0);
      pctAnim.setValue(0);
      return;
    }
    setDisplayPct(0);
    pctAnim.setValue(0);
    const pctListener = pctAnim.addListener(({ value }) => {
      setDisplayPct(Math.round(value));
    });
    Animated.timing(pctAnim, {
      toValue: copy.pulsePct,
      duration: 900,
      delay: 120,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (!finished) return;
      if (copy.pulsePct >= 100) {
        Animated.sequence([
          Animated.timing(scorePulse, {
            toValue: 1.06,
            duration: 160,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.spring(scorePulse, {
            toValue: 1,
            friction: 5,
            tension: 120,
            useNativeDriver: true,
          }),
        ]).start();
      }
    });
    return () => {
      pctAnim.removeListener(pctListener);
    };
  }, [visible, copy.pulsePct, pctAnim, scorePulse]);

  const onActivityPagerEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (pageW <= 0) return;
    const next = Math.round(e.nativeEvent.contentOffset.x / pageW);
    setActivityIndex(Math.max(0, Math.min(activities.length - 1, next)));
  };

  if (!visible) return null;

  return (
    <Portal>
      <View style={styles.modalOverlay} pointerEvents={leaving ? "none" : "box-none"}>
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFillObject,
            {
              backgroundColor: leaving ? c.screen : c.modalBackdrop,
              opacity: leaving ? 1 : overlayOpacity,
            },
          ]}
        />
        {leaving ? null : (
          <>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Dismiss"
              onPress={onClose}
              style={StyleSheet.absoluteFillObject}
            />
            <Animated.View
              style={[
                styles.modalCard,
                {
                  backgroundColor: c.card,
                  borderColor: c.primary,
                  opacity: cardOpacity,
                  transform: [{ translateY: cardLift }, { scale: cardScale }],
                },
              ]}
            >
              <View style={styles.modalScoreWash}>
                <View style={styles.modalHeaderRow}>
                  <Text style={[styles.pulseHeroLabel, { color: c.text }]}>
                    Let's stay on track
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Close"
                    onPress={onClose}
                    hitSlop={10}
                    style={styles.modalCloseBtn}
                  >
                    <Ionicons name="close" size={22} color={c.textMuted} />
                  </Pressable>
                </View>
                <Animated.View style={[styles.pulseScore, { transform: [{ scale: scorePulse }] }]}>
                  <Text style={[styles.pulseHeroValue, { color: c.primary }]}>{displayPct}%</Text>
                  <View style={styles.pulseStatusRow}>
                    {pageComplete ? (
                      <Ionicons
                        name="checkmark-circle"
                        size={16}
                        color={c.primary}
                        accessibilityIgnoresInvertColors
                      />
                    ) : null}
                    <Text style={[styles.pulseHeroSub, { color: c.textSecondary }]} numberOfLines={1}>
                      {pageStatusLine}
                    </Text>
                  </View>
                </Animated.View>
              </View>

              <View
                style={styles.activityPagerWrap}
                onLayout={(e) => setPagerWidth(e.nativeEvent.layout.width)}
              >
                {pageW > 0 ? (
                  <GHScrollView
                    ref={pagerRef}
                    horizontal
                    pagingEnabled
                    bounces={false}
                    overScrollMode="never"
                    decelerationRate="fast"
                    disableIntervalMomentum
                    directionalLockEnabled
                    showsHorizontalScrollIndicator={false}
                    onMomentumScrollEnd={onActivityPagerEnd}
                    onScrollEndDrag={onActivityPagerEnd}
                    style={{ width: pageW }}
                  >
                    {activities.map((activity) => (
                      <View key={activity.id} style={[styles.activityPage, { width: pageW }]}>
                        <View style={styles.pulseMeters}>
                          <PulseMeterBar
                            ratio={activity.ratio}
                            label={activity.meterLabel}
                            fillColor={c.primary}
                            trackColor={c.surfaceSubtle}
                            captionColor={c.textMuted}
                          />
                        </View>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`${activity.title}, ${activity.detail}`}
                          onPress={activity.onPress}
                          style={styles.pulseRowTray}
                        >
                          <MaterialCommunityIcons
                            name={activity.icon}
                            size={INSTRUCTION_CARD_ICON_SIZE}
                            color={c.primary}
                          />
                          <View style={styles.pulseRowText}>
                            <Text style={[styles.pulseRowTitle, { color: c.text }]}>{activity.title}</Text>
                            <Text style={[styles.slabMeta, { color: c.textMuted }]}>{activity.detail}</Text>
                          </View>
                          {activity.complete ? (
                            <Ionicons
                              name="checkmark-circle"
                              size={20}
                              color={c.primary}
                              accessibilityIgnoresInvertColors
                            />
                          ) : (
                            <Ionicons name="chevron-forward" size={18} color={c.text} />
                          )}
                        </Pressable>
                      </View>
                    ))}
                  </GHScrollView>
                ) : null}
              </View>

              <View style={styles.activityFooter}>
                <View style={styles.activityDots}>
                  {activities.map((activity, index) => {
                    const active = index === activityIndex;
                    return (
                      <View
                        key={activity.id}
                        style={[
                          styles.activityDot,
                          active ? styles.activityDotActive : null,
                          {
                            backgroundColor: active ? c.primary : c.appearanceChipInactiveBg,
                          },
                        ]}
                      />
                    );
                  })}
                </View>
              </View>
            </Animated.View>
          </>
        )}
      </View>
    </Portal>
  );
}

/** @deprecated Use `TodayActivitiesModal` — kept for prototype exports. */
export function TodayActivityPulseScreen({
  summary,
  onOpenMeds,
  onOpenHydration,
}: { summary: TodayActivitySummary } & NavHandlers) {
  const c = useFlareColors();
  const copy = useActivityCopy(summary);

  return (
    <View style={styles.screenPad}>
      <View style={[styles.pulseHero, { backgroundColor: c.card }]}>
        <Text style={[styles.pulseHeroLabel, { color: c.text }]}>Today's progress</Text>
        <Text style={[styles.pulseHeroIntro, { color: c.textMuted }]}>
          Complete the steps below to help manage your health each day.
        </Text>
        <View style={styles.pulseScore}>
          <Text style={[styles.pulseHeroValue, { color: c.primary }]}>{copy.pulsePct}%</Text>
          <Text style={[styles.pulseHeroSub, { color: c.textSecondary }]}>{copy.statusLine}</Text>
        </View>
        <View style={styles.pulseMeters}>
          <PulseMeterBar
            ratio={copy.medsRatio}
            label="Meds"
            fillColor={c.primary}
            trackColor={c.surfaceSubtle}
            captionColor={c.textMuted}
          />
          <PulseMeterBar
            ratio={copy.hydrationRatio}
            label="Water"
            fillColor={c.primary}
            trackColor={c.surfaceSubtle}
            captionColor={c.textMuted}
          />
        </View>
        <View style={styles.pulseRows}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`My Meds, ${copy.medsLabel}`}
            onPress={onOpenMeds}
            style={styles.pulseRowInCard}
          >
            <MaterialCommunityIcons name={MY_MEDS_MCI_ICON} size={INSTRUCTION_CARD_ICON_SIZE} color={c.primary} />
            <View style={styles.pulseRowText}>
              <Text style={[styles.pulseRowTitle, { color: c.text }]}>My Meds</Text>
              <Text style={[styles.slabMeta, { color: c.textMuted }]}>{copy.medsLabel}</Text>
            </View>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`My Hydration, ${copy.hydrationLabel}`}
            onPress={onOpenHydration}
            style={styles.pulseRowInCard}
          >
            <MaterialCommunityIcons name={HYDRATION_MCI_ICON} size={INSTRUCTION_CARD_ICON_SIZE} color={c.primary} />
            <View style={styles.pulseRowText}>
              <Text style={[styles.pulseRowTitle, { color: c.text }]}>My Hydration</Text>
              <Text style={[styles.slabMeta, { color: c.textMuted }]}>{copy.hydrationLabel}</Text>
            </View>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

/** Prototype 3 — Timeline rail: vertical spine through the day. */
export function TodayActivityTimelineScreen({
  summary,
  onOpenMeds,
  onOpenHydration,
}: { summary: TodayActivitySummary } & NavHandlers) {
  const c = useFlareColors();
  const copy = useActivityCopy(summary);

  const beats = [
    {
      id: "meds",
      when: "Morning",
      title: "Medications",
      detail: copy.medsLabel,
      done: copy.medsComplete || summary.medsTotal <= 0,
      onPress: onOpenMeds,
      icon: MY_MEDS_MCI_ICON,
    },
    {
      id: "hydration",
      when: "Through the day",
      title: "Hydration",
      detail: copy.hydrationLabel,
      done: copy.hydrationComplete,
      onPress: onOpenHydration,
      icon: HYDRATION_MCI_ICON,
    },
  ] as const;

  return (
    <View style={styles.screenPad}>
      <Text style={[styles.boardEyebrow, { color: c.textMuted }]}>{copy.dateLabel}</Text>
      <Text style={[styles.boardTitle, { color: c.text, marginBottom: 6 }]}>Today’s path</Text>
      <Text style={[styles.boardStatus, { color: c.textMuted, marginBottom: 20 }]}>{copy.statusLine}</Text>

      <View style={styles.timeline}>
        {beats.map((beat, index) => {
          const last = index === beats.length - 1;
          return (
            <View key={beat.id} style={styles.timelineRow}>
              <View style={styles.timelineRail}>
                <View
                  style={[
                    styles.timelineDot,
                    {
                      backgroundColor: beat.done ? c.primary : c.surfaceSubtle,
                      borderColor: beat.done ? c.primary : c.cardBorder,
                    },
                  ]}
                />
                {!last ? <View style={[styles.timelineLine, { backgroundColor: c.cardBorder }]} /> : null}
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${beat.title}, ${beat.detail}`}
                onPress={beat.onPress}
                style={[styles.timelineCard, { backgroundColor: c.card, borderColor: c.cardBorder }]}
              >
                <View style={styles.timelineCardTop}>
                  <Text style={[styles.timelineWhen, { color: c.textMuted }]}>{beat.when}</Text>
                  <MaterialCommunityIcons name={beat.icon} size={20} color={c.primary} />
                </View>
                <Text style={[styles.slabTitle, { color: c.text }]}>{beat.title}</Text>
                <Text style={[styles.slabMeta, { color: c.textMuted }]}>{beat.detail}</Text>
              </Pressable>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screenPad: {
    paddingHorizontal: SCREEN_EDGE_PADDING,
    paddingTop: WIZARD_LANDING_BLOCK_PADDING_TOP,
  },
  boardHeader: { marginBottom: WELCOME_CARD_INNER_PADDING },
  boardEyebrow: {
    fontSize: FLARE_FONT_SIZE.muted,
    fontFamily: FLARE_FONT_FAMILY.medium,
    marginBottom: STACKED_LINE_GAP,
  },
  boardTitle: {
    fontSize: 32,
    fontFamily: FLARE_FONT_FAMILY.extrabold,
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  boardStatus: {
    fontSize: FLARE_FONT_SIZE.subhead,
    fontFamily: FLARE_FONT_FAMILY.regular,
    lineHeight: FLARE_LINE_HEIGHT.subhead,
  },
  slab: {
    flexDirection: "row",
    alignItems: "center",
    gap: HOME_TILE_GAP,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: CARD_INNER_PADDING,
    marginBottom: CARD_SECTION_INNER_GAP,
  },
  slabIcon: {
    width: 52,
    height: 52,
    borderRadius: INSTRUCTION_CARD_RADIUS,
    alignItems: "center",
    justifyContent: "center",
  },
  slabBody: { flex: 1, gap: STACKED_LINE_GAP },
  slabTitle: {
    fontSize: FLARE_FONT_SIZE.navTitle,
    fontFamily: FLARE_FONT_FAMILY.bold,
  },
  slabMeta: {
    fontSize: FLARE_FONT_SIZE.muted,
    fontFamily: FLARE_FONT_FAMILY.regular,
  },
  slabNum: {
    fontSize: FLARE_FONT_SIZE.pageTitle,
    fontFamily: FLARE_FONT_FAMILY.extrabold,
    minWidth: 48,
    textAlign: "right",
  },
  track: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
    marginTop: STACKED_LINE_GAP,
  },
  trackFill: {
    height: "100%",
    borderRadius: 3,
  },
  pulseHero: {
    borderRadius: INSTRUCTION_CARD_RADIUS,
    padding: INSTRUCTION_CARD_PADDING_H,
    alignItems: "center",
    gap: INSTRUCTION_CARD_PADDING_BOTTOM,
    marginBottom: CARD_SECTION_INNER_GAP,
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    paddingHorizontal: SCREEN_EDGE_PADDING + 12,
    zIndex: 9999,
    elevation: 9999,
  },
  modalCard: {
    borderRadius: INSTRUCTION_CARD_RADIUS,
    borderWidth: 1,
    paddingHorizontal: INSTRUCTION_CARD_PADDING_H,
    paddingTop: 16,
    paddingBottom: 14,
    gap: 12,
    overflow: "hidden",
  },
  modalScoreWash: {
    alignSelf: "stretch",
    gap: 18,
  },
  modalHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  modalCloseBtn: {
    padding: 2,
    marginTop: -2,
    flexShrink: 0,
  },
  activityPagerWrap: {
    alignSelf: "stretch",
  },
  activityPage: {
    alignItems: "center",
    gap: 12,
  },
  activityFooter: {
    alignItems: "center",
  },
  activityDots: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  activityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  activityDotActive: {
    width: 14,
    borderRadius: 3,
  },
  activitySwipeHint: {
    fontSize: FLARE_FONT_SIZE.caption,
    lineHeight: FLARE_LINE_HEIGHT.caption,
    fontFamily: FLARE_FONT_FAMILY.medium,
  },
  activitySwipeHintSpacer: {
    height: 0,
  },
  pulseHeroLabel: {
    flex: 1,
    paddingRight: 8,
    fontSize: FLARE_FONT_SIZE.sectionTitle + 1,
    lineHeight: 27,
    fontFamily: FLARE_FONT_FAMILY.extrabold,
    textAlign: "left",
  },
  pulseHeroIntro: {
    alignSelf: "stretch",
    fontSize: FLARE_FONT_SIZE.caption,
    fontFamily: FLARE_FONT_FAMILY.regular,
    lineHeight: FLARE_LINE_HEIGHT.caption,
    textAlign: "left",
  },
  pulseScore: {
    alignItems: "center",
    gap: 4,
  },
  pulseStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    minHeight: FLARE_LINE_HEIGHT.muted,
  },
  pulseHeroValue: {
    fontSize: PULSE_SCORE_SIZE,
    fontFamily: FLARE_FONT_FAMILY.extrabold,
    letterSpacing: -0.5,
  },
  pulseHeroSub: {
    fontSize: FLARE_FONT_SIZE.muted,
    lineHeight: FLARE_LINE_HEIGHT.muted,
    fontFamily: FLARE_FONT_FAMILY.medium,
    textAlign: "center",
  },
  pulseMeters: {
    flexDirection: "row",
    gap: CONFIRM_MODAL_ACTIONS_GAP + HOME_TILE_GAP,
    alignItems: "flex-end",
  },
  pulseMeterCol: { alignItems: "center", gap: 6 },
  pulseMeterTrack: {
    width: PULSE_METER_WIDTH,
    borderRadius: PULSE_METER_RADIUS,
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  pulseMeterFill: {
    width: "100%",
    borderBottomLeftRadius: PULSE_METER_RADIUS,
    borderBottomRightRadius: PULSE_METER_RADIUS,
    overflow: "hidden",
  },
  pulseMeterWaveLayer: {
    position: "absolute",
    top: 0,
    left: 0,
    width: WAVE_SVG_W,
    height: WAVE_SVG_H,
  },
  pulseMeterCaption: {
    fontSize: FLARE_FONT_SIZE.caption,
    fontFamily: FLARE_FONT_FAMILY.medium,
  },
  pulseRowInCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: HOME_TILE_GAP,
    paddingVertical: CARD_INNER_PADDING,
  },
  pulseRowInCardSingle: {
    alignSelf: "stretch",
    flexDirection: "row",
    alignItems: "center",
    gap: HOME_TILE_GAP,
    paddingVertical: CARD_INNER_PADDING,
  },
  pulseRowTray: {
    alignSelf: "stretch",
    flexDirection: "row",
    alignItems: "center",
    gap: HOME_TILE_GAP,
    paddingVertical: 8,
    paddingHorizontal: 0,
  },
  pulseRows: {
    alignSelf: "stretch",
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: CONFIRM_MODAL_ACTIONS_GAP,
  },
  pulseRowText: { flex: 1, gap: STACKED_LINE_GAP, alignItems: "flex-start" },
  pulseRowTitle: {
    fontSize: FLARE_FONT_SIZE.body,
    fontFamily: FLARE_FONT_FAMILY.bold,
  },
  pulseRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: HOME_TILE_GAP,
    borderRadius: INSTRUCTION_CARD_RADIUS,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: CARD_INNER_PADDING,
    paddingHorizontal: CARD_INNER_PADDING,
    marginBottom: INSTRUCTION_CARD_HEADER_GAP,
  },
  timeline: { paddingLeft: STACKED_LINE_GAP },
  timelineRow: {
    flexDirection: "row",
    gap: CARD_INNER_PADDING,
    minHeight: 108,
  },
  timelineRail: {
    width: WELCOME_CARD_INNER_PADDING,
    alignItems: "center",
  },
  timelineDot: {
    width: CARD_INNER_PADDING,
    height: CARD_INNER_PADDING,
    borderRadius: 7,
    borderWidth: 2,
    marginTop: WELCOME_CARD_INNER_PADDING,
  },
  timelineLine: {
    flex: 1,
    width: 2,
    marginTop: STACKED_LINE_GAP,
    marginBottom: 0,
  },
  timelineCard: {
    flex: 1,
    borderRadius: INSTRUCTION_CARD_RADIUS,
    borderWidth: StyleSheet.hairlineWidth,
    padding: CARD_INNER_PADDING,
    marginBottom: CARD_SECTION_INNER_GAP,
    gap: STACKED_LINE_GAP,
  },
  timelineCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  timelineWhen: {
    fontSize: FLARE_FONT_SIZE.caption,
    fontFamily: FLARE_FONT_FAMILY.medium,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
});
