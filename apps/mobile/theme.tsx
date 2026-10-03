import { darkTheme as darkTokens, lightTheme as lightTokens } from "@expo/styleguide-base";
import type { Theme as NavTheme } from "@react-navigation/native";
import { DarkTheme as NavDark, DefaultTheme as NavLight } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const APPEARANCE_STORAGE_KEY = "flarecare.appearance.preference";

/**
 * Midnight Lagoon palette — teal-cyan primary replaces cadet blue.
 * Used for CTAs, active tabs, nav tint, progress indicators.
 */
const MIDNIGHT_LAGOON_ACCENT = {
  dark: {
    primary: "#14A39A",
    link: "#5FD4CB",
    accent: "#FF7A59",
  },
  light: {
    primary: "#0E7C7B",
    link: "#0B6A69",
    accent: "#F0603F",
  },
} as const;

/** Brand primary for custom UI components (action sheets, etc.). */
export const MOBILE_BRAND_PRIMARY = MIDNIGHT_LAGOON_ACCENT.light.primary;

/** Danger red — Delete account link text + that modal’s Delete button only. */
export const MOBILE_DESTRUCTIVE_FILL = "#dc2626" as const;

/** Midnight Lagoon backgrounds. */
const MIDNIGHT_LAGOON_BG = {
  dark: {
    screen: "#0A1015",
    card: "#16222B",
    tray: "#0F181F",
    border: "#2A3A46",
  },
  light: {
    screen: "#F2F6F7",
    card: "#FFFFFF",
    tray: "#EAF1F2",
    border: "#D3E0E3",
  },
} as const;

/** In-app theme: fixed light or dark (no OS follow mode). */
export type AppearancePreference = "light" | "dark";

type StyleguideTheme = typeof lightTokens;

/**
 * Midnight Lagoon color system for Flarecare mobile.
 * All components must use these tokens via `useFlareColors()`.
 */
export type FlareColors = {
  isDark: boolean;
  screen: string;
  card: string;
  cardBorder: string;
  tray: string;
  primary: string;
  link: string;
  accent: string;
  text: string;
  textSecondary: string;
  danger: string;
  destructiveFill: string;
  inputBg: string;
  inputBorder: string;
  secondaryBtnBg: string;
  secondaryBtnBorder: string;
  secondaryBtnText: string;
  white: string;
  appearanceChipInactiveBg: string;
  appearanceChipInactiveText: string;
  modalBackdrop: string;
  instructionScrim: string;
};

function mapTokens(_t: StyleguideTheme, isDark: boolean): FlareColors {
  const bg = isDark ? MIDNIGHT_LAGOON_BG.dark : MIDNIGHT_LAGOON_BG.light;
  const colors = isDark ? MIDNIGHT_LAGOON_ACCENT.dark : MIDNIGHT_LAGOON_ACCENT.light;
  const textColors = {
    dark: { main: "#EAF2F5", secondary: "#93A7B3" },
    light: { main: "#0D234B", secondary: "#4F5D6E" },
  };
  const text = isDark ? textColors.dark : textColors.light;

  return {
    isDark,
    screen: bg.screen,
    card: bg.card,
    cardBorder: bg.border,
    tray: bg.tray,
    primary: colors.primary,
    link: colors.link,
    accent: colors.accent,
    text: text.main,
    textSecondary: text.secondary,
    danger: isDark ? "#F87171" : "#C81E1E",
    destructiveFill: MOBILE_DESTRUCTIVE_FILL,
    inputBg: bg.tray,
    inputBorder: bg.border,
    secondaryBtnBg: bg.tray,
    secondaryBtnBorder: bg.border,
    secondaryBtnText: text.main,
    white: "#ffffff",
    appearanceChipInactiveBg: isDark ? "#ffffff" : bg.screen,
    appearanceChipInactiveText: isDark ? "#121212" : text.main,
    modalBackdrop: isDark ? "rgba(0,0,0,0.78)" : "rgba(15,23,42,0.48)",
    instructionScrim: isDark ? "rgba(0,0,0,1)" : "rgba(15,23,42,0.30)",
  };
}

function navigationTheme(colors: FlareColors, _t: StyleguideTheme): NavTheme {
  const base = colors.isDark ? NavDark : NavLight;
  return {
    ...base,
    colors: {
      ...base.colors,
      primary: colors.primary,
      background: colors.screen,
      card: colors.card,
      text: colors.text,
      border: colors.cardBorder,
      notification: colors.primary,
    },
  };
}

type FlareThemeContextValue = {
  colors: FlareColors;
  tokens: StyleguideTheme;
  nav: NavTheme;
  appearancePreference: AppearancePreference;
  /** False until first persisted appearance read finishes — avoids auth/splash layout flash on cold start. */
  appearanceHydrated: boolean;
  setAppearancePreference: (pref: AppearancePreference) => Promise<void>;
};

const FlareThemeCtx = createContext<FlareThemeContextValue | null>(null);

export function FlareThemeProvider({ children }: { children: React.ReactNode }) {
  const [appearancePreference, setAppearancePreferenceState] = useState<AppearancePreference>("light");
  const [appearanceHydrated, setAppearanceHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(APPEARANCE_STORAGE_KEY);
        if (cancelled) return;
        if (raw === "light" || raw === "dark") {
          setAppearancePreferenceState(raw);
        } else if (raw === "system") {
          setAppearancePreferenceState("dark");
          await AsyncStorage.setItem(APPEARANCE_STORAGE_KEY, "dark");
        }
      } catch {
        // ignore read errors
      } finally {
        if (!cancelled) setAppearanceHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setAppearancePreference = useCallback(async (pref: AppearancePreference) => {
    setAppearancePreferenceState(pref);
    try {
      await AsyncStorage.setItem(APPEARANCE_STORAGE_KEY, pref);
    } catch {
      // ignore write errors
    }
  }, []);

  const isDark = appearancePreference === "dark";
  const tokens = useMemo(() => (isDark ? darkTokens : lightTokens), [isDark]);

  const value = useMemo(() => {
    const colors = mapTokens(tokens, isDark);
    const nav = navigationTheme(colors, tokens);
    return { colors, tokens, nav, appearancePreference, appearanceHydrated, setAppearancePreference };
  }, [appearancePreference, appearanceHydrated, isDark, setAppearancePreference, tokens]);

  return <FlareThemeCtx.Provider value={value}>{children}</FlareThemeCtx.Provider>;
}

/** Safe default when used outside provider — light palette; setter is a no-op. */
export function useFlareTheme(): FlareThemeContextValue {
  const ctx = useContext(FlareThemeCtx);
  if (ctx) return ctx;
  const tokens = lightTokens;
  const colors = mapTokens(tokens, false);
  const noop = async () => {};
  return {
    colors,
    tokens,
    nav: navigationTheme(colors, tokens),
    appearancePreference: "light",
    appearanceHydrated: true,
    setAppearancePreference: noop,
  };
}

export function useFlareColors(): FlareColors {
  return useFlareTheme().colors;
}
