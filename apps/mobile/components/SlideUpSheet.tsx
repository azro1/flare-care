import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Keyboard,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Portal } from "../lib/overlayPortal";
import { useFlareColors } from "../theme";

const OPEN_MS = 280;
const CLOSE_MS = 200;
const DRAG_CLOSE_DISTANCE = 90;
const DRAG_CLOSE_VELOCITY = 0.8;

/**
 * Card-colored bottom sheet that slides up from the bottom over a dimmed backdrop.
 * Renders through the top-level `Portal` so it floats above the whole app. Dismiss via backdrop
 * tap or swipe-down. Content defines the height (capped at `maxHeightFraction` of the screen);
 * the sheet lifts above the keyboard when an input inside it is focused.
 */
export function SlideUpSheet({
  visible,
  onClose,
  children,
  maxHeightFraction = 0.9,
  /** Inset the sheet from the left/right screen edges (outside the card). */
  sideInset = 0,
  /** Inset the sheet from the bottom screen edge (outside the card). */
  bottomInset = 0,
}: {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  maxHeightFraction?: number;
  sideInset?: number;
  bottomInset?: number;
}) {
  const c = useFlareColors();
  const insets = useSafeAreaInsets();
  const { height: winH } = useWindowDimensions();

  const [mounted, setMounted] = useState(visible);
  const mountedRef = useRef(visible);
  const translateY = useRef(new Animated.Value(winH)).current;
  const backdrop = useRef(new Animated.Value(0)).current;
  const keyboard = useRef(new Animated.Value(0)).current;

  const animateOut = useRef((finished?: () => void) => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: winH,
        duration: CLOSE_MS,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.timing(backdrop, { toValue: 0, duration: CLOSE_MS, useNativeDriver: false }),
    ]).start(({ finished: done }) => {
      if (done) finished?.();
    });
  }).current;

  useEffect(() => {
    if (visible) {
      mountedRef.current = true;
      setMounted(true);
      translateY.setValue(winH);
      backdrop.setValue(0);
      requestAnimationFrame(() => {
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: 0,
            duration: OPEN_MS,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false,
          }),
          Animated.timing(backdrop, { toValue: 1, duration: OPEN_MS, useNativeDriver: false }),
        ]).start();
      });
      return;
    }
    if (!mountedRef.current) return;
    animateOut(() => {
      mountedRef.current = false;
      setMounted(false);
    });
  }, [visible, winH, translateY, backdrop, animateOut]);

  useEffect(() => {
    const showEvt = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvt = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSub = Keyboard.addListener(showEvt, (e) => {
      Animated.timing(keyboard, {
        toValue: e.endCoordinates?.height ?? 0,
        duration: 220,
        useNativeDriver: false,
      }).start();
    });
    const hideSub = Keyboard.addListener(hideEvt, () => {
      Animated.timing(keyboard, { toValue: 0, duration: 180, useNativeDriver: false }).start();
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [keyboard]);

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_evt, g) => g.dy > 6 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_evt, g) => {
        if (g.dy > 0) translateY.setValue(g.dy);
      },
      onPanResponderRelease: (_evt, g) => {
        if (g.dy > DRAG_CLOSE_DISTANCE || g.vy > DRAG_CLOSE_VELOCITY) {
          onClose();
          return;
        }
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: false,
          bounciness: 0,
        }).start();
      },
    }),
  ).current;

  if (!mounted) return null;

  const composedTranslate = Animated.subtract(translateY, keyboard);

  return (
    <Portal>
      <View style={StyleSheet.absoluteFillObject}>
        <Animated.View style={[StyleSheet.absoluteFillObject, { backgroundColor: c.modalBackdrop, opacity: backdrop }]}>
          <Pressable accessibilityRole="button" accessibilityLabel="Dismiss" onPress={onClose} style={StyleSheet.absoluteFillObject} />
        </Animated.View>
        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: c.card,
              maxHeight: winH * maxHeightFraction,
              paddingBottom: Math.max(insets.bottom, 24),
              left: sideInset,
              right: sideInset,
              bottom: bottomInset,
              borderBottomLeftRadius: bottomInset > 0 ? 22 : 0,
              borderBottomRightRadius: bottomInset > 0 ? 22 : 0,
              transform: [{ translateY: composedTranslate }],
            },
          ]}
        >
          <View style={styles.grabberWrap} {...pan.panHandlers}>
            <View style={[styles.grabber, { backgroundColor: c.cardBorder }]} />
          </View>
          {children}
        </Animated.View>
      </View>
    </Portal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 24,
    zIndex: 10000,
    elevation: 10000,
  },
  grabberWrap: { alignItems: "center", paddingTop: 10, paddingBottom: 8 },
  grabber: { width: 40, height: 4, borderRadius: 2 },
});
