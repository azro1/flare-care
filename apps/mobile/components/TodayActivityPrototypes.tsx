import { FLARE_CHROME_LUCIDE, FlareLucideIcon } from "../lib/flareLucideIcons";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { Pressable as GHPressable, ScrollView as GHScrollView } from "react-native-gesture-handler";
import LottieView from "lottie-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { formatUkGreetingDate } from "../lib/formatUkDate";
import { HYDRATION_ICON, HYDRATION_TARGET } from "../lib/hydrationShared";
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
import { MY_MEDS_ICON } from "../lib/medicationFeatureIcons";
import { Portal } from "../lib/overlayPortal";
import { useFlareColors } from "../theme";
// ProgressOverTimeGraph kept for a future Trends screen — not shown in this sheet.

const AnimatedGHScrollView = Animated.createAnimatedComponent(GHScrollView);

/** Hint on Meds page only — Hydration is the last Activity page (graph parked). */
const ACTIVITY_SWIPE_HINT = "Swipe for more";

const HYDRATION_ACTIVITY_LOTTIE = require("../assets/activity/hydration-bottle.json");
const MEDS_ACTIVITY_LOTTIE = require("../assets/activity/meds-pill.json");
/** Hero — enough for the jump, not a tall empty band. */
const ACTIVITY_LOTTIE_SIZE = 140;
/**
 * Activity sheet vertical rhythm (top → bottom):
 * grabber → title row → support line → Lottie → count → dots
 */
const ACTIVITY_GRABBER_BOTTOM = 20;
const ACTIVITY_TITLE_TO_SUPPORT = 10;
const ACTIVITY_HEADER_TO_HERO = 14;
const ACTIVITY_ICON_TO_COUNT = 6;
const ACTIVITY_CONTENT_TO_DOTS = 14;

/** Card score — readable, not a hero panel. */
const PULSE_SCORE_SIZE = 34;

/** Tall rectangle meter — stretches full band width. */
const PULSE_METER_HEIGHT = 132;
const PULSE_METER_RADIUS = 16;
const WAVE_AMP = 8;

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

