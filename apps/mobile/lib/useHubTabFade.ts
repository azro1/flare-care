import { useCallback, useMemo, useRef, useState } from "react";
import { Animated, Easing, StyleSheet } from "react-native";

const FADE_MS = 220;

/**
 * Hub tabs: tap to crossfade (panes stay mounted — no empty blink).
 * Chrome (`tabIndex`) updates immediately; layout driver swaps after the fade.
 */
export function useHubTabFade(initialIndex = 0, tabCount = 2) {
  const count = Math.max(1, tabCount);
  const clampedInitial = Math.max(0, Math.min(count - 1, initialIndex));
  const [tabIndex, setTabIndex] = useState(clampedInitial);
  const [layoutIndex, setLayoutIndex] = useState(clampedInitial);
  const opacities = useRef(
    Array.from({ length: count }, (_, i) => new Animated.Value(i === clampedInitial ? 1 : 0)),
  ).current;
  const busy = useRef(false);
  const tabIndexRef = useRef(tabIndex);
  tabIndexRef.current = tabIndex;

  const goToTab = useCallback(
    (index: number, instant = false) => {
      const next = Math.max(0, Math.min(count - 1, index));
      if (next === tabIndexRef.current) return;

      const snap = () => {
        setTabIndex(next);
        setLayoutIndex(next);
        opacities.forEach((opacity, i) => opacity.setValue(i === next ? 1 : 0));
        busy.current = false;
      };

      if (instant) {
        busy.current = false;
        opacities.forEach((opacity) => opacity.stopAnimation());
        snap();
        return;
      }
      if (busy.current) return;
      busy.current = true;
      setTabIndex(next);
      Animated.parallel(
        opacities.map((opacity, i) =>
          Animated.timing(opacity, {
            toValue: i === next ? 1 : 0,
            duration: FADE_MS,
            easing: Easing.inOut(Easing.cubic),
            useNativeDriver: true,
          }),
        ),
      ).start(({ finished }) => {
        if (!finished) {
          busy.current = false;
          return;
        }
        setLayoutIndex(next);
        busy.current = false;
      });
    },
    [count, opacities],
  );

  const paneStyle = useMemo(
    () =>
      opacities.map((opacity, index) => [
        hubTabFadeStyles.pane,
        { opacity, zIndex: tabIndex === index ? 1 : 0 },
        layoutIndex !== index ? hubTabFadeStyles.paneInactive : null,
      ]),
    [opacities, tabIndex, layoutIndex],
  );

  return { tabIndex, goToTab, paneStyle };
}

export const hubTabFadeStyles = StyleSheet.create({
  stack: {
    position: "relative",
    width: "100%",
  },
  pane: {
    width: "100%",
  },
  /** Keep inactive pane painted for crossfade without affecting layout height. */
  paneInactive: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
  },
});