function ActivityLottieHero({
  source,
  detail,
  detailColor,
  complete,
  completeColor,
  size = ACTIVITY_LOTTIE_SIZE,
}: {
  source: object;
  detail: string;
  detailColor: string;
  complete?: boolean;
  completeColor: string;
  size?: number;
}) {
  return (
    <View style={styles.activityHeroBlock}>
      <View style={[styles.activityLottieFrame, { width: size, height: size }]}>
        {complete ? (
          <FlareLucideIcon
            icon={FLARE_CHROME_LUCIDE.checkCircle}
            size={Math.round(size * 0.75)}
            color={completeColor}
          />
        ) : (
          <LottieView
            source={source}
            autoPlay
            loop
            style={{ width: size, height: size }}
          />
        )}
      </View>
      <Text
        style={[styles.activityHeroDetail, { color: detailColor }]}
        numberOfLines={1}
        accessibilityRole="text"
        accessibilityLabel={detail}
      >
        {detail}
      </Text>
    </View>
  );
}

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
  const [meterWidth, setMeterWidth] = useState(0);
  const clamped = Math.max(0, Math.min(1, ratio));
  const isComplete = clamped >= 1;
  const target = clamped * PULSE_METER_HEIGHT;
  /** Wave only while filling — at 100% use solid so troughs don't leave a gap at the top. */
  const showWave = meterWidth > 0 && !isComplete && target > WAVE_AMP + 2;
  const showSolid = isComplete || (target > 2 && !showWave);

  const waveCycle = meterWidth;
  const waveSvgW = waveCycle * 2;
  const waveSvgH = PULSE_METER_HEIGHT + WAVE_AMP * 2;
  const liquidFrontPath = useMemo(
    () => (waveCycle > 0 ? buildSineLiquidPath(waveSvgW, waveSvgH, WAVE_AMP, 0, 2) : ""),
    [waveCycle, waveSvgH, waveSvgW],
  );
  const liquidBackPath = useMemo(
    () => (waveCycle > 0 ? buildSineLiquidPath(waveSvgW, waveSvgH, WAVE_AMP * 0.9, Math.PI * 0.65, 2) : ""),
    [waveCycle, waveSvgH, waveSvgW],
  );

  useEffect(() => {
    Animated.timing(heightAnim, {
      toValue: target,
      duration: 750,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [heightAnim, target]);

  useEffect(() => {
    if (!showWave || waveCycle <= 0) {
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
        toValue: -waveCycle,
        duration: 2200,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    const backLoop = Animated.loop(
      Animated.timing(waveBackX, {
        toValue: -waveCycle,
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
  }, [showWave, waveBackX, waveCycle, waveFrontX]);

  return (
    <View style={styles.pulseMeterCol}>
      <View
        onLayout={(e) => {
          const w = Math.round(e.nativeEvent.layout.width);
          if (w > 0) setMeterWidth((prev) => (prev === w ? prev : w));
        }}
        style={[
          styles.pulseMeterTrack,
          {
            backgroundColor: trackColor,
            height: PULSE_METER_HEIGHT,
            borderRadius: PULSE_METER_RADIUS,
          },
        ]}
      >
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
                  { width: waveSvgW, height: waveSvgH, transform: [{ translateX: waveBackX }] },
                ]}
              >
                <Svg width={waveSvgW} height={waveSvgH}>
                  <Path d={liquidBackPath} fill={fillColor} opacity={0.42} />
                </Svg>
              </Animated.View>
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.pulseMeterWaveLayer,
                  { width: waveSvgW, height: waveSvgH, transform: [{ translateX: waveFrontX }] },
                ]}
              >
                <Svg width={waveSvgW} height={waveSvgH}>
                  <Path d={liquidFrontPath} fill={fillColor} />
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
    const hydrationLabel = `${summary.hydration} of ${HYDRATION_TARGET} cups`;
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
          <FlareLucideIcon icon={MY_MEDS_ICON} size={28} color={c.primary} />
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
          <FlareLucideIcon icon={HYDRATION_ICON} size={28} color={c.primary} />
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

/** Count-up % in its own component so the modal/Portal tree doesn’t re-render every frame. */
function CountingPercentLabel({
  visible,
  target,
  color,
  onReachFull,
}: {
  visible: boolean;
  target: number;
  color: string;
  onReachFull?: () => void;
}) {
  const [displayPct, setDisplayPct] = useState(0);
  const pctAnim = useRef(new Animated.Value(0)).current;
  const onReachFullRef = useRef(onReachFull);
  onReachFullRef.current = onReachFull;

  useEffect(() => {
    if (!visible) {
      setDisplayPct(0);
      pctAnim.setValue(0);
      return;
    }
    setDisplayPct(0);
    pctAnim.setValue(0);
    const pctListener = pctAnim.addListener(({ value }) => {
      const next = Math.round(value);
      setDisplayPct((prev) => (prev === next ? prev : next));
    });
    Animated.timing(pctAnim, {
      toValue: target,
      duration: 900,
      delay: 120,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (!finished) return;
      if (target >= 100) onReachFullRef.current?.();
    });
    return () => {
      pctAnim.stopAnimation();
      pctAnim.removeListener(pctListener);
    };
  }, [visible, target, pctAnim]);

  return <Text style={[styles.pulseHeroValue, { color }]}>{displayPct}%</Text>;
}

/** Slide-up sheet — Meds ↔ Hydration (shared %). Graph held for a future Trends screen. */
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
  const insets = useSafeAreaInsets();
  const copy = useActivityCopy(summary);
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const pagerRef = useRef<InstanceType<typeof GHScrollView> | null>(null);
  const [pagerWidth, setPagerWidth] = useState(0);
  const [scoreHeight, setScoreHeight] = useState(0);
  const [taskPageHeight, setTaskPageHeight] = useState(0);
  const [shellIndex, setShellIndex] = useState(0);
  const [mounted, setMounted] = useState(visible);
  const sheetPadH = 24;
  const pageW =
    pagerWidth > 0
      ? pagerWidth
      : Math.max(0, windowWidth - sheetPadH * 2);
  const shellPageCount = 2;

  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const sheetY = useRef(new Animated.Value(windowHeight)).current;
  const shellScrollX = useRef(new Animated.Value(0)).current;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const closingRef = useRef(false);
  const closeGenRef = useRef(0);
  const [sheetClosing, setSheetClosing] = useState(false);
  const leavingRef = useRef(leaving);
  leavingRef.current = leaving;
  const windowHeightRef = useRef(windowHeight);
  windowHeightRef.current = windowHeight;

  useEffect(() => {
    if (!leaving) return;
    // Meds/Hydration handoff — keep cover opaque; do not run a slide-down close.
    closeGenRef.current += 1;
    closingRef.current = false;
    setSheetClosing(false);
    overlayOpacity.setValue(1);
  }, [leaving, overlayOpacity]);

  /** Normal dismiss (X / backdrop / back) — animate out, then tell parent. Handoff skips this. */
  const requestClose = useCallback(() => {
    if (leavingRef.current || closingRef.current) return;
    closingRef.current = true;
    setSheetClosing(true);
    const gen = ++closeGenRef.current;
    const h = windowHeightRef.current;
    overlayOpacity.stopAnimation();
    sheetY.stopAnimation();
    Animated.parallel([
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 220,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(sheetY, {
        toValue: h,
        duration: 260,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (gen !== closeGenRef.current) return;
      closingRef.current = false;
      setSheetClosing(false);
      // Always notify parent — if `finished` were false and we skipped, an invisible
      // full-screen Pressable could keep eating taps until reload.
      onCloseRef.current();
    });
    // Failsafe if the native driver never delivers the completion callback.
    setTimeout(() => {
      if (gen !== closeGenRef.current) return;
      if (!closingRef.current) return;
      closingRef.current = false;
      setSheetClosing(false);
      onCloseRef.current();
    }, 500);
  }, [overlayOpacity, sheetY]);

  const requestCloseRef = useRef(requestClose);
  requestCloseRef.current = requestClose;

  useEffect(() => {
    if (!visible) {
      closeGenRef.current += 1;
      setMounted(false);
      closingRef.current = false;
      setSheetClosing(false);
      return;
    }

    closeGenRef.current += 1;
    closingRef.current = false;
    setSheetClosing(false);
    setMounted(true);
    setShellIndex(0);
    setTaskPageHeight(0);
    overlayOpacity.stopAnimation();
    sheetY.stopAnimation();
    overlayOpacity.setValue(0);
    sheetY.setValue(windowHeightRef.current);
    shellScrollX.setValue(0);
    requestAnimationFrame(() => {
      pagerRef.current?.scrollTo({ x: 0, animated: false });
      Animated.parallel([
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 300,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.spring(sheetY, {
          toValue: 0,
          damping: 28,
          stiffness: 260,
          mass: 0.9,
          useNativeDriver: true,
        }),
      ]).start();
    });

    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      requestCloseRef.current();
      return true;
    });
    return () => sub.remove();
    // Only re-run on open/close — not on windowHeight / requestClose identity churn.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional
  }, [visible]);

  const activities = [
    {
      id: "meds",
      ratio: copy.medsRatio,
      meterLabel: "Meds",
      title: "My Meds",
      detail: copy.medsLabel,
      icon: MY_MEDS_ICON,
      complete: copy.hasMeds && copy.medsComplete,
    },
    {
      id: "hydration",
      ratio: copy.hydrationRatio,
      meterLabel: "Water",
      title: "My Hydration",
      detail: copy.hydrationLabel,
      icon: HYDRATION_ICON,
      complete: copy.hydrationComplete,
    },
  ] as const;

  const taskIndex = shellIndex;
  const activeActivity = activities[Math.max(0, Math.min(taskIndex, activities.length - 1))];

  const pageStatusLine =
    taskIndex === 0
      ? !copy.hasMeds
        ? "No meds saved yet"
        : copy.medsComplete
          ? "All taken for today!"
          : summary.medsTaken === 0
            ? "No meds taken today"
            : "Keep going — still time today"
      : copy.hydrationComplete
        ? "All done for today!"
        : summary.hydration === 0
          ? "No water consumed today"
          : "Keep going — still time today";

  const onShellPagerEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (pageW <= 0) return;
    const next = Math.round(e.nativeEvent.contentOffset.x / pageW);
    setShellIndex(Math.max(0, Math.min(shellPageCount - 1, next)));
  };

  const renderTaskPage = (activity: (typeof activities)[number]) => (
    <View style={[styles.activityPage, { width: pageW }]}>
      <ActivityLottieHero
        source={activity.id === "meds" ? MEDS_ACTIVITY_LOTTIE : HYDRATION_ACTIVITY_LOTTIE}
        detail={activity.detail}
        detailColor={c.textSecondary}
        complete={activity.complete}
        completeColor={c.primary}
      />
    </View>
  );

  if (!mounted) return null;

  return (
    <Portal>
      <View style={styles.sheetOverlay} pointerEvents={leaving || sheetClosing ? "none" : "box-none"}>
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFillObject,
            {
              backgroundColor: c.modalBackdrop,
              opacity: overlayOpacity,
            },
          ]}
        />
        {leaving ? (
          <View
            pointerEvents="none"
            style={[StyleSheet.absoluteFillObject, { backgroundColor: c.screen }]}
          />
        ) : null}
        {leaving ? null : (
          <>
            {sheetClosing ? null : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Dismiss"
                onPress={requestClose}
                style={StyleSheet.absoluteFillObject}
              />
            )}
            <Animated.View
              style={[
                styles.sheetCard,
                {
                  backgroundColor: c.card,
                  transform: [{ translateY: sheetY }],
                },
              ]}
            >
              <View style={styles.sheetGrabberWrap}>
                <View style={[styles.sheetGrabber, { backgroundColor: c.cardBorder }]} />
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close"
                onPress={requestClose}
                hitSlop={10}
                style={styles.modalCloseBtnAbsolute}
              >
                <FlareLucideIcon icon={FLARE_CHROME_LUCIDE.close} size={22} color={c.textMuted} />
              </Pressable>

              <View
                style={styles.shellPagerWrap}
                onLayout={(e) => {
                  const w = Math.round(e.nativeEvent.layout.width);
                  if (w > 0) setPagerWidth((prev) => (prev === w ? prev : w));
                }}
              >
                {pageW > 0 ? (
                  <View style={{ width: pageW }}>
                    <View
                      pointerEvents="box-none"
                      onLayout={(e) => {
                        const h = Math.round(e.nativeEvent.layout.height);
                        if (h > 0) setScoreHeight((prev) => (prev === h ? prev : h));
                      }}
                      style={[styles.shellScoreSticky, { width: pageW }]}
                    >
                      <View style={styles.modalScoreWash}>
                        <View
                          style={styles.activityHeaderBlock}
                          accessibilityRole="header"
                          accessibilityLabel={`${activeActivity.title}. ${pageStatusLine}`}
                        >
                          <View style={styles.activityHeaderTitleRow}>
                            <Text
                              style={[styles.activityHeaderTitle, { color: c.text }]}
                              numberOfLines={1}
                            >
                              {activeActivity.title}
                            </Text>
                          </View>
                          <Text
                            style={[styles.activityHeaderEncourage, { color: c.textMuted }]}
                            numberOfLines={1}
                          >
                            {pageStatusLine}
                          </Text>
                        </View>
                      </View>
                    </View>

                    <View style={styles.activitySwipeRegion}>
                      <AnimatedGHScrollView
                        ref={pagerRef}
                        horizontal
                        pagingEnabled
                        bounces
                        overScrollMode="never"
                        decelerationRate="normal"
                        directionalLockEnabled
                        showsHorizontalScrollIndicator={false}
                        activeOffsetX={[-4, 4]}
                        failOffsetY={[-24, 24]}
                        onScroll={Animated.event(
                          [{ nativeEvent: { contentOffset: { x: shellScrollX } } }],
                          { useNativeDriver: true },
                        )}
                        scrollEventThrottle={16}
                        onMomentumScrollEnd={onShellPagerEnd}
                        onScrollEndDrag={onShellPagerEnd}
                        style={
                          taskPageHeight > 0
                            ? { width: pageW, height: taskPageHeight }
                            : { width: pageW }
                        }
                      >
                        {activities.map((activity) => (
                          <View
                            key={activity.id}
                            style={{ width: pageW }}
                            onLayout={
                              activity.id === "meds"
                                ? (e) => {
                                    const h = Math.round(e.nativeEvent.layout.height);
                                    // Grow with the real task layout (score settles late); never shrink.
                                    if (h > 0 && scoreHeight > 0) {
                                      setTaskPageHeight((prev) => (h > prev ? h : prev));
                                    }
                                  }
                                : undefined
                            }
                          >
                            {/* Sticky header clearance + step into hero. */}
                            <View style={{ height: Math.max(scoreHeight, 1) + ACTIVITY_HEADER_TO_HERO }} />
                            {renderTaskPage(activity)}
                          </View>
                        ))}
                      </AnimatedGHScrollView>

                      <View style={styles.activityFooter}>
                        <View style={styles.activityDots}>
                          {Array.from({ length: shellPageCount }, (_, index) => {
                            const active = index === shellIndex;
                            return (
                              <View
                                key={activities[index]?.id ?? index}
                                style={[
                                  styles.activityDot,
                                  active ? styles.activityDotActive : null,
                                  {
                                    backgroundColor: active
                                      ? c.primary
                                      : c.appearanceChipInactiveBg,
                                  },
                                ]}
                              />
                            );
                          })}
                        </View>
                      </View>
                      <View style={{ height: Math.max(insets.bottom, 24) }} />
                    </View>
                  </View>
                ) : null}
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
            <FlareLucideIcon icon={MY_MEDS_ICON} size={INSTRUCTION_CARD_ICON_SIZE} color={c.primary} />
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
            <FlareLucideIcon icon={HYDRATION_ICON} size={INSTRUCTION_CARD_ICON_SIZE} color={c.primary} />
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
      icon: MY_MEDS_ICON,
    },
    {
      id: "hydration",
      when: "Through the day",
      title: "Hydration",
      detail: copy.hydrationLabel,
      done: copy.hydrationComplete,
      onPress: onOpenHydration,
      icon: HYDRATION_ICON,
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
                  <FlareLucideIcon icon={beat.icon} size={20} color={c.primary} />
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
  sheetOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
    zIndex: 9999,
    elevation: 9999,
  },
  modalCard: {
    borderRadius: INSTRUCTION_CARD_RADIUS,
    borderWidth: 1,
    paddingHorizontal: INSTRUCTION_CARD_PADDING_H,
    paddingTop: 16,
    paddingBottom: 24,
    gap: 12,
    overflow: "hidden",
  },
  /** Match sign-in legal consent sheet chrome (full-bleed, top radius only). */
  sheetCard: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 24,
    paddingTop: 0,
    paddingBottom: 0,
    gap: 0,
    overflow: "hidden",
  },
  sheetGrabberWrap: {
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: ACTIVITY_GRABBER_BOTTOM,
  },
  sheetGrabber: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  modalScoreWash: {
    alignSelf: "stretch",
  },
  activityHeaderBlock: {
    alignSelf: "stretch",
    alignItems: "center",
    gap: ACTIVITY_TITLE_TO_SUPPORT,
    paddingHorizontal: 36,
    paddingTop: 8,
    paddingBottom: 0,
  },
  activityHeaderTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    maxWidth: "100%",
  },
  activityHeaderTitle: {
    fontSize: FLARE_FONT_SIZE.sectionTitle,
    lineHeight: FLARE_LINE_HEIGHT.sectionTitle,
    fontFamily: FLARE_FONT_FAMILY.extrabold,
    textAlign: "center",
  },
  activityHeaderEncourage: {
    fontSize: FLARE_FONT_SIZE.subhead,
    lineHeight: FLARE_LINE_HEIGHT.subhead,
    fontFamily: FLARE_FONT_FAMILY.medium,
    textAlign: "center",
  },
  activityHeroBlock: {
    alignItems: "center",
    gap: ACTIVITY_ICON_TO_COUNT,
  },
  activityHeroDetail: {
    fontSize: FLARE_FONT_SIZE.subhead,
    lineHeight: FLARE_LINE_HEIGHT.subhead,
    fontFamily: FLARE_FONT_FAMILY.medium,
    textAlign: "center",
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
  modalCloseBtnAbsolute: {
    position: "absolute",
    top: 14,
    right: 18,
    zIndex: 2,
    padding: 2,
  },
  shellPagerWrap: {
    alignSelf: "stretch",
  },
  shellScoreSticky: {
    position: "absolute",
    top: 0,
    left: 0,
    zIndex: 2,
  },
  activitySwipeRegion: {
    alignSelf: "stretch",
    position: "relative",
    overflow: "visible",
    gap: ACTIVITY_CONTENT_TO_DOTS,
  },
  activityTaskBandPad: {
    paddingTop: 0,
  },
  activitySwipeBand: {
    alignSelf: "stretch",
    // Bleed to sheet edges / bottom so the wash is one strip to the card edge.
    marginHorizontal: -20,
    marginTop: 4,
    marginBottom: 0,
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  activityPagerWrap: {
    alignSelf: "stretch",
  },
  activityPage: {
    alignItems: "center",
  },
  activityFooter: {
    alignItems: "center",
    paddingTop: 0,
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
    alignSelf: "stretch",
    alignItems: "center",
    justifyContent: "center",
  },
  pulseMeterCol: { alignSelf: "stretch", alignItems: "center", gap: 6 },
  activityLottieFrame: {
    width: ACTIVITY_LOTTIE_SIZE,
    height: ACTIVITY_LOTTIE_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  pulseMeterTrack: {
    alignSelf: "stretch",
    width: "100%",
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  pulseMeterFill: {
    width: "100%",
    overflow: "hidden",
  },
  pulseMeterWaveLayer: {
    position: "absolute",
    top: 0,
    left: 0,
  },
  pulseMeterCaption: {
    fontSize: FLARE_FONT_SIZE.subhead,
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
    paddingTop: 2,
    paddingBottom: 4,
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
  pulseRowTitleRow: {
    flexDirection: "row",
    alignItems: "baseline",
    flexWrap: "wrap",
    gap: CARD_INNER_PADDING,
    width: "100%",
    justifyContent: "space-between",
  },
  pulseRowTitle: {
    fontSize: FLARE_FONT_SIZE.body,
    fontFamily: FLARE_FONT_FAMILY.bold,
  },
  pulseRowTapHint: {
    fontSize: 10,
    lineHeight: 14,
    fontFamily: FLARE_FONT_FAMILY.regular,
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
