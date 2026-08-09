import "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import * as WebBrowser from "expo-web-browser";
import Constants from "expo-constants";
import { makeRedirectUri } from "expo-auth-session";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_700Bold, Inter_800ExtraBold } from "@expo-google-fonts/inter";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import {
  NavigationContainer,
  useFocusEffect,
  useNavigation,
  useNavigationContainerRef,
  useRoute,
  type NavigationContainerRef,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import {
  ActivityIndicator,
  AppState,
  Image,
  InteractionManager,
  Keyboard,
  Linking,
  Modal,
  Platform,
  Pressable,
  StyleProp,
  StyleSheet,
  Switch,
  Text,
  useWindowDimensions,
  View,
  ViewStyle,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { ScrollView } from "./lib/scrollViews";
import { SafeAreaProvider, initialWindowMetrics, useSafeAreaInsets } from "react-native-safe-area-context";
import {
  FLARE_BUTTON_BORDER_RADIUS,
  FLARE_BUTTON_MIN_HEIGHT,
  FLARE_BUTTON_PADDING_H,
  PrimaryButton,
  SecondaryButton,
} from "./components/FlareButton";
import { DashboardWelcomeCard } from "./components/DashboardWelcomeCard";
import { InstructionCardOverlay } from "./components/InstructionCardOverlay";
import { FloatingWelcomeCard } from "./components/FloatingWelcomeCard";
import { HydrationProgressRing } from "./components/HydrationProgressRing";
import { HydrationStepper } from "./components/HydrationStepper";
import { InstructionScreenShell, InstructionInteractionBlock } from "./components/InstructionScreenShell";
import { flareFieldErrorStyle, LabeledInput } from "./components/FlareInput";
import { flareCardSectionStyles, FlareScreenSectionTitle } from "./components/FlareScreenSectionTitle";
import { HeaderOverflowMenu } from "./components/HeaderOverflowMenu";
import { NewsFeedCard, newsFeedListStyles } from "./components/NewsFeed";
import { SuccessNoticeScreen } from "./components/SuccessNoticeScreen";
import { ConfirmModal } from "./components/ConfirmModal";
import { FlareAlertHost, showFlareAlert } from "./components/FlareAlertHost";
import { OverlayOutlet } from "./lib/overlayPortal";
import { SlideUpSheet } from "./components/SlideUpSheet";
import { BiometricLockScreen } from "./components/BiometricLockScreen";
import { authenticate, biometricTypeLabel, isBiometricAvailable, readLockEnabled, setLockEnabled } from "./lib/biometricLock";
import { CollapsingTitleScrollScreen } from "./components/CollapsingTitleScrollScreen";
import { FlareThemeProvider, useFlareColors, useFlareTheme } from "./theme";
import { formatUkDate, formatUkGreetingDate } from "./lib/formatUkDate";
import { BOWEL_FEATURE_MCI_ICON, todayYmd } from "./lib/bowelMovementShared";
import { handleListExpansionNavigationRouteChange } from "./lib/listExpansionNavigation";
import { ListSelectionChromeProvider, useListSelectionChrome } from "./lib/listSelectionChrome";
import { useLogListSelection } from "./lib/useLogListSelection";
import { MY_MEDS_MCI_ICON, TRACK_MEDICATIONS_MCI_ICON } from "./lib/medicationFeatureIcons";
import { fetchMedicationsForUser } from "./lib/medicationShared";
import { recordRecentActivityEvent } from "./lib/recentActivityEvents";
import {
  NUTRITION_CATEGORIES,
  NUTRITION_GUIDE_INTRO,
  NUTRITION_GUIDE_NOTE,
  NUTRITION_HELPFUL_TIPS,
  NUTRITION_IBD_AVOID_FLARE,
  NUTRITION_IBD_CAREFUL,
  NUTRITION_IBD_SAFE,
  NUTRITION_QUICK_TIPS,
} from "./lib/nutritionGuideCopy";
import { HYDRATION_TARGET, HYDRATION_MCI_ICON, saveHydrationReset } from "./lib/hydrationShared";
import {
  bottomTabBarHeight,
  ACCOUNT_LIST_ROW_PADDING,
  CARD_INNER_PADDING,
  CARD_SECTION_INNER_GAP,
  TODAY_GOALS_ROW_PADDING,
  bottomTabBarScrollInset,
  FLARE_FONT_FAMILY,
  FLARE_FONT_SIZE,
  FLARE_LINE_HEIGHT,
  HOME_TILE_GAP,
  SCREEN_EDGE_PADDING,
  FULL_WIDTH_CTA_EDGE_PADDING,
  SECTION_TITLE_MARGIN_BOTTOM,
  SECTION_TITLE_MARGIN_TOP,
  WIZARD_LANDING_BELOW_SAFE_TOP,
  WIZARD_LANDING_BLOCK_PADDING_BOTTOM,
  wizardLandingMinHeight,
} from "./lib/layoutConstants";
import {
  formatOtpCountdown,
  OTP_MAX_RESENDS,
  otpRemainingSeconds,
  otpResendErrorMessage,
  otpVerifyErrorMessage,
} from "./lib/otpAuth";
import { LegalDocumentView, type LegalDocumentKind } from "./components/LegalDocumentView";
import {
  LogHistoryList,
  LogHistoryPreviewList,
  LogHistoryListLoading,
  LogHistoryCard,
  LogHistoryEmptyState,
  buildBrowseLogRowItem,
  buildTimestampLogRowItem,
  logHistoryCardStyles,
  logHistoryListStyles,
} from "./components/LogHistoryList";
import {
  LogDetailAddedHeader,
  LogDetailFieldGroup,
  LogDetailFieldGroups,
  LogDetailNotesCard,
  LogDetailSectionCard,
  logDetailStyles,
} from "./components/LogDetailLayout";
import { formatAddedAtHeader } from "./lib/logDisplay";
import { useWizardLogHistory } from "./lib/wizardLogHistory";
import { openAppNotificationSettings } from "./lib/openAppNotificationSettings";
import {
  clearCachedReminderStatus,
  getCachedReminderStatus,
  hydrateReminderStatusCache,
  setCachedReminderStatus,
} from "./lib/reminderStatusCache";
import {
  REMINDERS_READY_BODY,
  REMINDERS_READY_NONE,
  REMINDERS_SETUP_INTRO_OFF,
} from "./lib/reminderSetupCopy";
import { supabase, TABLES } from "./lib/supabase";
import {
  dashboardSnapshotByUserId,
  dedupeNewsItems,
  invalidateDashboardSnapshot,
  type DashboardNewsItem,
  type DashboardSnapshot,
} from "./lib/dashboardSnapshotCache";
import {
  isNewAuthUser,
  markDashboardWelcomeDismissed,
  readDashboardWelcomeDismissed,
  readDashboardWelcomeEligible,
} from "./lib/dashboardWelcome";
import { markNewAccountInstructionTipsEligible } from "./lib/newAccountInstructionTips";
import { DASHBOARD_NEWS_HOME_SHELF_MAX, DASHBOARD_NEWS_SHELF_PEEK, dashboardNewsShelfCardWidth } from "./lib/newsShared";
import {
  REPORTS_INSTRUCTION,
  HYDRATION_INSTRUCTION,
  LOGS_INSTRUCTION,
  SYMPTOM_LOGS_HISTORY_INSTRUCTION,
  MEDICATION_LOGS_HISTORY_INSTRUCTION,
} from "./lib/instructionCardCopy";
import {
  markReportsInstructionDismissed,
  readReportsInstructionDismissed,
  readReportsInstructionEligible,
} from "./lib/reportsInstructionTip";
import {
  markLogsInstructionDismissed,
  readLogsInstructionDismissed,
  readLogsInstructionEligible,
} from "./lib/logsInstructionTip";
import {
  markSymptomHistoryInstructionDismissed,
  readSymptomHistoryInstructionDismissed,
  readSymptomHistoryInstructionEligible,
} from "./lib/symptomHistoryInstructionTip";
import {
  markMedicationHistoryInstructionDismissed,
  readMedicationHistoryInstructionDismissed,
  readMedicationHistoryInstructionEligible,
} from "./lib/medicationHistoryInstructionTip";
import {
  markHydrationInstructionDismissed,
  readHydrationInstructionDismissed,
  readHydrationInstructionEligible,
} from "./lib/hydrationInstructionTip";
import { useInstructionTip } from "./lib/useInstructionTip";
/** Bowel UI lives in `screens/BowelScreen.tsx` — do not re-declare `BowelScreen` in this file. */
import { BristolGuideScreen } from "./screens/BristolGuideScreen";
import { BowelLogDetailScreen } from "./screens/BowelLogDetailScreen";
import { BowelScreen } from "./screens/BowelScreen";
import { MedicationDetailScreen } from "./screens/MedicationDetailScreen";
import { MedicationsScreen } from "./screens/MedicationsScreen";
import { WeightLogDetailScreen } from "./screens/WeightLogDetailScreen";
import { WeightScreen } from "./screens/WeightScreen";
import { WellbeingScreen } from "./screens/WellbeingScreen";
import { WellbeingLogDetailScreen } from "./screens/WellbeingLogDetailScreen";
import { WellbeingWizardScreen } from "./screens/WellbeingWizardScreen";
import { LatestNewsScreen } from "./screens/LatestNewsScreen";
import { AppointmentBriefChangesScreen } from "./screens/AppointmentBriefChangesScreen";
import { AppointmentBriefCustomRangeScreen } from "./screens/AppointmentBriefCustomRangeScreen";
import { AppointmentBriefHealthScreen } from "./screens/AppointmentBriefHealthScreen";
import { AppointmentBriefNextScreen } from "./screens/AppointmentBriefNextScreen";
import { AppointmentBriefResultScreen } from "./screens/AppointmentBriefResultScreen";
import { AppointmentBriefScreen } from "./screens/AppointmentBriefScreen";
import { AppointmentDetailScreen } from "./screens/AppointmentDetailScreen";
import { AppointmentsPastScreen } from "./screens/AppointmentsPastScreen";
import { AppointmentsScreen } from "./screens/AppointmentsScreen";
import {
  clearMedicationNotificationsForUser,
  ensureLocalReminderNotificationsReady,
  getLocalReminderScheduledCount,
  rescheduleLocalRemindersIfGranted,
} from "./lib/medicationNotifications";
import {
  consumeReminderNotificationResponse,
  markReminderNotificationResponseHandled,
  navigateFromReminderNotification,
  wasReminderNotificationResponseHandled,
} from "./lib/reminderNotificationNavigation";
import { MedicationTrackingWizardScreen } from "./screens/MedicationTrackingWizardScreen";
import { SymptomLogWizardScreen } from "./screens/SymptomLogWizardScreen";

WebBrowser.maybeCompleteAuthSession();
let Notifications: any = null;
let Device: any = null;
try {
  const isExpoGo = Constants.appOwnership === "expo";
  if (!isExpoGo) {
    Notifications = require("expo-notifications");
    Device = require("expo-device");
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
    void ensureLocalReminderNotificationsReady();
  }
} catch {
  // Expo Go on Android SDK53+ does not support remote push API.
}

/** App mark: `fclogo_trans_splash.png` only (readable on dark UI and on primary blue “wells” in light). */
const SPLASH_MARK_IMAGE = require("./assets/fclogo_trans_splash.png");

type SessionUser = {
  id: string;
  email?: string | null;
  displayName?: string | null;
  accountCreatedAt?: string | null;
  signInMethodLabel?: string | null;
};

const AUTH_PROVIDER_LABELS: Record<string, string> = {
  google: "Google",
  apple: "Apple",
  email: "Email OTP",
};

function signInMethodLabelFromAuthUser(u: {
  identities?: { provider: string }[] | null;
  app_metadata?: Record<string, unknown> | null;
}): string | null {
  const providers = new Set((u.identities ?? []).map((i) => i.provider).filter(Boolean));
  const legacy = typeof u.app_metadata?.provider === "string" ? u.app_metadata.provider : null;
  if (legacy) providers.add(legacy);

  const ordered = ["google", "apple", "email"] as const;
  const labels = ordered.filter((p) => providers.has(p)).map((p) => AUTH_PROVIDER_LABELS[p]);
  if (labels.length) return labels.join(", ");

  const fallback = [...providers][0];
  return fallback ? fallback.charAt(0).toUpperCase() + fallback.slice(1) : null;
}

function sessionUserFromSupabaseAuthUser(u: {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
  created_at?: string;
  identities?: { provider: string }[] | null;
  app_metadata?: Record<string, unknown> | null;
}): SessionUser {
  return {
    id: u.id,
    email: u.email ?? null,
    displayName: (u.user_metadata?.full_name as string | undefined) || (u.user_metadata?.name as string | undefined) || null,
    accountCreatedAt: u.created_at ?? null,
    signInMethodLabel: signInMethodLabelFromAuthUser(u),
  };
}

function profileDisplayName(user: SessionUser | null | undefined): string | null {
  const name = user?.displayName?.trim();
  return name || null;
}

function profileNeedsSetup(user: SessionUser): boolean {
  return !profileDisplayName(user);
}

function firstNameFromSessionUser(user: SessionUser): string {
  const name = profileDisplayName(user);
  if (!name) return "there";
  return name.split(/\s+/).filter(Boolean)[0] ?? "there";
}

function accountIdentityFirstLine(user: SessionUser): string {
  const first = firstNameFromSessionUser(user);
  return first === "there" ? "You" : first;
}

function Card({
  title,
  children,
  style,
  plain,
  compactBody,
  bordered,
}: {
  title: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** No filled panel — sits on screen background (e.g. login). */
  plain?: boolean;
  /** Stack rows flush (e.g. account option list) — no `cardBody` gap between children. */
  compactBody?: boolean;
  /** 1px Expo `border.default` — omit on panels that wrap horizontal scroll rows. */
  bordered?: boolean;
}) {
  const c = useFlareColors();
  return (
    <View
      style={[
        styles.card,
        style,
        plain
          ? { backgroundColor: "transparent", marginBottom: 0 }
          : {
              backgroundColor: c.card,
              ...(bordered ? { borderWidth: 1, borderColor: c.cardBorder } : null),
            },
      ]}
    >
      {title ? <Text style={[styles.cardTitle, { color: c.text }]}>{title}</Text> : null}
      {
        /** Auth `plain` card uses `flex:1` panels; skipping `cardBody` keeps flex layout valid (nested non-flex wrappers collapse children). */
        plain ? children : (
          <View style={[styles.cardBody, compactBody && styles.cardBodyCompact]}>{children}</View>
        )}
    </View>
  );
}

async function deleteUserLogRow(
  table: string,
  id: string,
  userId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!id) return { ok: false, message: "Missing entry id." };
  const { error } = await supabase.from(table).delete().eq("id", id).eq("user_id", userId);
  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

async function deleteUserLogRows(
  table: string,
  ids: string[],
  userId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (ids.length === 0) return { ok: true };
  const { error } = await supabase.from(table).delete().eq("user_id", userId).in("id", ids);
  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

function DetailDeleteHeaderButton({ onPress, disabled }: { onPress: () => void; disabled?: boolean }) {
  const c = useFlareColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Delete entry"
      onPress={onPress}
      disabled={disabled}
      hitSlop={10}
      style={styles.headerDeleteButton}
    >
      <MaterialCommunityIcons name="trash-can-outline" size={22} color={c.textMuted} accessibilityIgnoresInvertColors />
    </Pressable>
  );
}

function SplashScreen() {
  const c = useFlareColors();
  return (
    <View style={[styles.splashScreen, { backgroundColor: c.screen }]}>
      <View style={styles.splashLogoStage}>
        {c.isDark ? (
          <Image source={SPLASH_MARK_IMAGE} style={styles.splashLogo} resizeMode="contain" />
        ) : (
          <View style={[styles.splashLogoMarkWell, { backgroundColor: c.primary }]}>
            <Image source={SPLASH_MARK_IMAGE} style={styles.splashLogo} resizeMode="contain" />
          </View>
        )}
      </View>
    </View>
  );
}

type SignOutReason = "logout" | "account_deleted";

const SIGN_OUT_COPY: Record<SignOutReason, { title: string; message: string }> = {
  logout: {
    title: "You've been logged out",
    message: "Your session has ended.",
  },
  account_deleted: {
    title: "Account Deleted",
    message: "Your account and associated data have been permanently deleted.",
  },
};

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error(`${label} timed out`)), ms);
      }),
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

/** Best-effort Expo push token + server subscribe — local reminders do not depend on this. */
async function registerExpoPushTokenBestEffort(): Promise<void> {
  if (!Notifications) return;
  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  const tokenResult = await withTimeout<{ data: string }>(
    projectId
      ? Notifications.getExpoPushTokenAsync({ projectId })
      : Notifications.getExpoPushTokenAsync(),
    15000,
    "Push token",
  );
  const pushToken = tokenResult.data;
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  const base = process.env.EXPO_PUBLIC_WEB_API_BASE_URL;
  if (accessToken && base) {
    const response = await withTimeout(
      fetch(`${base}/api/push/subscribe`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          expo_push_token: pushToken,
          user_agent: `expo-${Platform.OS}`,
        }),
      }),
      10000,
      "Push subscribe",
    );
    if (!response.ok) {
      throw new Error(`Push subscribe failed (${response.status})`);
    }
  }
  await AsyncStorage.setItem("flarecare.pushToken", pushToken);
}

function AuthScreen({
  onSignedIn,
  onAuthBusy,
}: {
  onSignedIn: (u: SessionUser) => void;
  /** Hide login while OAuth completes after browser closes (avoids flash). */
  onAuthBusy?: (busy: boolean) => void;
}) {
  const cAuth = useFlareColors();
  const insets = useSafeAreaInsets();
  const [activeAuthAction, setActiveAuthAction] = useState<"email" | "code" | "google" | "resend" | null>(null);
  const [step, setStep] = useState<"method" | "email" | "code">("method");
  const [otpSentAt, setOtpSentAt] = useState<number | null>(null);
  const [otpResendCount, setOtpResendCount] = useState(0);
  const [otpTick, setOtpTick] = useState(0);
  const [legalAccepted, setLegalAccepted] = useState(false);
  const [authLegalModal, setAuthLegalModal] = useState<LegalDocumentKind | null>(null);
  const emailSchema = useMemo(
    () =>
      yup.object({
        email: yup.string().required("Email is required").email("Enter a valid email"),
      }),
    [],
  );
  const codeSchema = useMemo(
    () =>
      yup.object({
        otpCode: yup
          .string()
          .required("Code is required")
          .matches(/^\d{6}$/, "Code must be 6 digits"),
      }),
    [],
  );

  const {
    control: emailControl,
    handleSubmit: handleEmailSubmit,
    getValues: getEmailValues,
    formState: { errors: emailErrors },
  } = useForm<{ email: string }>({
    defaultValues: { email: "" },
    resolver: yupResolver(emailSchema),
    mode: "onSubmit",
  });

  const {
    control: codeControl,
    handleSubmit: handleCodeSubmit,
    getValues: getCodeValues,
    reset: resetCode,
    formState: { errors: codeErrors },
  } = useForm<{ otpCode: string }>({
    defaultValues: { otpCode: "" },
    resolver: yupResolver(codeSchema),
    mode: "onSubmit",
  });

  const clearOtpSession = useCallback(() => {
    setOtpSentAt(null);
    setOtpResendCount(0);
  }, []);

  const sendOtpToEmail = useCallback(async (email: string) => {
    const redirectTo = makeRedirectUri({ path: "auth/callback" });
    return supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo } });
  }, []);

  useEffect(() => {
    if (step !== "code" || otpSentAt == null) return;
    const id = setInterval(() => setOtpTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [otpSentAt, step]);

  const otpRemaining = useMemo(
    () => otpRemainingSeconds(otpSentAt, Date.now()),
    // otpTick drives once-per-second refresh while on code step
    [otpSentAt, otpTick],
  );
  const otpExpired = otpSentAt != null && otpRemaining <= 0;
  const canResendOtp = otpExpired && otpResendCount < OTP_MAX_RESENDS && activeAuthAction === null;
  const resendLimitReached = otpExpired && otpResendCount >= OTP_MAX_RESENDS;

  const sendMagicLink = async ({ email }: { email: string }) => {
    setActiveAuthAction("email");
    const { error } = await sendOtpToEmail(email);
    setActiveAuthAction(null);
    if (error) {
      showFlareAlert("Sign in failed", otpResendErrorMessage(error.message));
      return;
    }
    setOtpResendCount(0);
    setOtpSentAt(Date.now());
    setStep("code");
    showFlareAlert(
      "Check your email",
      "We've sent a 6-digit code to the email you entered. It may take a minute to arrive.",
    );
  };

  const resendOtpCode = async () => {
    if (!canResendOtp) return;
    const email = getEmailValues("email");
    if (!email) {
      showFlareAlert("Missing email", "Please enter your email first.");
      setStep("email");
      clearOtpSession();
      return;
    }
    setActiveAuthAction("resend");
    const { error } = await sendOtpToEmail(email);
    setActiveAuthAction(null);
    if (error) {
      showFlareAlert("Could not resend code", otpResendErrorMessage(error.message));
      return;
    }
    setOtpResendCount((n) => n + 1);
    setOtpSentAt(Date.now());
    resetCode({ otpCode: "" });
    showFlareAlert("New code sent", "We've sent a new 6-digit code to your email.");
  };

  const verifyOtpCode = async ({ otpCode }: { otpCode: string }) => {
    const email = getEmailValues("email");
    if (!email) {
      showFlareAlert("Missing email", "Please enter your email first.");
      setStep("email");
      clearOtpSession();
      return;
    }
    setActiveAuthAction("code");
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: otpCode.trim(),
      type: "email",
    });
    setActiveAuthAction(null);
    if (error) {
      showFlareAlert("Code verification failed", otpVerifyErrorMessage(error.message));
      return;
    }
    clearOtpSession();
    const user = data.user;
    if (user) {
      if (isNewAuthUser(user)) {
        await markNewAccountInstructionTipsEligible(user.id);
      }
      onSignedIn(sessionUserFromSupabaseAuthUser(user));
    }
  };

  const signInGoogle = async () => {
    setActiveAuthAction("google");
    const redirectTo = makeRedirectUri({ path: "auth/callback" });
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo, skipBrowserRedirect: true },
    });
    if (error) {
      setActiveAuthAction(null);
      showFlareAlert("Google sign in failed", error.message);
      return;
    }
    if (!data?.url) {
      setActiveAuthAction(null);
      showFlareAlert("Google sign in failed", "Missing auth URL.");
      return;
    }
    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type === "success" && result.url) {
      onAuthBusy?.(true);
      try {
        // Supabase may return either ?code=... or #access_token=...&refresh_token=...
        const parsedUrl = new URL(result.url);
        const queryCode = parsedUrl.searchParams.get("code");

        const hash = (parsedUrl.hash || "").replace(/^#/, "");
        const hashParams = new URLSearchParams(hash);
        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");

        if (queryCode) {
          await supabase.auth.exchangeCodeForSession(queryCode);
        } else if (accessToken && refreshToken) {
          await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
        }
        const { data: sessionData } = await supabase.auth.getSession();
        const sessionUser = sessionData.session?.user;
        if (sessionUser) {
          if (isNewAuthUser(sessionUser)) {
            await markNewAccountInstructionTipsEligible(sessionUser.id);
          }
          onSignedIn(sessionUserFromSupabaseAuthUser(sessionUser));
        } else {
          showFlareAlert("Google sign in incomplete", "No session returned. Please try again.");
        }
      } finally {
        onAuthBusy?.(false);
      }
    }
    setActiveAuthAction(null);
  };

  /** Same layout as gray auth; fill page with blue in light appearance only. */
  const authBlue = !cAuth.isDark;
  // Sign-in controls now live in a card-colored slide-up sheet, so they always use card chrome.
  const onPrimaryChrome = false;
  const [sheetOpen, setSheetOpen] = useState(false);
  const closeSheet = useCallback(() => {
    setSheetOpen(false);
    setStep("method");
    Keyboard.dismiss();
  }, []);
  return (
    <View
      style={[
        styles.authScreenFill,
        {
          backgroundColor: authBlue ? cAuth.primary : cAuth.screen,
          paddingTop: insets.top,
          paddingBottom: Math.max(insets.bottom, 12),
          paddingHorizontal: FULL_WIDTH_CTA_EDGE_PADDING,
        },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Sign in"
        onPress={() => setSheetOpen(true)}
        hitSlop={12}
        style={[styles.authTopRightSignIn, { top: insets.top + 12 }]}
      >
        <Ionicons name="person-circle" size={34} color={cAuth.white} />
      </Pressable>
      <View style={styles.authLandingOffset}>
        <View style={[styles.authLandingBlock, { minHeight: wizardLandingMinHeight() }]}>
          <View style={styles.authBrandBlock}>
          <Image source={SPLASH_MARK_IMAGE} style={styles.authLogo} resizeMode="contain" />
          <Text style={[styles.authBrandName, { color: authBlue ? cAuth.white : cAuth.text }]}>FlareCare</Text>
          <Text
            style={[
              styles.authBrandTagline,
              { color: authBlue ? "rgba(255,255,255,0.88)" : cAuth.textMuted },
            ]}
          >
            Your health. Your IBD. Your control.
          </Text>
          </View>
        </View>
      </View>
      <SlideUpSheet visible={sheetOpen} onClose={closeSheet} maxHeightFraction={0.9}>
        <View style={styles.authSheetContent}>
          {step === "method" ? (
            <View style={[styles.authMethodPanel, styles.authSheetPanel]}>
              <Text style={[styles.authPromptTitle, { color: onPrimaryChrome ? cAuth.white : cAuth.text }]}>Sign in to continue</Text>
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: legalAccepted }}
                accessibilityLabel="Agree to Terms of Service and Privacy Policy, including the processing of my health information"
                onPress={() => setLegalAccepted((v) => !v)}
                style={styles.authLegalRow}
              >
                <View
                  style={[
                    styles.authLegalCheckbox,
                    {
                      borderColor: onPrimaryChrome ? "rgba(255,255,255,0.6)" : cAuth.cardBorder,
                      backgroundColor: legalAccepted ? (onPrimaryChrome ? cAuth.white : cAuth.primary) : "transparent",
                    },
                  ]}
                >
                  {legalAccepted ? (
                    <Ionicons
                      name="checkmark"
                      size={14}
                      color={onPrimaryChrome ? cAuth.primary : cAuth.white}
                      accessibilityIgnoresInvertColors
                    />
                  ) : null}
                </View>
                <Text style={[styles.authLegalText, { color: onPrimaryChrome ? "rgba(255,255,255,0.9)" : cAuth.textMuted }]}>
                  I agree to the{" "}
                  <Text
                    style={[styles.authLegalLink, { color: onPrimaryChrome ? cAuth.white : cAuth.primary }]}
                    onPress={() => setAuthLegalModal("terms")}
                  >
                    Terms of Service
                  </Text>{" "}
                  and{" "}
                  <Text
                    style={[styles.authLegalLink, { color: onPrimaryChrome ? cAuth.white : cAuth.primary }]}
                    onPress={() => setAuthLegalModal("privacy")}
                  >
                    Privacy Policy
                  </Text>
                  , including the processing of my health information.
                </Text>
              </Pressable>
              <View style={styles.authMethodActions}>
                <PrimaryButton
                  title="Continue with email"
                  onPress={() => setStep("email")}
                  disabled={activeAuthAction !== null || !legalAccepted}
                  variant={onPrimaryChrome ? "onPrimary" : "default"}
                />
                <SecondaryButton
                  title={activeAuthAction === "google" ? "Loading..." : "Continue with Google"}
                  onPress={signInGoogle}
                  disabled={activeAuthAction !== null || !legalAccepted}
                  variant={onPrimaryChrome ? "onPrimary" : "default"}
                  leftIcon={<Ionicons name="logo-google" size={16} color={onPrimaryChrome ? "#ffffff" : cAuth.secondaryBtnText} />}
                />
              </View>
              <View style={styles.authSecureNote}>
                <Ionicons
                  name="lock-closed-outline"
                  size={13}
                  color={onPrimaryChrome ? "rgba(255,255,255,0.75)" : cAuth.textMuted}
                  accessibilityIgnoresInvertColors
                />
                <Text
                  style={[
                    styles.authSecureNoteText,
                    { color: onPrimaryChrome ? "rgba(255,255,255,0.75)" : cAuth.textMuted },
                  ]}
                >
                  Secure sign-in
                </Text>
              </View>
            </View>
          ) : step === "email" ? (
            <View style={[styles.authFlowPanel, styles.authSheetPanel]}>
              <View style={styles.authFormCenter}>
                <Text style={[styles.authPromptTitle, { color: onPrimaryChrome ? cAuth.white : cAuth.text }]}>Sign in with email</Text>
                <Text
                  style={[
                    styles.authPromptSub,
                    styles.authEmailHelperSub,
                    { color: onPrimaryChrome ? "rgba(255,255,255,0.88)" : cAuth.textMuted },
                  ]}
                >
                  We&apos;ll send a 6-digit code to this email.
                </Text>
                <Controller
                  control={emailControl}
                  name="email"
                  render={({ field: { onChange, value } }) => (
                    <LabeledInput
                      label="Email"
                      value={value}
                      onChangeText={onChange}
                      placeholder="you@example.com"
                      autoCapitalize="none"
                      keyboardType="email-address"
                      error={emailErrors.email?.message}
                      onPrimary={onPrimaryChrome}
                    />
                  )}
                />
              </View>
              <View style={styles.authBottomActions}>
                <PrimaryButton
                  title={activeAuthAction === "email" ? "Loading..." : "Continue"}
                  onPress={handleEmailSubmit(sendMagicLink)}
                  disabled={activeAuthAction !== null}
                  variant={onPrimaryChrome ? "onPrimary" : "default"}
                />
                <SecondaryButton
                  title="Back"
                  onPress={() => setStep("method")}
                  disabled={activeAuthAction !== null}
                  variant={onPrimaryChrome ? "onPrimary" : "default"}
                />
              </View>
            </View>
          ) : (
            <View style={[styles.authFlowPanel, styles.authSheetPanel]}>
              <View style={styles.authFormCenter}>
                <Text
                  style={[
                    styles.authPromptSub,
                    styles.authEmailHelperSub,
                    { color: onPrimaryChrome ? "rgba(255,255,255,0.88)" : cAuth.textMuted },
                  ]}
                >
                  Enter the 6-digit code from your inbox.
                </Text>
                <Controller
                  control={codeControl}
                  name="otpCode"
                  render={({ field: { onChange, value } }) => (
                    <LabeledInput
                      label="Verification code"
                      value={value}
                      onChangeText={onChange}
                      placeholder="6-digit code"
                      keyboardType="number-pad"
                      maxLength={6}
                      error={codeErrors.otpCode?.message}
                      onPrimary={onPrimaryChrome}
                    />
                  )}
                />
                {otpSentAt != null && otpRemaining > 0 ? (
                  <Text
                    style={[
                      styles.authOtpCountdown,
                      { color: onPrimaryChrome ? "rgba(255,255,255,0.88)" : cAuth.textMuted },
                    ]}
                  >
                    Code expires in {formatOtpCountdown(otpRemaining)}
                  </Text>
                ) : null}
                {canResendOtp ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Resend code"
                    onPress={resendOtpCode}
                    hitSlop={8}
                    style={styles.authOtpResendPressable}
                  >
                    <Text style={[styles.authOtpResendLabel, { color: onPrimaryChrome ? cAuth.white : cAuth.primary }]}>
                      Resend code
                    </Text>
                  </Pressable>
                ) : null}
                {resendLimitReached ? (
                  <Text
                    style={[
                      styles.authOtpLimitMessage,
                      { color: onPrimaryChrome ? "rgba(255,255,255,0.88)" : cAuth.textMuted },
                    ]}
                  >
                    Too many code requests. Wait a few minutes or try a different email.
                  </Text>
                ) : null}
              </View>
              <View style={styles.authBottomActions}>
                <PrimaryButton
                  title={activeAuthAction === "code" ? "Loading..." : "Verify code"}
                  onPress={handleCodeSubmit(verifyOtpCode)}
                  disabled={activeAuthAction !== null}
                  variant={onPrimaryChrome ? "onPrimary" : "default"}
                />
                <SecondaryButton
                  title="Use different email"
                  onPress={() => {
                    resetCode({ otpCode: "" });
                    clearOtpSession();
                    setStep("email");
                  }}
                  disabled={activeAuthAction !== null}
                  variant={onPrimaryChrome ? "onPrimary" : "default"}
                />
              </View>
            </View>
          )}
        </View>
      </SlideUpSheet>
      <Modal
        visible={authLegalModal !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setAuthLegalModal(null)}
      >
        <View style={[styles.legalModalRoot, { backgroundColor: cAuth.screen, paddingTop: insets.top }]}>
          <View style={[styles.legalModalHeader, { borderBottomColor: cAuth.cardBorder }]}>
            <Text style={[styles.legalModalTitle, { color: cAuth.text }]}>
              {authLegalModal === "terms" ? "Terms of Use" : "Privacy Policy"}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              onPress={() => setAuthLegalModal(null)}
              hitSlop={12}
            >
              <Text style={[styles.legalModalClose, { color: cAuth.primary }]}>Done</Text>
            </Pressable>
          </View>
          <ScrollView
            style={styles.legalModalScroll}
            contentContainerStyle={[styles.legalModalScrollContent, { paddingBottom: Math.max(insets.bottom, 24) }]}
          >
            {authLegalModal ? <LegalDocumentView kind={authLegalModal} /> : null}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

/** One-time after email (or other) sign-in when `user_metadata.full_name` is missing. */
function ProfileSetupScreen({ user, onComplete }: { user: SessionUser; onComplete: (u: SessionUser) => void }) {
  const cAuth = useFlareColors();
  const insets = useSafeAreaInsets();
  const authBlue = !cAuth.isDark;
  const onPrimaryChrome = authBlue;
  const [saving, setSaving] = useState(false);

  const profileSchema = useMemo(
    () =>
      yup.object({
        fullName: yup.string().trim().required("Full name is required").min(2, "Enter at least 2 characters"),
      }),
    [],
  );

  const {
    control,
    handleSubmit,
    formState: { errors: profileErrors },
  } = useForm<{ fullName: string }>({
    defaultValues: { fullName: "" },
    resolver: yupResolver(profileSchema),
    mode: "onSubmit",
  });

  const saveProfile = async ({ fullName }: { fullName: string }) => {
    const trimmed = fullName.trim();
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ data: { full_name: trimmed } });
    if (error) {
      setSaving(false);
      showFlareAlert("Could not save profile", error.message);
      return;
    }
    const { data: sessionData } = await supabase.auth.getSession();
    setSaving(false);
    const refreshed = sessionData.session?.user;
    if (refreshed) {
      onComplete(sessionUserFromSupabaseAuthUser(refreshed));
      return;
    }
    onComplete({ ...user, displayName: trimmed });
  };

  return (
    <View
      style={[
        styles.authScreenFill,
        {
          backgroundColor: authBlue ? cAuth.primary : cAuth.screen,
          paddingTop: insets.top + 32,
          paddingBottom: Math.max(insets.bottom, 12),
          paddingHorizontal: FULL_WIDTH_CTA_EDGE_PADDING,
        },
      ]}
    >
      <View style={styles.authShell}>
        <View style={styles.authBrandBlock}>
          <Image source={SPLASH_MARK_IMAGE} style={styles.authLogo} resizeMode="contain" />
          <Text style={[styles.authBrandName, { color: authBlue ? cAuth.white : cAuth.text }]}>FlareCare</Text>
        </View>
        <Card title="" plain style={styles.authCardPlain}>
          <View style={styles.authFlowPanel}>
            <View style={styles.authFormCenter}>
              <Text style={[styles.authPromptTitle, { color: onPrimaryChrome ? cAuth.white : cAuth.text }]}>
                Almost there!
              </Text>
              <Text
                style={[
                  styles.authPromptSub,
                  styles.authEmailHelperSub,
                  { color: onPrimaryChrome ? "rgba(255,255,255,0.88)" : cAuth.textMuted },
                ]}
              >
                Help us personalise your experience — what should we call you?
              </Text>
              <Controller
                control={control}
                name="fullName"
                render={({ field: { onChange, value } }) => (
                  <LabeledInput
                    label="Full name"
                    value={value}
                    onChangeText={onChange}
                    placeholder="Your full name"
                    autoCapitalize="words"
                    autoComplete="name"
                    error={profileErrors.fullName?.message}
                    onPrimary={onPrimaryChrome}
                  />
                )}
              />
            </View>
            <View style={styles.authBottomActions}>
              <PrimaryButton
                title={saving ? "Saving…" : "Continue"}
                onPress={handleSubmit(saveProfile)}
                disabled={saving}
                variant={onPrimaryChrome ? "onPrimary" : "default"}
              />
              <View style={styles.authBottomActionSpacer} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />
            </View>
          </View>
        </Card>
      </View>
    </View>
  );
}

/** Icons inside dashboard home tiles (Daily Check-in + More). */
const HOME_TILE_ICON_SIZE = 34;

/** Show bottom shortcuts on tab roots + reminder-adjacent hubs; hide on wizard/detail flows, etc. */
const BOTTOM_BAR_VISIBLE_ROUTES = new Set([
  "Dashboard",
  "Account",
  "Logs",
  "SymptomHistory",
  "MedicationTrackingHistory",
  "Wellbeing",
  "Reminders",
  "Meds",
  "Appointments",
  "AppointmentsPast",
]);

/** Padding uses this screen’s route—not the globally focused route—so the exiting page doesn’t jump during transitions. */
function useBottomTabScrollInset() {
  const route = useRoute();
  const insets = useSafeAreaInsets();
  return BOTTOM_BAR_VISIBLE_ROUTES.has(route.name) ? bottomTabBarScrollInset(insets.bottom) : 0;
}

function formatHistoryBrowseSubtitle(count: number): string {
  if (count === 0) return "No entries";
  if (count === 1) return "1 entry";
  return `${count} entries`;
}

type MedicationLogDetailItem = {
  medication: string;
  date: string;
  timeOfDay: string;
  dosage?: string;
};

function parseMedicationLogList(raw: unknown, withDosage: boolean): MedicationLogDetailItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const r = entry as Record<string, unknown>;
      const medication = String(r.medication ?? "").trim();
      if (!medication) return null;
      let date = "";
      const rawDate = r.date;
      if (typeof rawDate === "string" && rawDate.trim()) {
        const iso = rawDate.match(/^(\d{4}-\d{2}-\d{2})/);
        date = iso ? iso[1] : rawDate;
      } else if (rawDate != null) {
        const parsed = new Date(String(rawDate));
        if (!Number.isNaN(parsed.getTime())) {
          date = `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(parsed.getDate()).padStart(2, "0")}`;
        }
      }
      const dosageRaw = String(r.dosage ?? "").trim();
      const item: MedicationLogDetailItem = {
        medication,
        date,
        timeOfDay: String(r.timeOfDay ?? r.time_of_day ?? "").trim(),
      };
      if (withDosage) {
        item.dosage = dosageRaw || "N/A";
      }
      return item;
    })
    .filter((item): item is MedicationLogDetailItem => item != null);
}

/** Avoid greeting flicker (“there”) when session metadata/email arrives shortly after navigation. */
const dashboardGreetingFirstNameByUserId: Record<string, string> = {};

/** OWM `/img/wn/{icon}@2x.png` id → Ionicons ( themed `color`; no remote bitmaps ). */
function owmIconIdToIoniconsName(iconId: string | null | undefined): keyof typeof Ionicons.glyphMap {
  if (!iconId || iconId.length < 2) return "partly-sunny";
  const code = iconId.slice(0, 2);
  const night = iconId.endsWith("n");
  switch (code) {
    case "01":
      return (night ? "moon" : "sunny") as keyof typeof Ionicons.glyphMap;
    case "02":
      return ((night ? "cloudy-night" : "partly-sunny") as keyof typeof Ionicons.glyphMap);
    case "03":
    case "04":
      return ((night ? "cloudy-night" : "cloud") as keyof typeof Ionicons.glyphMap);
    case "09":
    case "10":
      return "rainy";
    case "11":
      return "thunderstorm";
    case "13":
      return "snow";
    case "50":
      return "cloud";
    default:
      return "partly-sunny";
  }
}

function weatherIconNudgeStyle(name: keyof typeof Ionicons.glyphMap) {
  return name === "cloud" || name === "cloudy-night" ? { marginTop: 1 } : undefined;
}

function DashboardGridTile({
  width,
  label,
  icon,
  onPress,
  variant,
  isLastInScrollRow,
}: {
  width: number;
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
  variant: "scroll" | "grid";
  /** When `variant` is `scroll`, omit right margin on the last tile. */
  isLastInScrollRow?: boolean;
}) {
  const c = useFlareColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={[
        styles.homeDashboardTile,
        { width, backgroundColor: c.card },
        variant === "scroll" && (isLastInScrollRow ? styles.homeDashboardTileScrollLast : styles.homeDashboardTileScroll),
      ]}
    >
      <View style={styles.homeDashboardTileBody}>
        <View style={styles.homeDashboardTileIconWrap}>{icon}</View>
        <Text style={[styles.moreGridLabel, { color: c.text }]} numberOfLines={2}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

function DashboardScreen({ user }: { user: SessionUser }) {
  const navigation = useNavigation<any>();
  const { width: windowWidth } = useWindowDimensions();
  const c = useFlareColors();
  const bottomScrollInset = useBottomTabScrollInset();
  const tileWidth = useMemo(
    () => Math.floor((windowWidth - SCREEN_EDGE_PADDING * 2 - HOME_TILE_GAP) / 2),
    [windowWidth],
  );
  const snapshotSeed = dashboardSnapshotByUserId[user.id];
  const [weather, setWeather] = useState<string>(() => snapshotSeed?.weather ?? "Loading weather...");
  const [weatherMeta, setWeatherMeta] = useState<{ city: string; temp: number | null; desc: string; icon?: string | null } | null>(
    () => snapshotSeed?.weatherMeta ?? null,
  );
  const [newsItems, setNewsItems] = useState<DashboardNewsItem[]>(() => dedupeNewsItems(snapshotSeed?.newsItems ?? []));
  const [newsLoading, setNewsLoading] = useState(() => {
    const s = dashboardSnapshotByUserId[user.id];
    if (!s) return true;
    return !(s.newsItems.length > 0 || s.newsError);
  });
  const [newsError, setNewsError] = useState<string | null>(() => snapshotSeed?.newsError ?? null);
  const [todaySummary, setTodaySummary] = useState<{ symptoms: number; medsTaken: number; medsTotal: number; hydration: number }>(
    () => snapshotSeed?.todaySummary ?? { symptoms: 0, medsTaken: 0, medsTotal: 0, hydration: 0 },
  );
  const [welcomeDismissed, setWelcomeDismissed] = useState(true);
  const [welcomeEligible, setWelcomeEligible] = useState(false);
  const [welcomeHydrated, setWelcomeHydrated] = useState(false);
  const hydrationTarget = HYDRATION_TARGET;
  const dailyCheckinCards = [
    { key: "symptoms" as const, label: "Log Symptoms", icon: "thermometer", family: "mci", goTo: "SymptomLogWizard" },
    { key: "track-meds" as const, label: "Track Medications", icon: TRACK_MEDICATIONS_MCI_ICON, family: "mci", goTo: "MedicationTrackingWizard" },
    { key: "wellbeing" as const, label: "My Wellbeing", icon: "heart-pulse", family: "mci", goTo: "WellbeingWizard" },
  ];
  const dailyTrackingCards = [
    { key: "meds", label: "My Meds", screen: "Meds" as const, icon: MY_MEDS_MCI_ICON, family: "mci" as "ion" | "mci" },
    { key: "hydration", label: "My Hydration", screen: "Hydration" as const, icon: HYDRATION_MCI_ICON, family: "mci" as "ion" | "mci" },
    { key: "bowel", label: "Bowel Movements", screen: "Bowel" as const, icon: BOWEL_FEATURE_MCI_ICON, family: "mci" as "ion" | "mci" },
    { key: "weight", label: "My Weight", screen: "Weight" as const, icon: "scale-bathroom", family: "mci" as "ion" | "mci" },
  ];
  const moreLinkCards = [
    { key: "appointments", label: "Appointments", screen: "Appointments" as const, icon: "calendar-outline", family: "ion" as const },
    { key: "reports", label: "Reports", screen: "Reports" as const, icon: "document-text-outline", family: "ion" as const },
  ];
  const computedGreetingFirst = firstNameFromSessionUser(user);
  useEffect(() => {
    if (computedGreetingFirst !== "there") dashboardGreetingFirstNameByUserId[user.id] = computedGreetingFirst;
  }, [computedGreetingFirst, user.id]);
  const greetingFirstName =
    computedGreetingFirst !== "there"
      ? computedGreetingFirst
      : dashboardGreetingFirstNameByUserId[user.id] ?? "there";
  const showWelcomeCard = welcomeHydrated && welcomeEligible && !welcomeDismissed;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [dismissed, eligible] = await Promise.all([
        readDashboardWelcomeDismissed(user.id),
        readDashboardWelcomeEligible(user.id),
      ]);
      if (!cancelled) {
        setWelcomeDismissed(dismissed);
        setWelcomeEligible(eligible);
        setWelcomeHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user.id]);

  const dismissWelcomeCard = useCallback(() => {
    setWelcomeDismissed(true);
    void markDashboardWelcomeDismissed(user.id);
  }, [user.id]);
  const todayLabel = formatUkGreetingDate(new Date());
  const weatherIconName = weatherMeta?.icon
    ? owmIconIdToIoniconsName(weatherMeta.icon)
    : "partly-sunny";
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      const seedSnap = dashboardSnapshotByUserId[user.id];
      const snap: DashboardSnapshot = {
        todaySummary: seedSnap?.todaySummary ?? { symptoms: 0, medsTaken: 0, medsTotal: 0, hydration: 0 },
        weatherMeta: seedSnap?.weatherMeta ?? null,
        weather: seedSnap?.weather ?? "Loading weather...",
        newsItems: seedSnap?.newsItems ?? [],
        newsError: seedSnap?.newsError ?? null,
      };

      const load = async () => {
        try {
          const today = todayYmd();
          const [
            todaySymptomsRes,
            medicationsList,
            takenMedsRes,
            todayHydrationRes,
          ] = await Promise.all([
            supabase.from(TABLES.LOG_SYMPTOMS).select("id,created_at").eq("user_id", user.id).gte("created_at", `${today}T00:00:00`),
            fetchMedicationsForUser(user.id),
            supabase
              .from(TABLES.MEDICATION_TAKEN)
              .select("medication_id,created_at")
              .eq("user_id", user.id)
              .eq("taken_date", today),
            supabase.from(TABLES.DAILY_HYDRATION).select("glasses,updated_at").eq("user_id", user.id).eq("date", today).maybeSingle(),
          ]);

          const prescribedMeds = medicationsList.filter((med) => med.name !== "Medication Tracking");

          snap.todaySummary = {
            symptoms: todaySymptomsRes.data?.length ?? 0,
            medsTaken: takenMedsRes.data?.length ?? 0,
            medsTotal: prescribedMeds.length,
            hydration: todayHydrationRes.data?.glasses ?? 0,
          };

          if (cancelled) return;
          setTodaySummary(snap.todaySummary);
        } catch {
          snap.todaySummary = { symptoms: 0, medsTaken: 0, medsTotal: 0, hydration: 0 };
          if (cancelled) return;
          setTodaySummary(snap.todaySummary);
        }

        try {
          const apiBase =
            process.env.EXPO_PUBLIC_API_BASE_URL ||
            (process.env.EXPO_PUBLIC_SUPABASE_URL ? `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1` : "") ||
            process.env.EXPO_PUBLIC_WEB_API_BASE_URL ||
            "";
          if (!apiBase) {
            snap.weatherMeta = null;
            snap.weather = "Weather unavailable";
          } else if (apiBase.includes("/functions/v1")) {
            const weatherUrl = `${apiBase}/weather?lat=51.5074&lon=-0.1278`;
            const weatherRes = await fetch(weatherUrl);
            if (!weatherRes.ok) throw new Error("weather function failed");
            const weatherJson = await weatherRes.json();
            if (weatherJson?.city && weatherJson?.temp != null) {
              const desc = weatherJson.desc ?? weatherJson.main ?? "Weather";
              snap.weatherMeta = {
                city: weatherJson.city,
                temp: weatherJson.temp,
                desc,
                icon: weatherJson.icon ?? null,
              };
              snap.weather = "Connected";
            } else {
              snap.weatherMeta = null;
              snap.weather = "Weather unavailable";
            }
          } else {
            const newsUrl = `${apiBase}/api/news`;
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 4000);
            const response = await fetch(newsUrl, { signal: controller.signal });
            clearTimeout(timeout);
            snap.weatherMeta = null;
            snap.weather = response.ok ? "News connected" : "Weather unavailable";
          }
          if (cancelled) return;
          setWeatherMeta(snap.weatherMeta);
          setWeather(snap.weather);
        } catch {
          snap.weatherMeta = null;
          snap.weather = "Weather unavailable";
          if (cancelled) return;
          setWeatherMeta(null);
          setWeather(snap.weather);
        }

        if (!cancelled) {
          dashboardSnapshotByUserId[user.id] = { ...snap };
        }

        try {
          const hasCachedNews = (seedSnap?.newsItems?.length ?? 0) > 0;
          if (!hasCachedNews) setNewsLoading(true);
          setNewsError(null);
          const apiBase =
            process.env.EXPO_PUBLIC_API_BASE_URL ||
            (process.env.EXPO_PUBLIC_SUPABASE_URL ? `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1` : "") ||
            process.env.EXPO_PUBLIC_WEB_API_BASE_URL ||
            "";
          if (!apiBase) {
            snap.newsItems = [];
            snap.newsError = "News unavailable";
            if (cancelled) return;
            setNewsItems([]);
            setNewsError(snap.newsError);
            setNewsLoading(false);
          } else {
            const newsUrl = apiBase.includes("/functions/v1") ? `${apiBase}/news` : `${apiBase}/api/news`;
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 6000);
            const response = await fetch(newsUrl, { signal: controller.signal });
            clearTimeout(timeout);
            if (!response.ok) throw new Error("news request failed");
            const json = await response.json();
            snap.newsItems = dedupeNewsItems(
              (Array.isArray(json?.items) ? json.items : []).map((item: any) => ({
                title: String(item?.headline || item?.title || "Untitled"),
                source: String(item?.source || item?.sourceName || "Source"),
                publishedAt: item?.pubDate || item?.publishedAt || item?.date || undefined,
                link: item?.link || item?.url || undefined,
                imageUrl: item?.imageUrl || item?.image || item?.thumbnail || null,
              })),
            );

            snap.newsError = null;
            if (cancelled) return;
            setNewsItems(snap.newsItems);
            setNewsError(null);
          }
        } catch {
          snap.newsItems = [];
          snap.newsError = "Unable to load latest news.";
          if (cancelled) return;
          setNewsItems([]);
          setNewsError(snap.newsError);
        } finally {
          if (!cancelled) {
            setNewsLoading(false);
            dashboardSnapshotByUserId[user.id] = snap;
          }
        }
      };

      load();
      return () => {
        cancelled = true;
      };
    }, [user.id]),
  );

  const shelfNewsItems = useMemo(
    () => newsItems.slice(0, Math.min(DASHBOARD_NEWS_SHELF_PEEK, DASHBOARD_NEWS_HOME_SHELF_MAX)),
    [newsItems],
  );
  const newsShelfCardWidth = useMemo(() => dashboardNewsShelfCardWidth(windowWidth), [windowWidth]);
  const [newsShelfPageIndex, setNewsShelfPageIndex] = useState(0);
  const newsShelfPageStride = newsShelfCardWidth + HOME_TILE_GAP;

  useEffect(() => {
    setNewsShelfPageIndex(0);
  }, [shelfNewsItems.length]);

  const onNewsShelfScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const x = event.nativeEvent.contentOffset.x;
      const next = Math.round(x / newsShelfPageStride);
      const clamped = Math.max(0, Math.min(shelfNewsItems.length - 1, next));
      setNewsShelfPageIndex(clamped);
    },
    [newsShelfPageStride, shelfNewsItems.length],
  );

  const medsGoalComplete =
    todaySummary.medsTotal > 0 && todaySummary.medsTaken >= todaySummary.medsTotal;
  const hydrationGoalComplete = todaySummary.hydration >= hydrationTarget;

  const todayGoalItems = useMemo(
    () => [
      {
        id: "meds-goal",
        title: "Take Medications",
        trailingText: `${todaySummary.medsTaken}/${todaySummary.medsTotal}`,
        completed: medsGoalComplete,
      },
      {
        id: "hydration-goal",
        title: "Stay Hydrated",
        trailingText: `${todaySummary.hydration}/${hydrationTarget}`,
        completed: hydrationGoalComplete,
      },
    ],
    [
      hydrationGoalComplete,
      hydrationTarget,
      medsGoalComplete,
      todaySummary.hydration,
      todaySummary.medsTaken,
      todaySummary.medsTotal,
    ],
  );

  const homeNewsShelf = (
    <View style={[styles.dashboardShelfSection, styles.dashboardShelfBeforeTitle, styles.dashboardShelfSectionLast]}>
      <View style={styles.dashboardSubsectionHeader}>
        <Text style={[styles.dashboardSubsectionTitleLeft, styles.dashboardSubsectionTitleInHeader, { color: c.text, flex: 1 }]}>
          Latest News
        </Text>
        {!newsLoading && !newsError && newsItems.length > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="See all news"
            onPress={() => navigation.navigate("LatestNews")}
            hitSlop={8}
            style={({ pressed }) => pressed && { opacity: 0.7 }}
          >
            <Text style={[styles.dashboardNewsSeeAll, { color: c.primary }]}>See all</Text>
          </Pressable>
        ) : null}
      </View>
      {newsLoading ? (
        <Text style={[styles.muted, styles.dashboardNewsStatus, { color: c.textMuted }]}>Getting latest news...</Text>
      ) : newsError ? (
        <Text style={[styles.muted, styles.dashboardNewsStatus, { color: c.textMuted }]}>{newsError}</Text>
      ) : newsItems.length === 0 ? (
        <Text style={[styles.muted, styles.dashboardNewsStatus, { color: c.textMuted }]}>No news available right now.</Text>
      ) : (
        <View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={newsFeedListStyles.shelfRow}
            decelerationRate="fast"
            snapToInterval={newsShelfPageStride}
            snapToAlignment="start"
            nestedScrollEnabled
            onScroll={onNewsShelfScroll}
            onMomentumScrollEnd={onNewsShelfScroll}
            scrollEventThrottle={16}
          >
            {shelfNewsItems.map((item) => (
              <NewsFeedCard key={item.link ?? item.title} item={item} variant="shelf" width={newsShelfCardWidth} />
            ))}
          </ScrollView>
          {shelfNewsItems.length > 1 ? (
            <View
              style={styles.dashboardNewsDots}
              accessibilityLabel={`News article ${newsShelfPageIndex + 1} of ${shelfNewsItems.length}`}
            >
              {shelfNewsItems.map((item, index) => (
                <View
                  key={item.link ?? item.title}
                  style={[
                    styles.dashboardNewsDot,
                    {
                      backgroundColor: index === newsShelfPageIndex ? c.primary : c.textMuted,
                      opacity: index === newsShelfPageIndex ? 1 : 0.35,
                    },
                  ]}
                />
              ))}
            </View>
          ) : null}
        </View>
      )}
    </View>
  );

  return (
    <View style={[styles.dashboardScreen, { backgroundColor: c.screen }]}>
      <ScrollView
        style={styles.dashboardScroll}
        contentContainerStyle={{
          padding: SCREEN_EDGE_PADDING,
          paddingBottom: bottomScrollInset,
        }}
        showsVerticalScrollIndicator={false}
      >
      <InstructionInteractionBlock active={showWelcomeCard}>
      <Card title="">
        <View style={styles.weatherIntroWrap}>
          <Text style={[styles.weatherGreeting, { color: c.text }]} numberOfLines={1}>
            Hi, {greetingFirstName}
          </Text>
          <Text style={[styles.weatherDate, { color: c.textMuted }]} numberOfLines={1}>
            {todayLabel}
          </Text>
        </View>
        {weatherMeta ? (
          <View style={styles.weatherHero}>
            <View style={styles.weatherIconWrap}>
              <Ionicons
                name={weatherIconName}
                size={28}
                color={c.primary}
                style={weatherIconNudgeStyle(weatherIconName)}
              />
            </View>
            <View style={styles.weatherLeft}>
              <Text style={[styles.weatherCity, { color: c.textSecondary }]}>{weatherMeta.city}</Text>
              <Text style={[styles.weatherDesc, { color: c.textMuted }]}>{weatherMeta.desc}</Text>
            </View>
            <View style={styles.weatherTempWrap}>
              <Text style={[styles.weatherTemp, { color: c.primary }]}>{weatherMeta.temp ?? "--"}°</Text>
              <Text style={[styles.weatherUnit, { color: c.primary }]}>C</Text>
            </View>
          </View>
        ) : (
          <View style={styles.weatherHero}>
            <View style={styles.weatherIconWrap}>
              <ActivityIndicator size="small" color={c.primary} />
            </View>
            <View style={styles.weatherLeft}>
              <Text style={[styles.weatherCity, { color: c.textMuted }]} numberOfLines={1}>
                {weather}
              </Text>
              <Text style={[styles.weatherDesc, { color: c.textMuted }]}>{"\u00a0"}</Text>
            </View>
            <View style={styles.weatherTempWrap}>
              <Text style={[styles.weatherTemp, { color: c.textMuted, opacity: 0.4 }]}>--°</Text>
              <Text style={[styles.weatherUnit, { color: c.textMuted, opacity: 0.4 }]}>C</Text>
            </View>
          </View>
        )}
      </Card>
      <View style={[styles.dashboardShelfSection, styles.dashboardShelfAfterCard]}>
        <Text style={[styles.dashboardSubsectionTitleLeft, { color: c.text }]}>Check in</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={2 * tileWidth + 2 * HOME_TILE_GAP}
          snapToAlignment="start"
          decelerationRate="fast"
        >
          {dailyCheckinCards.map((item, index) => (
            <DashboardGridTile
              key={item.key}
              width={tileWidth}
              label={item.label}
              variant="scroll"
              isLastInScrollRow={index === dailyCheckinCards.length - 1}
              onPress={() => navigation.navigate(item.goTo)}
              icon={
                item.family === "ion" ? (
                  <Ionicons name={item.icon as any} size={HOME_TILE_ICON_SIZE} color={c.primary} />
                ) : (
                  <MaterialCommunityIcons name={item.icon as any} size={HOME_TILE_ICON_SIZE} color={c.primary} />
                )
              }
            />
          ))}
        </ScrollView>
      </View>
      <View style={[styles.dashboardShelfSection, styles.dashboardShelfBeforeTitle]}>
        <Text style={[styles.dashboardSubsectionTitleLeft, { color: c.text }]}>Today's Progress</Text>
        <View style={[logHistoryCardStyles.trackerCard, { backgroundColor: c.card }]}>
          <LogHistoryList
            items={todayGoalItems}
            rowTextLayout="compact"
            rowPaddingHorizontal={ACCOUNT_LIST_ROW_PADDING}
          />
        </View>
      </View>
      <View style={[styles.dashboardShelfSection, styles.dashboardShelfAfterCard]}>
        <Text style={[styles.dashboardSubsectionTitle, { color: c.text }]}>My Tools</Text>
        <View style={styles.moreGrid}>
          {dailyTrackingCards.map((item) => (
            <DashboardGridTile
              key={item.key}
              width={tileWidth}
              label={item.label}
              variant="grid"
              onPress={() => navigation.navigate(item.screen)}
              icon={
                item.family === "ion" ? (
                  <Ionicons name={item.icon as any} size={HOME_TILE_ICON_SIZE} color={c.primary} />
                ) : (
                  <MaterialCommunityIcons name={item.icon as any} size={HOME_TILE_ICON_SIZE} color={c.primary} />
                )
              }
            />
          ))}
        </View>
      </View>
      <View style={[styles.dashboardShelfSection, styles.dashboardShelfBeforeTitle]}>
        <Text style={[styles.dashboardSubsectionTitle, { color: c.text }]}>Manage</Text>
        <View style={styles.moreGrid}>
          {moreLinkCards.map((item) => (
            <DashboardGridTile
              key={item.key}
              width={tileWidth}
              label={item.label}
              variant="grid"
              onPress={() => navigation.navigate(item.screen)}
              icon={
                item.family === "ion" ? (
                  <Ionicons name={item.icon as any} size={HOME_TILE_ICON_SIZE} color={c.primary} />
                ) : (
                  <MaterialCommunityIcons name={item.icon as any} size={HOME_TILE_ICON_SIZE} color={c.primary} />
                )
              }
            />
          ))}
        </View>
      </View>
      {homeNewsShelf}
      </InstructionInteractionBlock>
      </ScrollView>
      {showWelcomeCard ? (
        <InstructionCardOverlay>
          <DashboardWelcomeCard onDismiss={dismissWelcomeCard} />
        </InstructionCardOverlay>
      ) : null}
    </View>
  );
}

function LogsScreen({ user }: { user: SessionUser }) {
  const navigation = useNavigation<any>();
  const c = useFlareColors();
  const bottomScrollInset = useBottomTabScrollInset();
  const { visible: showLogsInstruction, dismiss: dismissLogsInstruction } = useInstructionTip(
    user.id,
    readLogsInstructionEligible,
    readLogsInstructionDismissed,
    markLogsInstructionDismissed,
  );
  const [historyPreview, setHistoryPreview] = useState({
    symptomCount: 0,
    medicationCount: 0,
    wellbeingCount: 0,
  });

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void (async () => {
        const [symptomHistoryCountRes, medicationHistoryCountRes, wellbeingHistoryCountRes] = await Promise.all([
          supabase.from(TABLES.LOG_SYMPTOMS).select("id", { count: "exact", head: true }).eq("user_id", user.id),
          supabase.from(TABLES.LOG_MEDICATIONS).select("id", { count: "exact", head: true }).eq("user_id", user.id),
          supabase.from(TABLES.DAILY_WELLBEING).select("id", { count: "exact", head: true }).eq("user_id", user.id),
        ]);
        if (cancelled) return;
        setHistoryPreview({
          symptomCount: symptomHistoryCountRes.count ?? 0,
          medicationCount: medicationHistoryCountRes.count ?? 0,
          wellbeingCount: wellbeingHistoryCountRes.count ?? 0,
        });
      })();
      return () => {
        cancelled = true;
      };
    }, [user.id]),
  );

  return (
    <InstructionScreenShell
      showInstruction={showLogsInstruction}
      contentPaddingBottom={bottomScrollInset + 24}
      instruction={
        <FloatingWelcomeCard
          instruction={LOGS_INSTRUCTION}
          icon="documents-outline"
          iconFamily="ion"
          onDismiss={dismissLogsInstruction}
          dismissAccessibilityLabel="Dismiss logs guide"
        />
      }
    >
      <View style={[logHistoryCardStyles.trackerCard, { backgroundColor: c.card }]}>
        <LogHistoryList
          items={[
            buildBrowseLogRowItem({
              id: "symptom",
              title: "Symptom Logs",
              subtitle: formatHistoryBrowseSubtitle(historyPreview.symptomCount),
              accessibilityLabel: "Browse symptom history",
            }),
            buildBrowseLogRowItem({
              id: "medication",
              title: "Medication Logs",
              subtitle: formatHistoryBrowseSubtitle(historyPreview.medicationCount),
              accessibilityLabel: "Browse medication tracking history",
            }),
            buildBrowseLogRowItem({
              id: "wellbeing",
              title: "Wellbeing Logs",
              subtitle: formatHistoryBrowseSubtitle(historyPreview.wellbeingCount),
              accessibilityLabel: "Browse wellbeing history",
            }),
          ]}
          onPressItem={(rowId) => {
            if (rowId === "symptom") navigation.navigate("SymptomHistory");
            else if (rowId === "medication") navigation.navigate("MedicationTrackingHistory");
            else navigation.navigate("Wellbeing");
          }}
          rowTextLayout="compact"
        />
      </View>
    </InstructionScreenShell>
  );
}

function SymptomHistoryScreen({ user }: { user: SessionUser }) {
  const navigation = useNavigation<any>();
  const c = useFlareColors();
  const insets = useSafeAreaInsets();
  const bottomScrollInset = useBottomTabScrollInset();
  const { visible: showSymptomHistoryInstruction, dismiss: dismissSymptomHistoryInstruction } = useInstructionTip(
    user.id,
    readSymptomHistoryInstructionEligible,
    readSymptomHistoryInstructionDismissed,
    markSymptomHistoryInstructionDismissed,
  );
  const { rows, visibleCount, hasMore, loading, loadingMore, loadMore, refresh, syncExpandedFromCache } =
    useWizardLogHistory(user.id, TABLES.LOG_SYMPTOMS);
  const symptomLogItemIds = useMemo(() => rows.map((row) => String(row.id)), [rows]);
  const {
    selectionMode,
    selectedIds,
    bulkDeleteOpen,
    setBulkDeleteOpen,
    bulkDeleting,
    enterSelectionWith,
    toggleSelect,
    runBulkDelete,
  } = useLogListSelection({
    routeName: "SymptomHistory",
    itemIds: symptomLogItemIds,
    navigation,
    headerTitle: "History",
  });
  const selectionBarInset = selectionMode ? bottomTabBarHeight(insets.bottom) : 0;

  useFocusEffect(
    useCallback(() => {
      syncExpandedFromCache();
      void refresh();
    }, [refresh, syncExpandedFromCache]),
  );
  const symptomLogItems = rows.map((row) =>
    buildTimestampLogRowItem({
      id: String(row.id),
      title: "Symptom Log",
      whenIso: row.created_at,
    }),
  );

  const handleBulkDeleteConfirm = useCallback(() => {
    void runBulkDelete(async (ids) => {
      const result = await deleteUserLogRows(TABLES.LOG_SYMPTOMS, ids, user.id);
      if (!result.ok) {
        showFlareAlert("Could not delete", result.message);
        throw new Error(result.message);
      }
      await recordRecentActivityEvent(user.id, "symptom-deleted");
      invalidateDashboardSnapshot(user.id);
      await refresh();
    });
  }, [refresh, runBulkDelete, user.id]);

  return (
    <InstructionScreenShell
      showInstruction={showSymptomHistoryInstruction}
      contentPaddingBottom={bottomScrollInset + selectionBarInset + 24}
      instruction={
        <FloatingWelcomeCard
          instruction={SYMPTOM_LOGS_HISTORY_INSTRUCTION}
          icon="thermometer"
          onDismiss={dismissSymptomHistoryInstruction}
          dismissAccessibilityLabel="Dismiss symptom logs guide"
        />
      }
      footer={
        <ConfirmModal
          visible={bulkDeleteOpen}
          title={selectedIds.size === 1 ? "Delete symptom log?" : `Delete ${selectedIds.size} symptom logs?`}
          message="This action cannot be undone."
          confirmLabel={bulkDeleting ? "Deleting…" : "Delete"}
          confirmDestructive
          onConfirm={handleBulkDeleteConfirm}
          onCancel={() => setBulkDeleteOpen(false)}
        />
      }
    >
      <LogHistoryCard>
        <View style={logHistoryCardStyles.trackerCardBody}>
          {loading && rows.length === 0 ? (
            <LogHistoryListLoading />
          ) : rows.length === 0 ? (
            <LogHistoryEmptyState icon="thermometer" />
          ) : (
            <LogHistoryPreviewList
              items={symptomLogItems}
              visibleCount={visibleCount}
              hasMore={hasMore}
              loadingMore={loadingMore}
              onLoadMore={() => void loadMore()}
              rowTextLayout="compact"
              onPressItem={(logId) => navigation.navigate("SymptomDetail", { id: logId })}
              selectionMode={selectionMode}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
              onLongPressItem={enterSelectionWith}
            />
          )}
        </View>
      </LogHistoryCard>
    </InstructionScreenShell>
  );
}

/** Symptom detail — align with web `src/app/symptoms/[id]/page.js` field logic. */
function parseSymptomMealArray(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    try {
      const p = JSON.parse(raw);
      return Array.isArray(p) ? p : [];
    } catch {
      return [];
    }
  }
  return [];
}

function getMealFieldsForDetail(meal: unknown): { food: string; quantity: string } {
  if (typeof meal === "string") return { food: meal, quantity: "" };
  if (meal && typeof meal === "object") {
    const m = meal as Record<string, unknown>;
    const qty = typeof m.quantity === "string" ? m.quantity.trim() : "";
    return { food: typeof m.food === "string" ? m.food : "", quantity: qty };
  }
  return { food: "", quantity: "" };
}

function pickSymptomField(row: Record<string, unknown>, snake: string, camel?: string): unknown {
  if (row[snake] !== undefined && row[snake] !== null) return row[snake];
  if (camel !== undefined && row[camel] !== undefined && row[camel] !== null) return row[camel];
  return undefined;
}

function formatSymptomScoreDisplay(raw: unknown): string {
  if (raw === undefined || raw === null) return "Not set";
  const s = String(raw).trim();
  if (!s) return "Not set";
  if (/^\d+$/.test(s)) return `${s}/10`;
  return s;
}

function SymptomDetailScreen({ user }: { user: SessionUser }) {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const c = useFlareColors();
  const bottomScrollInset = useBottomTabScrollInset();
  const id = String((route.params as { id?: string })?.id ?? "");
  const [loading, setLoading] = useState(true);
  const [row, setRow] = useState<Record<string, unknown> | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const deleteInFlight = useRef(false);
  const load = useCallback(async () => {
    if (!id) {
      setRow(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.from(TABLES.LOG_SYMPTOMS).select("*").eq("user_id", user.id).eq("id", id).maybeSingle();
    if (error) {
      setRow(null);
    } else {
      setRow((data as Record<string, unknown>) ?? null);
    }
    setLoading(false);
  }, [user.id, id]);
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const handleDeleteConfirm = useCallback(async () => {
    if (deleteInFlight.current || !id) return;
    deleteInFlight.current = true;
    setDeleting(true);
    setDeleteConfirmOpen(false);
    const result = await deleteUserLogRow(TABLES.LOG_SYMPTOMS, id, user.id);
    setDeleting(false);
    deleteInFlight.current = false;
    if (!result.ok) {
      showFlareAlert("Could not delete", result.message);
      return;
    }
    await recordRecentActivityEvent(user.id, "symptom-deleted");
    invalidateDashboardSnapshot(user.id);
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate("SymptomHistory");
  }, [id, navigation, user.id]);

  useLayoutEffect(() => {
    if (loading || !row) {
      navigation.setOptions({ headerRight: undefined });
      return;
    }
    navigation.setOptions({
      headerRight: () => (
        <DetailDeleteHeaderButton onPress={() => setDeleteConfirmOpen(true)} disabled={deleting} />
      ),
    });
    return () => {
      navigation.setOptions({ headerRight: undefined });
    };
  }, [deleting, loading, navigation, row]);

  const createdRaw = pickSymptomField(row ?? {}, "created_at", "createdAt");
  const createdIso = createdRaw != null ? String(createdRaw) : "";
  const symptomStart = pickSymptomField(row ?? {}, "symptom_start_date", "symptomStartDate");
  const symptomEnd = pickSymptomField(row ?? {}, "symptom_end_date", "symptomEndDate");
  const isOngoing = Boolean(pickSymptomField(row ?? {}, "is_ongoing", "isOngoing")) || !String(symptomEnd ?? "").trim();

  const severityRaw = row ? pickSymptomField(row, "severity") : undefined;
  const stressRaw = row ? pickSymptomField(row, "stress_level") : undefined;

  const bathroomChanged = row ? pickSymptomField(row, "bathroom_frequency_changed") : undefined;
  const bathroomChangeDetails = String(pickSymptomField(row ?? {}, "bathroom_frequency_change_details") ?? "").trim();
  const normalBathroom = String(pickSymptomField(row ?? {}, "normal_bathroom_frequency") ?? "").trim();

  const smoker = row ? pickSymptomField(row, "smoker") : undefined;
  const smokingHabits = String(pickSymptomField(row ?? {}, "smoking_habits") ?? pickSymptomField(row ?? {}, "smoking_details") ?? "").trim();
  const smokedOnDay = row ? pickSymptomField(row, "smoked_on_symptom_day") : undefined;
  const smokedAmount = String(pickSymptomField(row ?? {}, "smoked_amount_on_symptom_day") ?? "").trim();

  const alcohol = row ? pickSymptomField(row, "alcohol") : undefined;
  const averageAlcohol = String(pickSymptomField(row ?? {}, "average_alcohol_units_pw") ?? pickSymptomField(row ?? {}, "alcohol_habits") ?? "").trim();
  const drankOnDay = row ? pickSymptomField(row, "drank_on_symptom_day") : undefined;
  const alcoholUnits = String(pickSymptomField(row ?? {}, "alcohol_units_on_symptom_day") ?? "").trim();

  const breakfast = parseSymptomMealArray(row ? pickSymptomField(row, "breakfast") : undefined);
  const lunch = parseSymptomMealArray(row ? pickSymptomField(row, "lunch") : undefined);
  const dinner = parseSymptomMealArray(row ? pickSymptomField(row, "dinner") : undefined);

  const notesText = String(pickSymptomField(row ?? {}, "notes") ?? "").trim();

  const startStr = String(symptomStart ?? "").trim();
  const timelineStart =
    (startStr ? formatUkDate(startStr) : "") || (createdIso ? formatUkDate(createdIso) : "") || "Not set";
  const timelineEnd = String(symptomEnd ?? "").trim();

  const isFirstTimeLifestyle = typeof smokedOnDay !== "boolean" && typeof drankOnDay !== "boolean";

  const showLifestyleCard =
    isFirstTimeLifestyle ||
    typeof smokedOnDay === "boolean" ||
    typeof drankOnDay === "boolean";

  const mealDetailEntries = (() => {
    const entries: { label: string; items: { food: string; quantity: string }[] }[] = [];
    const add = (label: string, items: unknown[]) => {
      const parsed = items.map(getMealFieldsForDetail).filter((i) => i.food.trim());
      if (parsed.length) entries.push({ label, items: parsed });
    };
    add("Breakfast", breakfast);
    add("Lunch", lunch);
    add("Dinner", dinner);
    return entries;
  })();

  if (loading) {
    return (
      <View style={[logDetailStyles.scroll, styles.centered, { backgroundColor: c.screen, paddingBottom: bottomScrollInset }]}>
        <ActivityIndicator color={c.primary} />
        <Text style={[styles.muted, { color: c.textMuted, marginTop: 12 }]}>Loading…</Text>
      </View>
    );
  }

  if (!row) {
    return (
      <ScrollView style={[logDetailStyles.scroll, { backgroundColor: c.screen }]} contentContainerStyle={{ paddingBottom: bottomScrollInset + 24 }}>
        <Text style={[styles.muted, { color: c.textMuted }]}>Could not load this entry.</Text>
      </ScrollView>
    );
  }

  const smokedReviewValue =
    typeof smokedOnDay === "boolean"
      ? smokedOnDay
        ? smokedAmount || "Yes"
        : "No"
      : smoker === true
        ? "Yes"
        : smoker === false
          ? "No"
          : "Not recorded";

  const alcoholUnitsReviewValue =
    typeof drankOnDay === "boolean"
      ? drankOnDay
        ? alcoholUnits
          ? `${alcoholUnits} units`
          : "Yes"
        : "No"
      : alcohol === true
        ? "Yes"
        : alcohol === false
          ? "No"
          : "Not recorded";

  const basicFields = [
    { label: "Start Date", value: timelineStart },
    { label: "Status", value: isOngoing ? "Ongoing" : "Ended" },
    ...(!isOngoing && timelineEnd ? [{ label: "End Date", value: formatUkDate(timelineEnd) }] : []),
    { label: "Severity", value: formatSymptomScoreDisplay(severityRaw) },
    { label: "Stress Level", value: formatSymptomScoreDisplay(stressRaw) },
  ];

  const bathroomFields = [
    { label: "Frequency", value: normalBathroom ? `${normalBathroom} times/day` : "Not set" },
    ...(bathroomChanged
      ? [{ label: "Frequency Changed", value: bathroomChanged === "yes" ? "Yes" : "No" }]
      : []),
    ...(bathroomChanged === "yes" && bathroomChangeDetails
      ? [{ label: "Change Description", value: bathroomChangeDetails }]
      : []),
  ];

  const lifestyleFields: { label: string; value: string }[] = [];
  if (showLifestyleCard) {
    if (isFirstTimeLifestyle && (smoker === true || smoker === false)) {
      lifestyleFields.push({ label: "Smoker", value: smoker === true ? "Yes" : "No" });
    }
    if (isFirstTimeLifestyle && smoker === true && smokingHabits) {
      lifestyleFields.push({ label: "Smoking Habits", value: smokingHabits });
    }
    if (!isFirstTimeLifestyle && typeof smokedOnDay === "boolean") {
      lifestyleFields.push({ label: "Smoked", value: smokedReviewValue });
    }
    if (isFirstTimeLifestyle && smoker === true && smokedAmount) {
      lifestyleFields.push({ label: "Smoked", value: smokedAmount });
    }
    if (isFirstTimeLifestyle && (alcohol === true || alcohol === false)) {
      lifestyleFields.push({ label: "Alcohol", value: alcohol === true ? "Yes" : "No" });
    }
    if (isFirstTimeLifestyle && alcohol === true && averageAlcohol) {
      lifestyleFields.push({ label: "Alcohol Habits (on average)", value: `${averageAlcohol} units/week` });
    }
    if (!isFirstTimeLifestyle && typeof drankOnDay === "boolean") {
      lifestyleFields.push({ label: "Alcohol Units Consumed", value: alcoholUnitsReviewValue });
    }
    if (isFirstTimeLifestyle && alcohol === true && alcoholUnits) {
      lifestyleFields.push({ label: "Alcohol Units Consumed", value: `${alcoholUnits} units` });
    }
  }

  return (
    <>
      <ScrollView
        style={[logDetailStyles.scroll, { backgroundColor: c.screen }]}
        contentContainerStyle={{ paddingBottom: bottomScrollInset + 24 }}
      >
        <LogDetailAddedHeader text={formatAddedAtHeader(createdIso)} />

        <LogDetailSectionCard title="Basic Information">
          <LogDetailFieldGroup fields={basicFields} />
        </LogDetailSectionCard>

        <LogDetailSectionCard title="Bathroom Frequency">
          <LogDetailFieldGroup fields={bathroomFields} />
        </LogDetailSectionCard>

        {lifestyleFields.length > 0 ? (
          <LogDetailSectionCard title="Lifestyle">
            <LogDetailFieldGroup fields={lifestyleFields} />
          </LogDetailSectionCard>
        ) : null}

        {mealDetailEntries.length > 0 ? (
          <LogDetailSectionCard title="Meals">
            <LogDetailFieldGroup
              fields={mealDetailEntries.map((entry) => ({
                label: entry.label,
                value: entry.items
                  .map((item) => `${item.food}${item.quantity ? ` (${item.quantity})` : ""}`)
                  .join("\n"),
              }))}
            />
          </LogDetailSectionCard>
        ) : null}

        {notesText ? <LogDetailNotesCard notes={notesText} /> : null}
      </ScrollView>
      <ConfirmModal
        visible={deleteConfirmOpen}
        title="Delete symptom log"
        message="Are you sure you want to delete this symptom log? This action cannot be undone."
        confirmLabel={deleting ? "Deleting…" : "Delete"}
        confirmDestructive
        onCancel={() => setDeleteConfirmOpen(false)}
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
}

function MedicationTrackingHistoryScreen({ user }: { user: SessionUser }) {
  const navigation = useNavigation<any>();
  const c = useFlareColors();
  const insets = useSafeAreaInsets();
  const bottomScrollInset = useBottomTabScrollInset();
  const { visible: showMedicationHistoryInstruction, dismiss: dismissMedicationHistoryInstruction } =
    useInstructionTip(
      user.id,
      readMedicationHistoryInstructionEligible,
      readMedicationHistoryInstructionDismissed,
      markMedicationHistoryInstructionDismissed,
    );
  const { rows, visibleCount, hasMore, loading, loadingMore, loadMore, refresh, syncExpandedFromCache } =
    useWizardLogHistory(user.id, TABLES.LOG_MEDICATIONS);
  const medicationLogItemIds = useMemo(() => rows.map((row) => String(row.id)), [rows]);
  const {
    selectionMode,
    selectedIds,
    bulkDeleteOpen,
    setBulkDeleteOpen,
    bulkDeleting,
    enterSelectionWith,
    toggleSelect,
    runBulkDelete,
  } = useLogListSelection({
    routeName: "MedicationTrackingHistory",
    itemIds: medicationLogItemIds,
    navigation,
    headerTitle: "History",
  });
  const selectionBarInset = selectionMode ? bottomTabBarHeight(insets.bottom) : 0;

  useFocusEffect(
    useCallback(() => {
      syncExpandedFromCache();
      void refresh();
    }, [refresh, syncExpandedFromCache]),
  );
  const medicationLogItems = rows.map((row) =>
    buildTimestampLogRowItem({
      id: String(row.id),
      title: "Medication Log",
      whenIso: row.created_at,
    }),
  );

  const handleBulkDeleteConfirm = useCallback(() => {
    void runBulkDelete(async (ids) => {
      const result = await deleteUserLogRows(TABLES.LOG_MEDICATIONS, ids, user.id);
      if (!result.ok) {
        showFlareAlert("Could not delete", result.message);
        throw new Error(result.message);
      }
      await recordRecentActivityEvent(user.id, "medication-log-deleted");
      invalidateDashboardSnapshot(user.id);
      await refresh();
    });
  }, [refresh, runBulkDelete, user.id]);

  return (
    <InstructionScreenShell
      showInstruction={showMedicationHistoryInstruction}
      contentPaddingBottom={bottomScrollInset + selectionBarInset + 24}
      instruction={
        <FloatingWelcomeCard
          instruction={MEDICATION_LOGS_HISTORY_INSTRUCTION}
          icon={TRACK_MEDICATIONS_MCI_ICON}
          onDismiss={dismissMedicationHistoryInstruction}
          dismissAccessibilityLabel="Dismiss medication logs guide"
        />
      }
      footer={
        <ConfirmModal
          visible={bulkDeleteOpen}
          title={selectedIds.size === 1 ? "Delete medication log?" : `Delete ${selectedIds.size} medication logs?`}
          message="This action cannot be undone."
          confirmLabel={bulkDeleting ? "Deleting…" : "Delete"}
          confirmDestructive
          onConfirm={handleBulkDeleteConfirm}
          onCancel={() => setBulkDeleteOpen(false)}
        />
      }
    >
      <LogHistoryCard>
        <View style={logHistoryCardStyles.trackerCardBody}>
          {loading && rows.length === 0 ? (
            <LogHistoryListLoading />
          ) : rows.length === 0 ? (
            <LogHistoryEmptyState icon={TRACK_MEDICATIONS_MCI_ICON} />
          ) : (
            <LogHistoryPreviewList
              items={medicationLogItems}
              visibleCount={visibleCount}
              hasMore={hasMore}
              loadingMore={loadingMore}
              onLoadMore={() => void loadMore()}
              rowTextLayout="compact"
              onPressItem={(logId) => navigation.navigate("MedicationLogDetail", { id: logId })}
              selectionMode={selectionMode}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
              onLongPressItem={enterSelectionWith}
            />
          )}
        </View>
      </LogHistoryCard>
    </InstructionScreenShell>
  );
}

function MedicationLogDetailScreen({ user }: { user: SessionUser }) {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const c = useFlareColors();
  const bottomScrollInset = useBottomTabScrollInset();
  const id = String((route.params as { id?: string })?.id ?? "");
  const [loading, setLoading] = useState(true);
  const [row, setRow] = useState<Record<string, unknown> | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const deleteInFlight = useRef(false);
  const load = useCallback(async () => {
    if (!id) {
      setRow(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.from(TABLES.LOG_MEDICATIONS).select("*").eq("user_id", user.id).eq("id", id).maybeSingle();
    if (error) {
      setRow(null);
    } else {
      setRow((data as Record<string, unknown>) ?? null);
    }
    setLoading(false);
  }, [user.id, id]);
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const handleDeleteConfirm = useCallback(async () => {
    if (deleteInFlight.current || !id) return;
    deleteInFlight.current = true;
    setDeleting(true);
    setDeleteConfirmOpen(false);
    const result = await deleteUserLogRow(TABLES.LOG_MEDICATIONS, id, user.id);
    setDeleting(false);
    deleteInFlight.current = false;
    if (!result.ok) {
      showFlareAlert("Could not delete", result.message);
      return;
    }
    await recordRecentActivityEvent(user.id, "medication-log-deleted");
    invalidateDashboardSnapshot(user.id);
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate("MedicationTrackingHistory");
  }, [id, navigation, user.id]);

  useLayoutEffect(() => {
    if (loading || !row) {
      navigation.setOptions({ headerRight: undefined });
      return;
    }
    navigation.setOptions({
      headerRight: () => (
        <DetailDeleteHeaderButton onPress={() => setDeleteConfirmOpen(true)} disabled={deleting} />
      ),
    });
    return () => {
      navigation.setOptions({ headerRight: undefined });
    };
  }, [deleting, loading, navigation, row]);

  const createdIso = row?.created_at != null ? String(row.created_at) : "";

  const missedItems = parseMedicationLogList(row?.missed_medications_list, false);
  const nsaidItems = parseMedicationLogList(row?.nsaid_list, true);
  const antibioticItems = parseMedicationLogList(row?.antibiotic_list, true);

  const renderListSection = (
    title: string,
    items: MedicationLogDetailItem[],
    showDosage: boolean,
  ) => {
    if (!items.length) return null;
    const groups = items.map((item) => [
      { label: "Medication", value: item.medication },
      ...(showDosage ? [{ label: "Dosage", value: item.dosage || "N/A" }] : []),
      { label: "Date", value: item.date ? formatUkDate(item.date) : "N/A" },
      { label: "Time of Day", value: item.timeOfDay || "N/A" },
    ]);
    return (
      <LogDetailSectionCard title={title}>
        <LogDetailFieldGroups groups={groups} />
      </LogDetailSectionCard>
    );
  };

  if (loading) {
    return (
      <View style={[logDetailStyles.scroll, styles.centered, { backgroundColor: c.screen, paddingBottom: bottomScrollInset }]}>
        <ActivityIndicator color={c.primary} />
        <Text style={[styles.muted, { color: c.textMuted, marginTop: 12 }]}>Loading…</Text>
      </View>
    );
  }

  if (!row) {
    return (
      <ScrollView style={[logDetailStyles.scroll, { backgroundColor: c.screen }]} contentContainerStyle={{ paddingBottom: bottomScrollInset + 24 }}>
        <Text style={[styles.muted, { color: c.textMuted }]}>Could not load this entry.</Text>
      </ScrollView>
    );
  }

  return (
    <>
      <ScrollView
        style={[logDetailStyles.scroll, { backgroundColor: c.screen }]}
        contentContainerStyle={{ paddingBottom: bottomScrollInset + 24 }}
      >
        <LogDetailAddedHeader text={formatAddedAtHeader(createdIso)} />

        <LogDetailSectionCard title="Summary">
          <LogDetailFieldGroup
            fields={[
              { label: "Missed medications", value: String(missedItems.length) },
              { label: "NSAIDs", value: String(nsaidItems.length) },
              { label: "Antibiotics", value: String(antibioticItems.length) },
            ]}
          />
        </LogDetailSectionCard>

        {renderListSection("Missed Medications", missedItems, false)}
        {renderListSection("NSAIDs Taken", nsaidItems, true)}
        {renderListSection("Antibiotics Taken", antibioticItems, true)}
      </ScrollView>
      <ConfirmModal
        visible={deleteConfirmOpen}
        title="Delete medication log"
        message="Are you sure you want to delete this medication log? This action cannot be undone."
        confirmLabel={deleting ? "Deleting…" : "Delete"}
        confirmDestructive
        onCancel={() => setDeleteConfirmOpen(false)}
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
}

function HydrationScreen({ user }: { user: SessionUser }) {
  const c = useFlareColors();
  const navigation = useNavigation<any>();
  const bottomScrollInset = useBottomTabScrollInset();
  const { visible: showHydrationInstruction, dismiss: dismissHydrationInstruction } = useInstructionTip(
    user.id,
    readHydrationInstructionEligible,
    readHydrationInstructionDismissed,
    markHydrationInstructionDismissed,
  );
  const [glasses, setGlasses] = useState(() => dashboardSnapshotByUserId[user.id]?.todaySummary.hydration ?? 0);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const glassesRef = useRef(glasses);
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const today = todayYmd();
  const atGoal = glasses >= HYDRATION_TARGET;

  useEffect(() => {
    glassesRef.current = glasses;
  }, [glasses]);

  useEffect(() => {
    return () => {
      if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    };
  }, []);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from(TABLES.DAILY_HYDRATION)
      .select("glasses")
      .eq("user_id", user.id)
      .eq("date", today)
      .maybeSingle();
    if (error) {
      setGlasses(0);
    } else {
      setGlasses(data?.glasses ?? 0);
    }
  }, [today, user.id]);

  useFocusEffect(
    useCallback(() => {
      const cached = dashboardSnapshotByUserId[user.id]?.todaySummary.hydration;
      if (cached !== undefined) setGlasses(cached);
      const task = InteractionManager.runAfterInteractions(() => {
        void load();
      });
      return () => task.cancel();
    }, [load, user.id]),
  );

  const persistGlasses = useCallback(
    (next: number) => {
      const clamped = Math.max(0, Math.min(HYDRATION_TARGET, next));
      glassesRef.current = clamped;
      setGlasses(clamped);
      if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
      persistTimerRef.current = setTimeout(() => {
        void (async () => {
          const toSave = glassesRef.current;
          const { error } = await supabase.from(TABLES.DAILY_HYDRATION).upsert(
            { user_id: user.id, date: today, glasses: toSave, updated_at: new Date().toISOString() },
            { onConflict: "user_id,date" },
          );
          if (error) {
            showFlareAlert("Could not update hydration", error.message);
            void load();
            return;
          }
          invalidateDashboardSnapshot(user.id);
        })();
      }, 280);
    },
    [load, today, user.id],
  );

  const handleResetConfirm = useCallback(async () => {
    setResetConfirmOpen(false);
    await saveHydrationReset(user.id, today);
    persistGlasses(0);
  }, [persistGlasses, today, user.id]);

  return (
    <InstructionScreenShell
      showInstruction={showHydrationInstruction}
      contentPaddingBottom={bottomScrollInset + 32}
      instruction={
        <FloatingWelcomeCard
          instruction={HYDRATION_INSTRUCTION}
          icon={HYDRATION_MCI_ICON}
          onDismiss={dismissHydrationInstruction}
          dismissAccessibilityLabel="Dismiss My Hydration guide"
        />
      }
      footer={
        <ConfirmModal
          visible={resetConfirmOpen}
          title="Reset today's progress"
          message="This will reset today's hydration progress to 0. This action can't be undone."
          confirmLabel="Reset"
          cancelLabel="Cancel"
          onCancel={() => setResetConfirmOpen(false)}
          onConfirm={handleResetConfirm}
        />
      }
      interactiveWhileInstruction={
        <Pressable
          accessibilityRole="link"
          accessibilityLabel="Daily Intake Guidelines for adults"
          onPress={() => navigation.navigate("AccountHelp", { expandSection: "hydration" })}
          style={({ pressed }) => [styles.hydrationHelpLinkPress, pressed && { opacity: 0.7 }]}
        >
          <Ionicons name="book-outline" size={16} color={c.textSecondary} accessibilityIgnoresInvertColors />
          <Text style={[styles.hydrationHelpLink, { color: c.text }]}>Daily Intake Guidelines</Text>
        </Pressable>
      }
    >
      <LogHistoryCard style={styles.hydrationCard}>
        <View style={styles.hydrationTrackerBody}>
          <HydrationProgressRing glasses={glasses} target={HYDRATION_TARGET} atGoal={atGoal} />

          <HydrationStepper
            value={glasses}
            min={0}
            max={HYDRATION_TARGET}
            onChange={persistGlasses}
            atGoal={atGoal}
            onReset={() => setResetConfirmOpen(true)}
          />
        </View>
      </LogHistoryCard>
    </InstructionScreenShell>
  );
}

function ReportsScreen({ user }: { user: SessionUser }) {
  const c = useFlareColors();
  const bottomScrollInset = useBottomTabScrollInset();
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<string>("");
  const [email, setEmail] = useState("");
  const { visible: showReportsInstruction, dismiss: dismissReportsInstruction } = useInstructionTip(
    user.id,
    readReportsInstructionEligible,
    readReportsInstructionDismissed,
    markReportsInstructionDismissed,
  );

  const generate = async () => {
    setLoading(true);
    const [symptoms, meds, hydration, bowel, weight, appts] = await Promise.all([
      supabase.from(TABLES.LOG_SYMPTOMS).select("*").eq("user_id", user.id),
      supabase.from(TABLES.LOG_MEDICATIONS).select("*").eq("user_id", user.id),
      supabase.from(TABLES.DAILY_HYDRATION).select("*").eq("user_id", user.id),
      supabase.from(TABLES.BOWEL_MOVEMENTS).select("*").eq("user_id", user.id),
      supabase.from(TABLES.TRACK_WEIGHT).select("*").eq("user_id", user.id),
      supabase.from(TABLES.APPOINTMENTS).select("*").eq("user_id", user.id),
    ]);
    const hydrationLines = (hydration.data ?? [])
      .slice()
      .sort((a, b) => String(a.date).localeCompare(String(b.date)))
      .map((entry) => {
        const count = entry.glasses ?? 0;
        const met = count >= HYDRATION_TARGET ? " (goal met)" : "";
        return `${entry.date}: ${count}/${HYDRATION_TARGET} glasses${met}`;
      });
    const text = [
      `Symptoms: ${symptoms.data?.length ?? 0}`,
      `Medication tracking logs: ${meds.data?.length ?? 0}`,
      hydrationLines.length ? `Hydration logs:\n${hydrationLines.join("\n")}` : "Hydration logs: none",
      `Bowel logs: ${bowel.data?.length ?? 0}`,
      `Weight logs: ${weight.data?.length ?? 0}`,
      `Appointments: ${appts.data?.length ?? 0}`,
    ].join("\n");
    setReport(text);
    setLoading(false);
  };

  const emailReport = async () => {
    const base = process.env.EXPO_PUBLIC_WEB_API_BASE_URL;
    if (!base) return showFlareAlert("Missing API base URL", "Set EXPO_PUBLIC_WEB_API_BASE_URL");
    const response = await fetch(`${base}/api/send-report-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clinicianEmail: email, reportText: report }),
    });
    if (!response.ok) {
      showFlareAlert("Email failed", "Could not send report email.");
      return;
    }
    showFlareAlert("Report sent", "Clinician email workflow completed.");
  };

  return (
    <InstructionScreenShell
      showInstruction={showReportsInstruction}
      contentPaddingBottom={bottomScrollInset}
      instruction={
        <FloatingWelcomeCard
          instruction={REPORTS_INSTRUCTION}
          icon="document-text-outline"
          iconFamily="ion"
          onDismiss={dismissReportsInstruction}
          dismissAccessibilityLabel="Dismiss reports guide"
        />
      }
    >
      <Card title="Reports & Briefs">
        <PrimaryButton title={loading ? "Generating..." : "Generate report"} onPress={generate} />
        <Text
          style={[styles.reportBox, { backgroundColor: c.reportBg, borderColor: c.reportBorder, color: c.text }]}
        >
          {report || "Generate to view summary."}
        </Text>
        <LabeledInput label="Clinician email" value={email} onChangeText={setEmail} placeholder="Clinician email" autoCapitalize="none" />
        <PrimaryButton title="Email report" onPress={emailReport} disabled={!report || !email} />
      </Card>
    </InstructionScreenShell>
  );
}

const NOTIFICATION_HELP_SECTIONS = [
  {
    label: "Phone settings",
    steps: [
      "Open your phone settings for Flare Care Mobile.",
      "Turn notifications on.",
    ],
  },
];

function NotificationHelpContent() {
  const c = useFlareColors();
  const [deviceSection] = NOTIFICATION_HELP_SECTIONS;

  return (
    <>
      <Text style={[logHistoryCardStyles.trackerIntro, styles.helpCardIntro, { color: c.textMuted }]}>
        If you&apos;re still not getting alerts, check that notifications are enabled for the app in your device settings.
      </Text>

      <View style={styles.remindersHelpPathItem}>
        <Text style={[styles.notificationHelpSectionTitle, { color: c.text }]}>{deviceSection.label}</Text>
        <View style={styles.notificationHelpStepList}>
          {deviceSection.steps.map((step) => (
            <View key={step} style={styles.notificationHelpStepRow}>
              <Text style={[styles.notificationHelpStepBullet, { color: c.primary }]}>•</Text>
              <Text style={[styles.text, styles.notificationHelpStepText, { color: c.textMuted }]}>{step}</Text>
            </View>
          ))}
        </View>
        <View style={styles.notificationHelpAction}>
          <PrimaryButton title="Open phone settings" onPress={() => void openAppNotificationSettings()} />
        </View>
      </View>
    </>
  );
}

function HydrationHelpContent() {
  const c = useFlareColors();
  const guidelineSteps = [
    `Aim for ${HYDRATION_TARGET} glasses of fluid per day (around 250ml per glass).`,
    "Most adults need about 1.5–2 litres of fluid daily (roughly 6–8 glasses).",
    "Water is usually the best choice, though other drinks also contribute to your fluid intake.",
    "You may need more fluids during hot weather, exercise, or a flare. Follow advice from your care team if it differs.",
  ];

  return (
    <>
      <Text style={[logHistoryCardStyles.trackerIntro, styles.helpCardIntro, { color: c.textMuted }]}>
        The guidelines below outline typical daily fluid intake recommendations for adults.
      </Text>
      <View style={styles.notificationHelpStepList}>
        {guidelineSteps.map((step) => (
          <View key={step} style={styles.notificationHelpStepRow}>
            <Text style={[styles.notificationHelpStepBullet, { color: c.primary }]}>•</Text>
            <Text style={[styles.text, styles.notificationHelpStepText, { color: c.textMuted }]}>{step}</Text>
          </View>
        ))}
      </View>
      <Text style={[styles.muted, styles.notificationHelpEmphasis, { color: c.textMuted, lineHeight: 20 }]}>
        This information is general guidance only and is not personal medical advice.
      </Text>
    </>
  );
}

function AppointmentSummaryHelpContent() {
  const c = useFlareColors();
  const steps = [
    "From Appointments, tap Appointment Summary.",
    "Choose a time period — a preset (2, 4, or 6 weeks) or a custom date range.",
    "Review each section: Health Overview, Next Appointment, and What Changed.",
    "Tap Share or Email to send your summary to your clinician.",
  ];

  return (
    <>
      <Text style={[logHistoryCardStyles.trackerIntro, styles.helpCardIntro, { color: c.textMuted }]}>
        Appointment Summary pulls together your recent logs so you can prepare for a visit.
      </Text>
      <View style={styles.notificationHelpStepList}>
        {steps.map((step) => (
          <View key={step} style={styles.notificationHelpStepRow}>
            <Text style={[styles.notificationHelpStepBullet, { color: c.primary }]}>•</Text>
            <Text style={[styles.text, styles.notificationHelpStepText, { color: c.textMuted }]}>{step}</Text>
          </View>
        ))}
      </View>
      <Text style={[styles.muted, styles.notificationHelpEmphasis, { color: c.textMuted, lineHeight: 20 }]}>
        Add upcoming appointments in Appointments so your summary can include your next visit.
      </Text>
    </>
  );
}

function HelpSectionDropdown({
  title,
  expanded,
  onToggle,
  children,
}: {
  title: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  const c = useFlareColors();
  return (
    <View style={[logHistoryCardStyles.trackerCard, { backgroundColor: c.card, gap: 0 }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={title}
        onPress={onToggle}
        style={[styles.helpSectionToggle, expanded && styles.helpSectionToggleExpanded]}
      >
        <Text style={[logHistoryListStyles.logPrimary, styles.helpSectionToggleTitle, { color: c.text }]}>
          {title}
        </Text>
        <Text style={[styles.helpSectionToggleMark, { color: c.text }]} accessibilityElementsHidden>
          {expanded ? "−" : "+"}
        </Text>
      </Pressable>
      {expanded ? <View style={styles.helpSectionBody}>{children}</View> : null}
    </View>
  );
}

function AccountHelpScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const c = useFlareColors();
  const bottomScrollInset = useBottomTabScrollInset();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [hydrationOpen, setHydrationOpen] = useState(false);
  const [appointmentSummaryOpen, setAppointmentSummaryOpen] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const section = route.params?.expandSection;
      if (section === "notifications") {
        setNotificationsOpen(true);
        setHydrationOpen(false);
        setAppointmentSummaryOpen(false);
        navigation.setParams({ expandSection: undefined });
      } else if (section === "hydration") {
        setHydrationOpen(true);
        setNotificationsOpen(false);
        setAppointmentSummaryOpen(false);
        navigation.setParams({ expandSection: undefined });
      } else if (section === "appointmentSummary") {
        setAppointmentSummaryOpen(true);
        setNotificationsOpen(false);
        setHydrationOpen(false);
        navigation.setParams({ expandSection: undefined });
      }
    }, [navigation, route.params?.expandSection]),
  );

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: c.screen }]}
      contentContainerStyle={[styles.accountScrollContent, { paddingBottom: bottomScrollInset + 24 }]}
    >
      <HelpSectionDropdown
        title="Notifications"
        expanded={notificationsOpen}
        onToggle={() => setNotificationsOpen((open) => !open)}
      >
        <NotificationHelpContent />
      </HelpSectionDropdown>
      <HelpSectionDropdown
        title="Daily Intake Guidelines"
        expanded={hydrationOpen}
        onToggle={() => setHydrationOpen((open) => !open)}
      >
        <HydrationHelpContent />
      </HelpSectionDropdown>
      <HelpSectionDropdown
        title="Appointments"
        expanded={appointmentSummaryOpen}
        onToggle={() => setAppointmentSummaryOpen((open) => !open)}
      >
        <AppointmentSummaryHelpContent />
      </HelpSectionDropdown>
    </ScrollView>
  );
}

function NotificationsScreen({ user }: { user: SessionUser }) {
  const c = useFlareColors();
  const navigation = useNavigation<any>();
  const bottomScrollInset = useBottomTabScrollInset();
  const initialCache = getCachedReminderStatus();
  const [permissionGranted, setPermissionGranted] = useState(
    () => initialCache?.permissionGranted ?? false,
  );
  const [scheduled, setScheduled] = useState(() => initialCache?.scheduled ?? 0);
  const [statusReady, setStatusReady] = useState(() => initialCache !== null);
  const [lastError, setLastError] = useState("");

  useLayoutEffect(() => {
    let cancelled = false;
    void hydrateReminderStatusCache().then((cached) => {
      if (cancelled || !cached) return;
      setPermissionGranted(cached.permissionGranted);
      setScheduled(cached.scheduled);
      setStatusReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const refreshReminderStatus = useCallback(async () => {
    if (!Notifications) return;
    try {
      await ensureLocalReminderNotificationsReady();
      let { status } = await Notifications.getPermissionsAsync();
      if (status === "undetermined") {
        const { status: nextStatus } = await Notifications.requestPermissionsAsync();
        status = nextStatus;
      }
      const granted = status === "granted";
      let scheduledCount = 0;
      if (granted) {
        await rescheduleLocalRemindersIfGranted(user.id);
        scheduledCount = await getLocalReminderScheduledCount();
        void registerExpoPushTokenBestEffort().catch(() => {});
      }
      await setCachedReminderStatus({ permissionGranted: granted, scheduled: scheduledCount });
      setPermissionGranted(granted);
      setScheduled(scheduledCount);
      setStatusReady(true);
      setLastError("");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Could not update reminder status.";
      setLastError(message);
      setStatusReady(true);
    }
  }, [user.id]);

  useFocusEffect(
    useCallback(() => {
      void refreshReminderStatus();
    }, [refreshReminderStatus]),
  );

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        void refreshReminderStatus();
      }
    });
    return () => subscription.remove();
  }, [refreshReminderStatus]);

  const reminderStatusSubtitle = !statusReady
    ? ""
    : !permissionGranted
      ? "Turn on notifications in your phone settings"
      : scheduled === 0
        ? "No reminders scheduled."
        : `You have ${scheduled} reminder${scheduled === 1 ? "" : "s"} scheduled.`;

  const reminderStatusTitle = permissionGranted ? "Notifications on" : "Notifications off";

  const reminderStatusIcon = permissionGranted ? "notifications" : "notifications-off-outline";

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: c.screen }]}
      contentContainerStyle={{ paddingBottom: bottomScrollInset + 16 }}
    >
      <Card title="" style={styles.accountPaddedCard} compactBody>
        <View style={styles.remindersStatusRow}>
          <View style={[styles.accountAvatarWell, { backgroundColor: c.surfaceSubtle }]}>
            <Ionicons
              name={reminderStatusIcon}
              size={26}
              color={c.primary}
              accessibilityIgnoresInvertColors
            />
          </View>
          <View style={styles.accountIdentityTextCol}>
            <Text style={[styles.accountFirstName, { color: c.text }]}>{reminderStatusTitle}</Text>
            {reminderStatusSubtitle ? (
              <Text style={[styles.remindersStatusSubtitle, { color: c.textMuted }]}>{reminderStatusSubtitle}</Text>
            ) : null}
          </View>
        </View>

        {!statusReady ? (
          <View style={styles.remindersStatusLoading}>
            <ActivityIndicator size="small" color={c.primary} />
          </View>
        ) : !permissionGranted ? (
          <View style={styles.remindersSetupBlock}>
            <Text style={[styles.muted, { color: c.textMuted, lineHeight: 20 }]}>{REMINDERS_SETUP_INTRO_OFF}</Text>
            <PrimaryButton title="Open phone settings" onPress={() => void openAppNotificationSettings()} />
          </View>
        ) : (
          <Text style={[styles.muted, { color: c.textMuted, marginTop: 16, lineHeight: 20 }]}>
            {scheduled > 0 ? REMINDERS_READY_BODY : REMINDERS_READY_NONE}
          </Text>
        )}

        {lastError ? (
          <Text style={[flareFieldErrorStyle(c, "wizard"), { marginTop: 12 }]}>{lastError}</Text>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Notification help"
          onPress={() => navigation.navigate("AccountHelp", { expandSection: "notifications" })}
          style={({ pressed }) => [styles.remindersGuideLinkPress, pressed && { opacity: 0.7 }]}
        >
          <Text style={[styles.remindersGuideLink, { color: c.text }]}>Not getting alerts?</Text>
        </Pressable>
      </Card>
    </ScrollView>
  );
}

const IBD_SYMPTOMS = [
  "Abdominal pain and cramping",
  "Diarrhea (sometimes bloody)",
  "Urgent need to have a bowel movement",
  "Feeling of incomplete bowel movement",
  "Nausea and vomiting",
  "Fatigue and low energy",
  "Unintended weight loss",
  "Loss of appetite",
  "Fever during flare-ups",
  "Joint pain and swelling",
];

const IBD_FLARECARE_HELPS = [
  "Log daily symptoms with severity ratings",
  "Record foods that may trigger symptoms",
  "Track patterns and trends over time",
  "Set medication and appointment reminders",
  "Track dosage and timing",
  "Generate reports for your doctor",
];

const IBD_TRIGGERS = [
  "Spicy foods, dairy, high-fiber foods, alcohol, and caffeine can trigger symptoms",
  "Emotional stress and anxiety can worsen symptoms and trigger flare-ups",
  "Viral or bacterial infections can trigger or worsen IBD symptoms",
];

function IbdBulletList({ items, isLastInSection }: { items: string[]; isLastInSection?: boolean }) {
  const c = useFlareColors();
  return (
    <View style={[styles.ibdBulletList, isLastInSection && styles.infoSectionContentEnd]}>
      {items.map((item) => (
        <View key={item} style={styles.ibdBulletRow}>
          <Text style={[styles.ibdBulletDot, { color: c.primary }]}>•</Text>
          <Text style={[styles.text, styles.ibdBulletText, { color: c.textMuted }]}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

function IbdCheckList({ items, isLastInSection }: { items: string[]; isLastInSection?: boolean }) {
  const c = useFlareColors();
  return (
    <View style={[styles.ibdCheckList, isLastInSection && styles.infoSectionContentEnd]}>
      {items.map((item) => (
        <View key={item} style={styles.ibdCheckRow}>
          <Ionicons name="checkmark" size={16} color={c.primary} style={styles.ibdCheckIcon} accessibilityIgnoresInvertColors />
          <Text style={[styles.text, styles.ibdCheckText, { color: c.textMuted }]}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

function IbdScreen() {
  const c = useFlareColors();
  const insets = useSafeAreaInsets();
  const bottomScrollInset = useBottomTabScrollInset();

  return (
    <CollapsingTitleScrollScreen
      title="What is IBD?"
      titlePreset="informational"
      bottomInset={Math.max(insets.bottom, 16) + 48 + bottomScrollInset}
    >
      <Text style={[styles.text, styles.ibdIntro, { color: c.textMuted }]}>
        Inflammatory Bowel Disease (IBD) is a term used to describe disorders that involve chronic inflammation of your
        digestive tract.
      </Text>

      <Text style={[styles.text, styles.aboutBody, { color: c.textMuted }]}>The two main types are:</Text>
      <Text style={[styles.dashboardSectionTitleLeft, { color: c.text }]}>Crohn&apos;s Disease</Text>
      <IbdBulletList
        items={[
          "Can affect any part of the digestive tract",
          "Inflammation can be patchy with healthy areas in between",
          "Can affect the full thickness of the bowel wall",
          "May cause complications like fistulas and strictures",
        ]}
        isLastInSection
      />

      <Text style={[styles.dashboardSectionTitleLeft, styles.aboutContactSectionTitle, { color: c.text }]}>Ulcerative Colitis</Text>
      <IbdBulletList
        items={[
          "Affects only the colon and rectum",
          "Inflammation is continuous, starting from the rectum",
          "Usually affects only the inner lining of the colon",
          "May increase risk of colon cancer over time",
        ]}
        isLastInSection
      />

      <Text style={[styles.dashboardSectionTitleLeft, styles.aboutContactSectionTitle, { color: c.text }]}>
        Common Symptoms Include
      </Text>
      <IbdBulletList items={IBD_SYMPTOMS} isLastInSection />

      <Text style={[styles.dashboardSectionTitleLeft, styles.aboutContactSectionTitle, { color: c.text }]}>Common Triggers</Text>
      <IbdBulletList items={IBD_TRIGGERS} isLastInSection />

      <Text style={[styles.dashboardSectionTitleLeft, styles.aboutContactSectionTitle, { color: c.text }]}>How FlareCare Can Help</Text>
      <IbdCheckList items={IBD_FLARECARE_HELPS} isLastInSection />
    </CollapsingTitleScrollScreen>
  );
}

function NutritionGuideScreen() {
  const c = useFlareColors();
  const insets = useSafeAreaInsets();
  const bottomScrollInset = useBottomTabScrollInset();

  return (
    <CollapsingTitleScrollScreen
      title="Nutrition Guide"
      titlePreset="informational"
      bottomInset={Math.max(insets.bottom, 16) + 48 + bottomScrollInset}
    >
      <Text style={[styles.text, styles.ibdIntro, { color: c.textMuted }]}>{NUTRITION_GUIDE_INTRO}</Text>

      <Text style={[styles.dashboardSectionTitleLeft, { color: c.text }]}>Food Categories</Text>
      {NUTRITION_CATEGORIES.map((category, index) => (
        <View key={category.title}>
          <Text style={[styles.ibdSubsectionTitle, index === 0 && { marginTop: 8 }, { color: c.text }]}>
            {category.title}
          </Text>
          <Text style={[styles.text, styles.aboutBody, { color: c.textMuted }]}>{category.description}</Text>
          <Text style={[styles.text, styles.nutritionExamplesLabel, { color: c.textMuted }]}>Examples</Text>
          <IbdBulletList items={category.examples} isLastInSection={index === NUTRITION_CATEGORIES.length - 1} />
        </View>
      ))}

      <Text style={[styles.dashboardSectionTitleLeft, styles.aboutContactSectionTitle, { color: c.text }]}>
        IBD Foods
      </Text>
      <Text style={[styles.ibdSubsectionTitle, { marginTop: 8, color: c.text }]}>Generally Safe</Text>
      <Text style={[styles.text, styles.aboutBody, { color: c.textMuted }]}>{NUTRITION_IBD_SAFE}</Text>
      <Text style={[styles.ibdSubsectionTitle, { color: c.text }]}>Try Carefully</Text>
      <Text style={[styles.text, styles.aboutBody, { color: c.textMuted }]}>{NUTRITION_IBD_CAREFUL}</Text>
      <Text style={[styles.ibdSubsectionTitle, { color: c.text }]}>Avoid During Flares</Text>
      <Text style={[styles.text, styles.aboutBodyLast, { color: c.textMuted }]}>{NUTRITION_IBD_AVOID_FLARE}</Text>

      <Text style={[styles.dashboardSectionTitleLeft, styles.aboutContactSectionTitle, { color: c.text }]}>
        Quick Food Tips
      </Text>
      <IbdCheckList items={NUTRITION_QUICK_TIPS} isLastInSection />

      <Text style={[styles.dashboardSectionTitleLeft, styles.aboutContactSectionTitle, { color: c.text }]}>
        Helpful Tips
      </Text>
      <IbdBulletList items={NUTRITION_HELPFUL_TIPS} isLastInSection />

      <Text style={[styles.dashboardSectionTitleLeft, styles.aboutContactSectionTitle, { color: c.text }]}>Note</Text>
      <Text style={[styles.text, styles.aboutBodyLast, { color: c.textMuted }]}>{NUTRITION_GUIDE_NOTE}</Text>
    </CollapsingTitleScrollScreen>
  );
}

function AboutScreen() {
  const c = useFlareColors();
  const insets = useSafeAreaInsets();
  const bottomScrollInset = useBottomTabScrollInset();
  const version = Constants.expoConfig?.version ?? Constants.nativeApplicationVersion ?? "—";
  const nativeBuild = Constants.nativeBuildVersion;

  const aboutSupportEmail = () => {
    Linking.openURL("mailto:support@flarecare.app").catch(() => {});
  };

  return (
    <CollapsingTitleScrollScreen
      title="About"
      titlePreset="informational"
      bottomInset={Math.max(insets.bottom, 16) + 48 + bottomScrollInset}
    >
      <Text style={[styles.text, styles.aboutTagline, { color: c.textMuted }]}>
        A personal journey turned into a tool for the community
      </Text>

      <Text style={[styles.dashboardSectionTitleLeft, { color: c.text }]}>What is FlareCare?</Text>
      <Text style={[styles.text, styles.aboutBody, { color: c.textMuted }]}>
        FlareCare is a mobile app for IBD self-management. You can record symptoms, medications, hydration, bowel
        movements, weight, and appointments; receive medication reminders; review summaries on your dashboard; prepare
        appointment briefs; and export reports to share with your clinician—all in one place on your device.
      </Text>
      <Text style={[styles.text, styles.aboutBody, { color: c.textMuted }]}>
        It is aimed at people living with IBD. The product was developed by Simon
        Sutherland, drawing on many years of personal experience managing Crohn&apos;s, to make consistent tracking simple
        enough to sustain between clinic visits.
      </Text>
      <Text style={[styles.text, styles.aboutBodyLast, { color: c.textMuted }]}>
        FlareCare does not provide medical advice, diagnosis, or treatment, and it is not a substitute for professional
        medical care. Always follow the advice of your qualified healthcare providers.
      </Text>

      <Text style={[styles.dashboardSectionTitleLeft, styles.aboutContactSectionTitle, { color: c.text }]}>Contact</Text>
      <Text style={[styles.text, styles.aboutBody, styles.aboutContactIntro, { color: c.textMuted }]}>
        For support, feedback, or feature requests, please email us using the address below.
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Email FlareCare support"
        onPress={aboutSupportEmail}
        style={({ pressed }) => [styles.aboutSupportButton, pressed && styles.aboutSupportButtonPressed]}
      >
        <Text style={[styles.aboutSupportButtonText, { color: c.primary }]}>support@flarecare.app</Text>
      </Pressable>

      <View style={styles.aboutFooter}>
        <Text style={[styles.muted, { color: c.textMuted, textAlign: "center" }]}>Version {version}</Text>
        {nativeBuild && nativeBuild !== version ? (
          <Text style={[styles.muted, { color: c.textMuted, textAlign: "center", marginTop: 4 }]}>Build {nativeBuild}</Text>
        ) : null}
      </View>
    </CollapsingTitleScrollScreen>
  );
}

const ACCOUNT_OPTION_ROUTES = [
  { label: "Information", route: "AccountInfo" as const },
  { label: "Security", route: "AccountSecurity" as const },
  { label: "Legal", route: "AccountLegal" as const },
  { label: "Help", route: "AccountHelp" as const },
];

function AccountInfoScreen({ user }: { user: SessionUser }) {
  const navigation = useNavigation<any>();
  const c = useFlareColors();
  const bottomScrollInset = useBottomTabScrollInset();
  const firstLine = accountIdentityFirstLine(user);
  const emailLine = user.email || "Unknown user";

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: c.screen }]}
      contentContainerStyle={{ paddingBottom: bottomScrollInset + 24 }}
    >
      <View style={[logHistoryCardStyles.trackerCard, styles.accountPaddedCard, { backgroundColor: c.card }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Personal Details, ${firstLine}, ${emailLine}`}
          onPress={() => navigation.navigate("AccountPersonalDetails")}
          hitSlop={4}
          style={styles.accountIdentityNavRow}
        >
          <View style={styles.accountIdentityRow}>
            <View style={[styles.accountAvatarWell, { backgroundColor: c.surfaceSubtle }]}>
              <Ionicons name="person" size={26} color={c.primary} accessibilityIgnoresInvertColors />
            </View>
            <View style={styles.accountIdentityTextCol}>
              <Text style={[styles.accountFirstName, { color: c.text }]}>{firstLine}</Text>
              <Text style={[styles.accountEmailLine, { color: c.textMuted }]}>{emailLine}</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={c.text} accessibilityIgnoresInvertColors />
        </Pressable>
      </View>
      <View style={[logHistoryCardStyles.trackerCard, { backgroundColor: c.card }]}>
        <LogDetailFieldGroup
          compact
          fields={[
            {
              label: "Account created",
              value: user.accountCreatedAt ? formatUkDate(user.accountCreatedAt) : "Not available",
            },
            { label: "Sign-in method", value: user.signInMethodLabel ?? "Not available" },
            { label: "Account ID", value: user.id, selectable: true },
          ]}
        />
      </View>
    </ScrollView>
  );
}

function AccountPersonalDetailsScreen({ user }: { user: SessionUser }) {
  const c = useFlareColors();
  const bottomScrollInset = useBottomTabScrollInset();
  const displayName = user.displayName?.trim() || "Not set";

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: c.screen }]}
      contentContainerStyle={{ flexGrow: 1, paddingBottom: bottomScrollInset + 24, backgroundColor: c.screen }}
    >
      <View style={[logHistoryCardStyles.trackerCard, styles.accountPaddedCard, { backgroundColor: c.card }]}>
        <View style={styles.accountIdentityRow}>
          <View style={[styles.accountAvatarWell, { backgroundColor: c.surfaceSubtle }]}>
            <Ionicons name="person" size={26} color={c.primary} accessibilityIgnoresInvertColors />
          </View>
          <View style={styles.accountIdentityTextCol}>
            <Text style={[styles.accountFirstName, { color: c.text }]}>{accountIdentityFirstLine(user)}</Text>
            <Text style={[styles.accountEmailLine, { color: c.textMuted }]}>{user.email || "Unknown user"}</Text>
          </View>
        </View>
      </View>
      <View style={[logHistoryCardStyles.trackerCard, { backgroundColor: c.card }]}>
        <LogDetailFieldGroup
          compact
          fields={[
            { label: "Full name", value: displayName },
            { label: "Email", value: user.email || "Not available" },
          ]}
        />
      </View>
    </ScrollView>
  );
}

function AccountSecurityScreen() {
  const c = useFlareColors();
  const bottomScrollInset = useBottomTabScrollInset();

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: c.screen }]}
      contentContainerStyle={{ paddingBottom: bottomScrollInset + 24 }}
    >
      <Card title="">
        <Text style={[styles.muted, { color: c.textMuted, lineHeight: 20 }]}>
          Sign-in and security options for your account will appear here.
        </Text>
      </Card>
    </ScrollView>
  );
}

function AccountLegalScreen() {
  const navigation = useNavigation<any>();
  const c = useFlareColors();
  const bottomScrollInset = useBottomTabScrollInset();

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: c.screen }]}
      contentContainerStyle={{ paddingBottom: bottomScrollInset + 24 }}
    >
      <View style={[logHistoryCardStyles.trackerCard, { backgroundColor: c.card }]}>
        <LogHistoryList
          items={[
            { id: "privacy", title: "Privacy Policy", accessibilityLabel: "Privacy Policy" },
            { id: "terms", title: "Terms of Use", accessibilityLabel: "Terms of Use" },
          ]}
          rowTextLayout="default"
          rowPaddingHorizontal={ACCOUNT_LIST_ROW_PADDING}
          onPressItem={(document) => navigation.navigate("LegalDocument", { document })}
        />
      </View>
    </ScrollView>
  );
}

/** Dashboard Info hub — What is IBD? + Nutrition guide (was the Info/Guides pill). */
function InfoScreen() {
  const navigation = useNavigation<any>();
  const c = useFlareColors();
  const bottomScrollInset = useBottomTabScrollInset();

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: c.screen }]}
      contentContainerStyle={{ paddingBottom: bottomScrollInset + 24 }}
    >
      <View style={[logHistoryCardStyles.trackerCard, { backgroundColor: c.card }]}>
        <LogHistoryList
          items={[
            buildBrowseLogRowItem({
              id: "ibd",
              title: "What is IBD?",
              subtitle: "Understand Crohn's and ulcerative colitis",
              accessibilityLabel: "Open What is IBD guide",
            }),
            buildBrowseLogRowItem({
              id: "nutrition",
              title: "Nutrition Guide",
              subtitle: "Food Categories and IBD Diet Tips",
              accessibilityLabel: "Open Nutrition Guide",
            }),
          ]}
          rowTextLayout="compact"
          rowPaddingHorizontal={ACCOUNT_LIST_ROW_PADDING}
          onPressItem={(rowId) => navigation.navigate(rowId === "ibd" ? "Ibd" : "NutritionGuide")}
        />
      </View>
    </ScrollView>
  );
}

function LegalDocumentScreen() {
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const bottomScrollInset = useBottomTabScrollInset();
  const kind: LegalDocumentKind = route.params?.document === "terms" ? "terms" : "privacy";
  const title = kind === "terms" ? "Terms of Use" : "Privacy Policy";

  return (
    <CollapsingTitleScrollScreen
      title={title}
      titlePreset="informational"
      bottomInset={Math.max(insets.bottom, 16) + 48 + bottomScrollInset}
    >
      <LegalDocumentView kind={kind} />
    </CollapsingTitleScrollScreen>
  );
}

function SettingsScreen() {
  const navigation = useNavigation<any>();
  const c = useFlareColors();
  const bottomScrollInset = useBottomTabScrollInset();
  const { appearancePreference, setAppearancePreference } = useFlareTheme();

  const appearanceOptions = [
    { key: "light" as const, label: "Light" },
    { key: "dark" as const, label: "Dark" },
  ];

  const [bioAvailable, setBioAvailable] = useState(false);
  const [bioOn, setBioOn] = useState(false);
  const [bioLabel, setBioLabel] = useState("biometrics");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [available, enabled, label] = await Promise.all([
        isBiometricAvailable(),
        readLockEnabled(),
        biometricTypeLabel(),
      ]);
      if (cancelled) return;
      setBioAvailable(available);
      setBioOn(available && enabled);
      setBioLabel(label);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleBio = useCallback(
    async (next: boolean) => {
      if (next) {
        const ok = await authenticate(`Confirm ${bioLabel} to turn on app lock`);
        if (!ok) return;
        await setLockEnabled(true);
        setBioOn(true);
      } else {
        await setLockEnabled(false);
        setBioOn(false);
      }
    },
    [bioLabel],
  );

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: c.screen }]}
      contentContainerStyle={[styles.accountScrollContent, { paddingBottom: bottomScrollInset + 16 }]}
    >
      <View style={[logHistoryCardStyles.trackerCard, { backgroundColor: c.card }]}>
        <LogHistoryList
          items={[
            {
              id: "reminders",
              title: "Push Notifications and Reminders",
              accessibilityLabel: "Push Notifications and Reminders",
            },
          ]}
          rowPaddingHorizontal={ACCOUNT_LIST_ROW_PADDING}
          rowTextLayout="default"
          onPressItem={() => navigation.navigate("Reminders")}
        />
      </View>
      <Text style={[styles.dashboardSectionTitleLeft, { color: c.text }]}>Appearance</Text>
      <Card title="" style={styles.accountPaddedCard} compactBody>
        <Text style={[styles.muted, { color: c.textMuted }]}>Choose light or dark for the app.</Text>
        <View style={styles.appearanceRow}>
          {appearanceOptions.map(({ key, label }) => {
            const selected = appearancePreference === key;
            return (
              <Pressable
                key={key}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => setAppearancePreference(key)}
                style={({ pressed }) => [
                  styles.appearanceChip,
                  { backgroundColor: selected ? c.primary : c.appearanceChipInactiveBg },
                  pressed && !selected ? { opacity: 0.92 } : null,
                ]}
              >
                <Text style={[styles.appearanceChipText, { color: selected ? c.white : c.appearanceChipInactiveText }]}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Card>
      <Text style={[styles.dashboardSectionTitleLeft, { color: c.text }]}>Security</Text>
      <Card title="" style={styles.accountPaddedCard} compactBody>
        <View style={styles.bioLockRow}>
          <View style={styles.bioLockTextCol}>
            <Text style={[styles.bioLockTitle, { color: c.text }]}>
              Unlock with {bioLabel === "biometrics" ? "biometrics" : bioLabel}
            </Text>
            <Text style={[styles.muted, { color: c.textMuted }]}>
              {bioAvailable
                ? `Require ${bioLabel} each time you open FlareCare.`
                : "Set up Face ID or fingerprint in your device settings to use this."}
            </Text>
          </View>
          <Switch
            value={bioOn}
            onValueChange={toggleBio}
            disabled={!bioAvailable}
            trackColor={{ true: c.primary, false: c.appearanceChipInactiveBg }}
            thumbColor={c.white}
          />
        </View>
      </Card>
    </ScrollView>
  );
}

function AccountScreen({
  user,
  beginSignOutBlocking,
  endSignOutBlocking,
  finishSignOut,
  prepareSignOut,
  restoreAfterAbortedSignOut,
}: {
  user: SessionUser;
  beginSignOutBlocking: () => void;
  endSignOutBlocking: () => void;
  finishSignOut: () => Promise<void>;
  prepareSignOut: (reason: SignOutReason) => void;
  restoreAfterAbortedSignOut: () => Promise<void>;
}) {
  const navigation = useNavigation<any>();
  const c = useFlareColors();
  const bottomScrollInset = useBottomTabScrollInset();
  const [deleteAccountConfirmOpen, setDeleteAccountConfirmOpen] = useState(false);
  const deleteAccountInFlight = useRef(false);

  const accountFirstName = useMemo(() => accountIdentityFirstLine(user), [user]);

  const handleDeleteAccountConfirm = useCallback(async () => {
    if (deleteAccountInFlight.current) return;
    deleteAccountInFlight.current = true;
    setDeleteAccountConfirmOpen(false);
    beginSignOutBlocking();
    try {
      const { error } = await supabase.rpc("delete_user_account");
      if (error) {
        await restoreAfterAbortedSignOut();
        showFlareAlert("Could not delete account", error.message);
        return;
      }
      await finishSignOut();
      prepareSignOut("account_deleted");
    } catch (e: unknown) {
      await restoreAfterAbortedSignOut();
      const msg = e instanceof Error ? e.message : "Something went wrong.";
      showFlareAlert("Could not delete account", msg);
    } finally {
      deleteAccountInFlight.current = false;
      endSignOutBlocking();
    }
  }, [beginSignOutBlocking, endSignOutBlocking, finishSignOut, prepareSignOut, restoreAfterAbortedSignOut]);

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: c.screen }]}
      contentContainerStyle={{ paddingBottom: bottomScrollInset + 24 }}
    >
      <View style={[logHistoryCardStyles.trackerCard, styles.accountPaddedCard, { backgroundColor: c.card }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Personal Details, ${accountFirstName}, ${user.email || "Unknown user"}`}
          onPress={() => navigation.navigate("AccountPersonalDetails")}
          hitSlop={4}
          style={styles.accountIdentityNavRow}
        >
          <View style={styles.accountIdentityRow}>
            <View style={[styles.accountAvatarWell, { backgroundColor: c.surfaceSubtle }]}>
              <Ionicons name="person" size={26} color={c.primary} accessibilityIgnoresInvertColors />
            </View>
            <View style={styles.accountIdentityTextCol}>
              <Text style={[styles.accountFirstName, { color: c.text }]}>{accountFirstName}</Text>
              <Text style={[styles.accountEmailLine, { color: c.textMuted }]}>{user.email || "Unknown user"}</Text>
            </View>
          </View>
          <Ionicons
            name="chevron-forward"
            size={18}
            color={c.text}
            style={styles.accountIdentityChevronAlign}
            accessibilityIgnoresInvertColors
          />
        </Pressable>
      </View>
      <View style={[logHistoryCardStyles.trackerCard, { backgroundColor: c.card }]}>
        <LogHistoryList
          items={ACCOUNT_OPTION_ROUTES.map((item) => ({
            id: item.route,
            title: item.label,
            accessibilityLabel: item.label,
          }))}
          rowTextLayout="default"
          rowPaddingHorizontal={ACCOUNT_LIST_ROW_PADDING}
          onPressItem={(route) => navigation.navigate(route)}
        />
      </View>
      <View style={styles.accountDeleteFooter}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Delete account"
          onPress={() => setDeleteAccountConfirmOpen(true)}
          hitSlop={8}
          style={styles.accountDeleteLink}
        >
          <Text style={[styles.accountDeleteLinkText, { color: c.destructiveFill }]}>Delete account</Text>
        </Pressable>
        <Text style={[styles.accountDeleteHint, { color: c.textMuted }]}>
          Permanently removes your account and data.
        </Text>
      </View>
      <ConfirmModal
        visible={deleteAccountConfirmOpen}
        title="Delete account"
        message="This permanently deletes your account and all your data. This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        confirmDestructive
        onCancel={() => setDeleteAccountConfirmOpen(false)}
        onConfirm={handleDeleteAccountConfirm}
      />
    </ScrollView>
  );
}

const AppStack = createNativeStackNavigator();

function MainBottomTabBar({
  routeName,
  navigationRef,
}: {
  routeName: string;
  navigationRef: NavigationContainerRef<Record<string, object | undefined>> | null;
}) {
  const { colors } = useFlareTheme();
  const c = useFlareColors();
  const insets = useSafeAreaInsets();
  const { chrome } = useListSelectionChrome();
  const selectionChrome = chrome?.routeName === routeName ? chrome : null;

  if (!BOTTOM_BAR_VISIBLE_ROUTES.has(routeName) && !selectionChrome) {
    return null;
  }

  const go = (target: "Dashboard" | "Logs" | "Account") => {
    navigationRef?.navigate(target as never);
  };

  const item = (
    target: "Dashboard" | "Logs" | "Account",
    icon: ({ active }: { active: boolean }) => React.ReactNode,
    label: string,
  ) => {
    const active =
      routeName === target ||
      (target === "Logs" &&
        (routeName === "SymptomHistory" || routeName === "MedicationTrackingHistory" || routeName === "Wellbeing"));
    return (
      <Pressable
        key={target}
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
        onPress={() => go(target)}
        style={styles.bottomTabItem}
      >
        {icon({ active })}
        <Text style={[styles.bottomTabLabel, { color: active ? colors.primary : colors.textMuted }]}>{label}</Text>
      </Pressable>
    );
  };

  const deleteSlot = selectionChrome ? (
    <Pressable
      key="delete-selected"
      accessibilityRole="button"
      accessibilityLabel="Delete selected"
      accessibilityState={{ disabled: selectionChrome.deleteDisabled }}
      disabled={selectionChrome.deleteDisabled}
      onPress={selectionChrome.onDelete}
      style={styles.bottomTabItem}
    >
      <MaterialCommunityIcons
        name="trash-can-outline"
        size={23}
        color={selectionChrome.deleteDisabled ? colors.textMuted : c.destructiveFill}
        accessibilityIgnoresInvertColors
      />
      <Text
        style={[
          styles.bottomTabLabel,
          { color: selectionChrome.deleteDisabled ? colors.textMuted : c.destructiveFill },
        ]}
      >
        Delete
      </Text>
    </Pressable>
  ) : (
    item("Account", ({ active }) => <Ionicons name={active ? "person-circle" : "person-circle-outline"} size={23} color={active ? colors.primary : colors.textMuted} />, "Account")
  );

  return (
    <View style={[styles.bottomTabBarWrap, { backgroundColor: c.screen, borderTopColor: c.cardBorder, paddingBottom: Math.max(insets.bottom, 10) }]}>
      {item(
        "Dashboard",
        ({ active }) => <Ionicons name={active ? "home" : "home-outline"} size={23} color={active ? colors.primary : colors.textMuted} />,
        "Home",
      )}
      {item(
        "Logs",
        ({ active }) => <Ionicons name={active ? "list" : "list-outline"} size={23} color={active ? colors.primary : colors.textMuted} />,
        "Logs",
      )}
      {deleteSlot}
    </View>
  );
}

function AppTabs({
  user,
  onLogout,
  beginSignOutBlocking,
  endSignOutBlocking,
  prepareSignOut,
  finishSignOut,
  restoreAfterAbortedSignOut,
  onAppShellReady,
}: {
  user: SessionUser;
  onLogout: (reason?: SignOutReason) => void | Promise<void>;
  beginSignOutBlocking: () => void;
  endSignOutBlocking: () => void;
  prepareSignOut: (reason: SignOutReason) => void;
  finishSignOut: () => Promise<void>;
  restoreAfterAbortedSignOut: () => Promise<void>;
  /** Fires once the root navigator has laid out — use to hide the post-login entry blocker. */
  onAppShellReady?: () => void;
}) {
  const { nav, colors } = useFlareTheme();
  const navigationRef = useNavigationContainerRef<Record<string, object | undefined>>();
  const [focusRouteName, setFocusRouteName] = useState("Dashboard");
  const pendingReminderNavRef = useRef<Awaited<ReturnType<typeof consumeReminderNotificationResponse>>>(null);
  const lastReminderNavKeyRef = useRef<string | null>(null);

  const clearStoredReminderNotificationResponse = useCallback(() => {
    Notifications?.clearLastNotificationResponse?.();
    void Notifications?.clearLastNotificationResponseAsync?.();
  }, []);

  const openReminderNotificationTarget = useCallback(
    (target: NonNullable<Awaited<ReturnType<typeof consumeReminderNotificationResponse>>>) => {
      const navKey =
        target.kind === "medication"
          ? `medication:${target.medicationId}`
          : `appointment:${target.appointmentId}`;
      if (lastReminderNavKeyRef.current === navKey) return;
      lastReminderNavKeyRef.current = navKey;
      setTimeout(() => {
        if (lastReminderNavKeyRef.current === navKey) lastReminderNavKeyRef.current = null;
      }, 1500);
      if (navigationRef.isReady()) {
        navigateFromReminderNotification(navigationRef, target);
      } else {
        pendingReminderNavRef.current = target;
      }
    },
    [navigationRef],
  );

  const processReminderNotificationResponse = useCallback(
    (response: unknown) => {
      void (async () => {
        if (await wasReminderNotificationResponseHandled(response)) {
          clearStoredReminderNotificationResponse();
          return;
        }
        const target = await consumeReminderNotificationResponse(response);
        clearStoredReminderNotificationResponse();
        if (!target) return;
        openReminderNotificationTarget(target);
      })();
    },
    [clearStoredReminderNotificationResponse, openReminderNotificationTarget],
  );

  useEffect(() => {
    if (!Notifications?.addNotificationResponseReceivedListener) return;
    let subscription: { remove: () => void } | undefined;

    void (async () => {
      let ignoreNextListener = false;

      if (Notifications.getLastNotificationResponseAsync) {
        const response = await Notifications.getLastNotificationResponseAsync();
        if (response) {
          if (await wasReminderNotificationResponseHandled(response)) {
            clearStoredReminderNotificationResponse();
            ignoreNextListener = true;
          } else {
            const target = await consumeReminderNotificationResponse(response);
            clearStoredReminderNotificationResponse();
            if (target) {
              openReminderNotificationTarget(target);
              ignoreNextListener = true;
            }
          }
        } else {
          clearStoredReminderNotificationResponse();
        }
      }

      subscription = Notifications.addNotificationResponseReceivedListener((response: unknown) => {
        if (ignoreNextListener) {
          ignoreNextListener = false;
          void markReminderNotificationResponseHandled(response);
          clearStoredReminderNotificationResponse();
          return;
        }
        processReminderNotificationResponse(response);
      });
    })();

    return () => subscription?.remove();
  }, [
    clearStoredReminderNotificationResponse,
    openReminderNotificationTarget,
    processReminderNotificationResponse,
  ]);

  const MedsScreenRoute = useMemo(
    () =>
      function MedsScreenRoute() {
        return <MedicationsScreen user={user} />;
      },
    [user.id],
  );

  const syncFocusRoute = useCallback(() => {
    const name = navigationRef.getCurrentRoute()?.name;
    if (!name) return;
    handleListExpansionNavigationRouteChange(user.id, name);
    setFocusRouteName(name);
  }, [navigationRef, user.id]);

  const onNavigationReady = useCallback(() => {
    syncFocusRoute();
    const pending = pendingReminderNavRef.current;
    if (pending) {
      pendingReminderNavRef.current = null;
      navigateFromReminderNotification(navigationRef, pending);
      clearStoredReminderNotificationResponse();
    }
    requestAnimationFrame(() => onAppShellReady?.());
  }, [clearStoredReminderNotificationResponse, navigationRef, onAppShellReady, syncFocusRoute]);

  const headerOptions = ({ navigation, route }: { navigation: any; route: { name: string; params?: { document?: string } } }) => {
    const isDashboard = route.name === "Dashboard";
    const isAbout = route.name === "About";
    const isIbd = route.name === "Ibd";
    const isNutritionGuide = route.name === "NutritionGuide";
    const isLegalDocument = route.name === "LegalDocument";
    const isAccount = route.name === "Account";
    const isLogs = route.name === "Logs";
    const isReminders = route.name === "Reminders";
    const titleForRoute: Record<string, string> = {
      Logs: "Logs",
      SymptomHistory: "History",
      SymptomDetail: "Symptom Details",
      MedicationTrackingHistory: "History",
      MedicationLogDetail: "Medication Log",
      SymptomLogWizard: "Log Symptoms",
      MedicationTrackingWizard: "Track Medications",
      WellbeingWizard: "My Wellbeing",
      AccountInfo: "Information",
      AccountPersonalDetails: "Personal Details",
      AccountSecurity: "Security",
      AccountLegal: "Legal",
      AccountHelp: "Help",
      Settings: "Settings",
      Info: "Info",
      Reminders: "Reminders",
      Hydration: "My Hydration",
      Meds: "My Meds",
      MedicationDetail: "Medication",
      Bowel: "Bowel Movements",
      Wellbeing: "History",
      WellbeingLogDetail: "Wellbeing Log",
      BowelLogDetail: "Bowel Log",
      BristolGuide: "Bristol Stool Chart",
      Weight: "My Weight",
      WeightLogDetail: "Weight Log",
      Appointments: "Appointments",
      AppointmentsPast: "Past Appointments",
      AppointmentDetail: "Appointment",
      AppointmentBrief: "Appointment Summary",
      AppointmentBriefCustomRange: "Custom Range",
      AppointmentBriefResult: "Your Summary",
      AppointmentBriefHealth: "Health Overview",
      AppointmentBriefNext: "Next Appointment",
      AppointmentBriefChanges: "What Changed",
      LatestNews: "Latest News",
    };
    const isSymptomLogWizard = route.name === "SymptomLogWizard";
    const isMedicationTrackingWizard = route.name === "MedicationTrackingWizard";
    const isWellbeingWizard = route.name === "WellbeingWizard";

    const headerHidesOverflowMenu =
      route.name === "Settings" ||
      route.name === "SymptomLogWizard" ||
      route.name === "MedicationTrackingWizard" ||
      route.name === "WellbeingWizard" ||
      route.name === "Meds" ||
      route.name === "MedicationDetail" ||
      route.name === "Reports" ||
      route.name === "Weight" ||
      route.name === "WeightLogDetail" ||
      route.name === "Appointments" ||
      route.name === "AppointmentsPast" ||
      route.name === "AppointmentDetail" ||
      route.name === "AppointmentBrief" ||
      route.name === "AppointmentBriefCustomRange" ||
      route.name === "AppointmentBriefResult" ||
      route.name === "AppointmentBriefHealth" ||
      route.name === "AppointmentBriefNext" ||
      route.name === "AppointmentBriefChanges" ||
      route.name === "Hydration" ||
      route.name === "Bowel" ||
      route.name === "Wellbeing" ||
      route.name === "WellbeingLogDetail" ||
      route.name === "BowelLogDetail" ||
      route.name === "BristolGuide" ||
      route.name === "SymptomHistory" ||
      route.name === "SymptomDetail" ||
      route.name === "MedicationTrackingHistory" ||
      route.name === "MedicationLogDetail";

    const headerRightContent = headerHidesOverflowMenu ? null : (
      <HeaderOverflowMenu
        navigation={navigation}
        routeName={route.name}
        edgePadding={SCREEN_EDGE_PADDING}
        onLogout={onLogout}
      />
    );

    return {
      headerTitle: isDashboard
        ? ""
        : isAbout
            ? ""
            : isIbd
            ? ""
            : isNutritionGuide
            ? ""
            : isLegalDocument
              ? ""
            : isAccount
              ? "Account"
              : isLogs
                ? "Logs"
              : isReminders
                ? "Reminders"
                : isSymptomLogWizard || isMedicationTrackingWizard || isWellbeingWizard
                  ? ""
                  : titleForRoute[route.name] ?? "",
      headerTitleAlign: "center" as const,
      headerLargeTitleEnabled: false,
      headerLargeTitleShadowVisible: false,
      headerStyle: { backgroundColor: colors.screen },
      headerTitleStyle: {
        fontFamily: FLARE_FONT_FAMILY.bold,
        fontSize: FLARE_FONT_SIZE.navTitle,
        color: colors.text,
      },
      headerTintColor: colors.textMuted,
      headerShadowVisible: false,
      contentStyle: { backgroundColor: colors.screen },
      headerBackVisible: false,
      /** Match `styles.screen` horizontal inset so header controls line up with cards. */
      headerRightContainerStyle: { paddingRight: SCREEN_EDGE_PADDING, paddingLeft: 0 },
      /** Avoid stacking default header padding with our own — keeps chevron near the leading edge. */
      headerLeftContainerStyle: { paddingLeft: 0, marginLeft: 0 },
      headerLeft:
        !isDashboard &&
        !isSymptomLogWizard &&
        !isMedicationTrackingWizard &&
        !isWellbeingWizard &&
        !isAccount &&
        !isLogs &&
        !isReminders
          ? () => (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Back"
                hitSlop={{ top: 10, bottom: 10, left: 8, right: 20 }}
                onPress={() => {
                  if (navigation.canGoBack()) navigation.goBack();
                  else navigation.navigate("Dashboard");
                }}
                style={styles.headerBackButton}
              >
                <Ionicons name="chevron-back" size={24} color={colors.textMuted} />
              </Pressable>
            )
          : undefined,
      headerRight: headerRightContent ? () => headerRightContent : undefined,
      freezeOnBlur: true,
      /** First paint after login — avoid stack enter animation sliding content down. */
      animation: isDashboard ? ("none" as const) : ("default" as const),
    } as const;
  };

  return (
    <NavigationContainer ref={navigationRef} theme={nav} onReady={onNavigationReady} onStateChange={syncFocusRoute}>
      <ListSelectionChromeProvider>
        <View style={{ flex: 1, backgroundColor: colors.screen }}>
          <View style={{ flex: 1 }}>
            <AppStack.Navigator initialRouteName="Dashboard" screenOptions={headerOptions as any}>
            <AppStack.Screen name="Dashboard">
              {() => <DashboardScreen key={user.id} user={user} />}
            </AppStack.Screen>
            <AppStack.Screen name="Logs">{() => <LogsScreen user={user} />}</AppStack.Screen>
            <AppStack.Screen name="SymptomHistory">{() => <SymptomHistoryScreen user={user} />}</AppStack.Screen>
            <AppStack.Screen name="SymptomDetail">{() => <SymptomDetailScreen user={user} />}</AppStack.Screen>
            <AppStack.Screen name="MedicationTrackingHistory">{() => <MedicationTrackingHistoryScreen user={user} />}</AppStack.Screen>
            <AppStack.Screen name="MedicationLogDetail">{() => <MedicationLogDetailScreen user={user} />}</AppStack.Screen>
            <AppStack.Screen name="SymptomLogWizard">{() => <SymptomLogWizardScreen user={user} />}</AppStack.Screen>
            <AppStack.Screen name="MedicationTrackingWizard">{() => <MedicationTrackingWizardScreen user={user} />}</AppStack.Screen>
            <AppStack.Screen name="Hydration">{() => <HydrationScreen user={user} />}</AppStack.Screen>
            <AppStack.Screen name="Weight">{() => <WeightScreen user={user} />}</AppStack.Screen>
            <AppStack.Screen name="WeightLogDetail">{() => <WeightLogDetailScreen user={user} />}</AppStack.Screen>
            <AppStack.Screen name="Bowel">{() => <BowelScreen user={user} />}</AppStack.Screen>
            <AppStack.Screen name="Wellbeing">{() => <WellbeingScreen user={user} />}</AppStack.Screen>
            <AppStack.Screen name="WellbeingWizard">{() => <WellbeingWizardScreen user={user} />}</AppStack.Screen>
            <AppStack.Screen name="WellbeingLogDetail">{() => <WellbeingLogDetailScreen user={user} />}</AppStack.Screen>
            <AppStack.Screen name="BowelLogDetail">{() => <BowelLogDetailScreen user={user} />}</AppStack.Screen>
            <AppStack.Screen name="BristolGuide">{() => <BristolGuideScreen user={user} />}</AppStack.Screen>
            <AppStack.Screen name="Appointments">{() => <AppointmentsScreen user={user} />}</AppStack.Screen>
            <AppStack.Screen name="AppointmentsPast">{() => <AppointmentsPastScreen user={user} />}</AppStack.Screen>
            <AppStack.Screen name="AppointmentDetail">{() => <AppointmentDetailScreen user={user} />}</AppStack.Screen>
            <AppStack.Screen name="AppointmentBrief">{() => <AppointmentBriefScreen user={user} />}</AppStack.Screen>
            <AppStack.Screen name="AppointmentBriefCustomRange">{() => <AppointmentBriefCustomRangeScreen user={user} />}</AppStack.Screen>
            <AppStack.Screen name="AppointmentBriefResult">{() => <AppointmentBriefResultScreen user={user} />}</AppStack.Screen>
            <AppStack.Screen name="AppointmentBriefHealth">{() => <AppointmentBriefHealthScreen user={user} />}</AppStack.Screen>
            <AppStack.Screen name="AppointmentBriefNext">{() => <AppointmentBriefNextScreen user={user} />}</AppStack.Screen>
            <AppStack.Screen name="AppointmentBriefChanges">{() => <AppointmentBriefChangesScreen user={user} />}</AppStack.Screen>
            <AppStack.Screen name="Reports">{() => <ReportsScreen user={user} />}</AppStack.Screen>
            <AppStack.Screen name="Meds" component={MedsScreenRoute} />
            <AppStack.Screen name="MedicationDetail">{() => <MedicationDetailScreen user={user} />}</AppStack.Screen>
            <AppStack.Screen name="Reminders">{() => <NotificationsScreen user={user} />}</AppStack.Screen>
            <AppStack.Screen name="Ibd">{() => <IbdScreen />}</AppStack.Screen>
            <AppStack.Screen name="NutritionGuide">{() => <NutritionGuideScreen />}</AppStack.Screen>
            <AppStack.Screen name="LatestNews">{() => <LatestNewsScreen user={user} />}</AppStack.Screen>
            <AppStack.Screen name="Account">
              {() => (
                <AccountScreen
                  user={user}
                  beginSignOutBlocking={beginSignOutBlocking}
                  endSignOutBlocking={endSignOutBlocking}
                  prepareSignOut={prepareSignOut}
                  finishSignOut={finishSignOut}
                  restoreAfterAbortedSignOut={restoreAfterAbortedSignOut}
                />
              )}
            </AppStack.Screen>
            <AppStack.Screen name="Settings">{() => <SettingsScreen />}</AppStack.Screen>
            <AppStack.Screen name="Info">{() => <InfoScreen />}</AppStack.Screen>
            <AppStack.Screen name="AccountInfo">{() => <AccountInfoScreen user={user} />}</AppStack.Screen>
            <AppStack.Screen name="AccountPersonalDetails">
              {() => <AccountPersonalDetailsScreen user={user} />}
            </AppStack.Screen>
            <AppStack.Screen name="AccountSecurity">{() => <AccountSecurityScreen />}</AppStack.Screen>
            <AppStack.Screen name="AccountLegal">{() => <AccountLegalScreen />}</AppStack.Screen>
            <AppStack.Screen name="LegalDocument" component={LegalDocumentScreen} />
            <AppStack.Screen name="AccountHelp">{() => <AccountHelpScreen />}</AppStack.Screen>
            <AppStack.Screen name="About">{() => <AboutScreen />}</AppStack.Screen>
          </AppStack.Navigator>
        </View>
        <View style={styles.bottomTabBarOverlay} pointerEvents="box-none">
          <MainBottomTabBar routeName={focusRouteName} navigationRef={navigationRef} />
        </View>
      </View>
      </ListSelectionChromeProvider>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <FlareThemeProvider>
        <AppRoot />
        <FlareAlertHost />
        {/* Last sibling → confirm overlays (via Portal) paint above the whole app, full-screen and
            unpadded, with no native Modal window slide. */}
        <OverlayOutlet />
      </FlareThemeProvider>
    </SafeAreaProvider>
  );
}

function AppEntryShell({
  ready,
  backgroundColor,
  children,
}: {
  ready: boolean;
  backgroundColor: string;
  children: React.ReactNode;
}) {
  return (
    <View style={[styles.appEntryShell, { backgroundColor }]}>
      {children}
      {!ready ? <View style={[styles.appEntryBlocker, { backgroundColor }]} pointerEvents="none" /> : null}
    </View>
  );
}

function AppRoot() {
  const { appearanceHydrated } = useFlareTheme();
  const c = useFlareColors();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [signOutNotice, setSignOutNotice] = useState<SignOutReason | null>(null);
  const [signOutBlocking, setSignOutBlocking] = useState(false);
  const [appShellReady, setAppShellReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authBusy, setAuthBusy] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  // Biometric app-lock: null = still checking (avoid revealing app before we know), false = off.
  const [bioEnabled, setBioEnabled] = useState<boolean | null>(false);
  const [locked, setLocked] = useState(false);
  const [bioLabel, setBioLabel] = useState("biometrics");
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_700Bold,
    Inter_800ExtraBold,
  });

  useEffect(() => {
    const splashTimer = setTimeout(() => setShowSplash(false), 1400);

    const bootstrap = async () => {
      const { data } = await supabase.auth.getSession();
      const sessionUser = data.session?.user;
      setUser(
        sessionUser
          ? sessionUserFromSupabaseAuthUser(sessionUser)
          : null,
      );
      setLoading(false);
    };
    bootstrap();

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      const next = session?.user;
      if (next) {
        setSignOutNotice(null);
        setUser(sessionUserFromSupabaseAuthUser(next));
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => {
      clearTimeout(splashTimer);
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (user?.id) {
      void hydrateReminderStatusCache();
    }
  }, [user?.id]);

  // On login (or session restore), decide whether the app should open locked.
  useEffect(() => {
    let cancelled = false;
    if (!user?.id) {
      setBioEnabled(false);
      setLocked(false);
      return;
    }
    setBioEnabled(null);
    (async () => {
      const [available, enabled, label] = await Promise.all([
        isBiometricAvailable(),
        readLockEnabled(),
        biometricTypeLabel(),
      ]);
      if (cancelled) return;
      const on = available && enabled;
      setBioLabel(label);
      setBioEnabled(on);
      setLocked(on);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  // Re-lock when the app is backgrounded (read fresh so toggling the setting takes effect next resume).
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state !== "background" && state !== "inactive") return;
      void (async () => {
        const [available, enabled, label] = await Promise.all([
          isBiometricAvailable(),
          readLockEnabled(),
          biometricTypeLabel(),
        ]);
        if (available && enabled) {
          setBioLabel(label);
          setLocked(true);
        }
      })();
    });
    return () => sub.remove();
  }, []);

  const prepareSignOut = useCallback((reason: SignOutReason) => {
    setSignOutNotice(reason);
  }, []);

  const beginSignOutBlocking = useCallback(() => {
    setSignOutBlocking(true);
  }, []);

  const endSignOutBlocking = useCallback(() => {
    setSignOutBlocking(false);
  }, []);

  const finishSignOut = useCallback(async () => {
    try {
      await clearMedicationNotificationsForUser();
    } catch {
      // non-fatal
    }
    await clearCachedReminderStatus();
    setUser(null);
    await supabase.auth.signOut();
  }, []);

  const restoreAfterAbortedSignOut = useCallback(async () => {
    setSignOutNotice(null);
    const { data } = await supabase.auth.getSession();
    const sessionUser = data.session?.user;
    setUser(sessionUser ? sessionUserFromSupabaseAuthUser(sessionUser) : null);
  }, []);

  const completeSignOut = useCallback(
    async (reason: SignOutReason = "logout") => {
      beginSignOutBlocking();
      try {
        await finishSignOut();
        prepareSignOut(reason);
      } finally {
        endSignOutBlocking();
      }
    },
    [beginSignOutBlocking, endSignOutBlocking, finishSignOut, prepareSignOut],
  );

  const profileSetupActive = Boolean(user && profileNeedsSetup(user));

  useEffect(() => {
    setAppShellReady(false);
  }, [user?.id, profileSetupActive]);

  const markAppShellReady = useCallback(() => {
    setAppShellReady(true);
  }, []);

  const content = useMemo(() => {
    if (!fontsLoaded || loading || showSplash || !appearanceHydrated || signOutBlocking) {
      return <SplashScreen />;
    }
    if (signOutNotice) {
      const copy = SIGN_OUT_COPY[signOutNotice];
      return (
        <SuccessNoticeScreen
          title={copy.title}
          message={copy.message}
          buttonTitle="Sign in"
          fullScreen
          onPress={() => setSignOutNotice(null)}
        />
      );
    }
    if (profileSetupActive) {
      return <ProfileSetupScreen user={user!} onComplete={(next) => setUser(next)} />;
    }
    if (user && bioEnabled === null) {
      // Still resolving lock state — keep the splash so we never flash the app before locking.
      return <SplashScreen />;
    }
    if (user) {
      return (
        <AppEntryShell ready={appShellReady} backgroundColor={c.screen}>
          <AppTabs
            user={user}
            onLogout={completeSignOut}
            beginSignOutBlocking={beginSignOutBlocking}
            endSignOutBlocking={endSignOutBlocking}
            prepareSignOut={prepareSignOut}
            finishSignOut={finishSignOut}
            restoreAfterAbortedSignOut={restoreAfterAbortedSignOut}
            onAppShellReady={markAppShellReady}
          />
          {locked ? (
            <BiometricLockScreen
              label={bioLabel}
              onUnlock={() => setLocked(false)}
              onSignOut={() => void completeSignOut()}
            />
          ) : null}
        </AppEntryShell>
      );
    }
    if (authBusy) {
      return <SplashScreen />;
    }
    return (
      <AuthScreen
        onSignedIn={(next) => {
          setSignOutNotice(null);
          setUser(next);
        }}
        onAuthBusy={setAuthBusy}
      />
    );
  }, [
    fontsLoaded,
    loading,
    showSplash,
    appearanceHydrated,
    user,
    profileSetupActive,
    signOutNotice,
    signOutBlocking,
    authBusy,
    appShellReady,
    bioEnabled,
    locked,
    bioLabel,
    c.screen,
    beginSignOutBlocking,
    endSignOutBlocking,
    completeSignOut,
    prepareSignOut,
    finishSignOut,
    restoreAfterAbortedSignOut,
    markAppShellReady,
  ]);

  const authScreenActive =
    fontsLoaded &&
    !loading &&
    !showSplash &&
    appearanceHydrated &&
    !authBusy &&
    !signOutBlocking &&
    !signOutNotice &&
    (!user || profileSetupActive);

  return (
    <>
      {content}
      <ThemedStatusBar authScreenActive={authScreenActive} />
    </>
  );
}

function ThemedStatusBar({ authScreenActive }: { authScreenActive: boolean }) {
  const { colors } = useFlareTheme();
  if (authScreenActive && !colors.isDark) {
    return <StatusBar style="light" />;
  }
  return <StatusBar style={colors.isDark ? "light" : "dark"} />;
}

const styles = StyleSheet.create({
  appEntryShell: { flex: 1 },
  appEntryBlocker: { ...StyleSheet.absoluteFillObject },
  screen: { flex: 1, padding: SCREEN_EDGE_PADDING },
  dashboardScreen: { flex: 1 },
  dashboardScroll: { flex: 1 },
  authScreenFill: { flex: 1 },
  authShell: { flex: 1, transform: [{ translateY: 40 }] },
  authBrandBlock: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 12,
    paddingTop: 12,
  },
  /** Mirror the logout success layout so the brand block lands in the same spot on the page. */
  authLandingOffset: { paddingTop: WIZARD_LANDING_BELOW_SAFE_TOP },
  authLandingBlock: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 96,
    paddingBottom: WIZARD_LANDING_BLOCK_PADDING_BOTTOM,
  },
  authLogo: { width: 92, height: 92 },
  authBrandName: { fontSize: 28, fontFamily: "Inter_700Bold" },
  authBrandTagline: {
    textAlign: "center",
    fontSize: 16,
    lineHeight: 22,
    fontFamily: "Inter_400Regular",
    paddingHorizontal: 8,
  },
  authCardPlain: { flex: 1, paddingHorizontal: 0 },
  authMethodPanel: { flex: 1, justifyContent: "center" },
  authMethodActions: { marginTop: 18, gap: 8 },
  authTopRightSignIn: { position: "absolute", right: 20, zIndex: 2, padding: 4 },
  authSheetContent: { paddingTop: 8, paddingBottom: 8 },
  /** Neutralize the full-screen panels' `flex: 1` centering when hosted in the slide-up sheet. */
  authSheetPanel: { flex: 0, justifyContent: "flex-start" },
  authLegalRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginTop: 22, marginBottom: 4 },
  authLegalCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  authLegalText: { flex: 1, fontSize: 13, lineHeight: 18, fontFamily: "Inter_400Regular" },
  authLegalLink: { fontFamily: "Inter_600SemiBold", textDecorationLine: "underline" },
  legalModalRoot: { flex: 1 },
  legalModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  legalModalTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  legalModalClose: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  legalModalScroll: { flex: 1 },
  legalModalScrollContent: { paddingHorizontal: 16, paddingTop: 16 },
  authSecureNote: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, marginTop: 18 },
  authSecureNoteText: { fontSize: 13, lineHeight: 18, fontFamily: "Inter_400Regular" },
  authPromptTitle: { textAlign: "center", fontSize: 19, fontFamily: "Inter_500Medium" },
  authPromptSub: { textAlign: "center", fontSize: 14, lineHeight: 20, fontFamily: "Inter_400Regular", marginTop: 4 },
  /** Extra gap before email field only — keep method screen subtitle unchanged */
  authEmailHelperSub: { marginBottom: 18 },
  authOtpCountdown: {
    textAlign: "center",
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 4,
  },
  authOtpResendPressable: { alignSelf: "center", marginTop: 10, paddingVertical: 4 },
  authOtpResendLabel: { fontSize: 14, fontFamily: "Inter_500Medium", textAlign: "center" },
  authOtpLimitMessage: {
    textAlign: "center",
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 10,
    lineHeight: 18,
  },
  authFlowPanel: { flex: 1, justifyContent: "center" },
  authFormCenter: { justifyContent: "center" },
  authBottomActions: { paddingBottom: 6, marginTop: 10, gap: 8 },
  /** Matches one secondary button row on email/code steps so single-CTA screens center the same. */
  authBottomActionSpacer: { height: 50 },
  splashScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  /** Fixed box so light/dark logo layouts do not reflow vertically when theme hydrates from storage. */
  splashLogoStage: {
    width: 200,
    height: 200,
    alignItems: "center",
    justifyContent: "center",
  },
  /** Light splash: circular primary well behind mark. */
  splashLogoMarkWell: { padding: 22, borderRadius: 9999, overflow: "hidden" },
  splashLogo: { width: 132, height: 132 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", gap: 10 },
  card: { borderRadius: 14, padding: 14, marginBottom: 12 },
  /** Stacks card content below the title; `gap` matches spacing between sibling blocks inside the card. */
  cardBody: { gap: 8 },
  cardBodyCompact: { gap: 0 },
  cardTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    textAlign: "left",
    alignSelf: "stretch",
    marginBottom: 12,
  },
  dashboardShelfSection: { width: "100%", marginTop: 20 },
  /** Same rhythm as greeting Card → Daily Check-in (card mb 12 + title mt 10). */
  dashboardShelfBeforeTitle: { marginTop: 12 },
  /** Previous block already has card mb 12; title/header keeps mt 10. */
  dashboardShelfAfterCard: { marginTop: 0 },
  dashboardShelfSectionLast: { marginBottom: 24 },
  /** Daily Check-in shelf title. */
  dashboardSubsectionTitle: {
    fontSize: FLARE_FONT_SIZE.subhead,
    lineHeight: FLARE_LINE_HEIGHT.subhead,
    fontFamily: FLARE_FONT_FAMILY.bold,
    marginTop: SECTION_TITLE_MARGIN_TOP,
    marginBottom: SECTION_TITLE_MARGIN_BOTTOM,
    textAlign: "left",
  },
  /** Title row when a trailing action shares the line (Latest news + See all). */
  dashboardSubsectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: SECTION_TITLE_MARGIN_TOP,
    marginBottom: SECTION_TITLE_MARGIN_BOTTOM,
  },
  dashboardSubsectionHeaderSide: {
    flex: 1,
  },
  dashboardSubsectionHeaderSideTrailing: {
    alignItems: "flex-end",
  },
  dashboardSubsectionTitleInHeader: {
    marginTop: 0,
    marginBottom: 0,
  },
  /** Shelf labels — Logs, Latest news. */
  dashboardSubsectionTitleLeft: {
    fontSize: FLARE_FONT_SIZE.subhead,
    lineHeight: FLARE_LINE_HEIGHT.subhead,
    fontFamily: FLARE_FONT_FAMILY.bold,
    marginTop: SECTION_TITLE_MARGIN_TOP,
    marginBottom: SECTION_TITLE_MARGIN_BOTTOM,
    textAlign: "left",
  },
  /** Alternating shelf label — staggers against left/center titles. */
  dashboardSubsectionTitleRight: {
    fontSize: FLARE_FONT_SIZE.subhead,
    lineHeight: FLARE_LINE_HEIGHT.subhead,
    fontFamily: FLARE_FONT_FAMILY.bold,
    marginTop: SECTION_TITLE_MARGIN_TOP,
    marginBottom: SECTION_TITLE_MARGIN_BOTTOM,
    textAlign: "right",
  },
  /** Primary shelf headings — attention-grabbing sections (Today, Logs). */
  dashboardFocusSectionTitle: {
    fontSize: FLARE_FONT_SIZE.sectionTitle,
    fontFamily: FLARE_FONT_FAMILY.bold,
    marginBottom: SECTION_TITLE_MARGIN_BOTTOM,
    marginTop: SECTION_TITLE_MARGIN_TOP,
    textAlign: "center",
  },
  dashboardFocusSectionTitleLeft: {
    fontSize: FLARE_FONT_SIZE.sectionTitle,
    fontFamily: FLARE_FONT_FAMILY.bold,
    marginBottom: SECTION_TITLE_MARGIN_BOTTOM,
    marginTop: SECTION_TITLE_MARGIN_TOP,
    textAlign: "left",
  },
  dashboardNewsSeeAll: {
    fontSize: FLARE_FONT_SIZE.body,
    fontFamily: FLARE_FONT_FAMILY.medium,
  },
  dashboardNewsStatus: {
    paddingBottom: 28,
  },
  dashboardNewsDots: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
  },
  dashboardNewsDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  todaySummaryRows: { gap: 8 },
  dashboardSectionTitle: {
    fontSize: FLARE_FONT_SIZE.sectionTitle,
    fontFamily: FLARE_FONT_FAMILY.bold,
    marginBottom: SECTION_TITLE_MARGIN_BOTTOM,
    marginTop: SECTION_TITLE_MARGIN_TOP,
    textAlign: "center",
  },
  dashboardSectionTitleLeft: {
    fontSize: FLARE_FONT_SIZE.subhead,
    lineHeight: FLARE_LINE_HEIGHT.subhead,
    fontFamily: FLARE_FONT_FAMILY.bold,
    marginBottom: SECTION_TITLE_MARGIN_BOTTOM,
    marginTop: SECTION_TITLE_MARGIN_TOP,
    textAlign: "left",
  },
  text: { fontSize: 14, fontFamily: "Inter_400Regular" },
  muted: { fontSize: 13, fontFamily: "Inter_400Regular" },
  remindersSetupBlock: { gap: 12, marginTop: 16 },
  remindersStatusLoading: { alignItems: "center", marginTop: 20, paddingVertical: 8 },
  remindersSetupStep: { gap: 10, marginTop: 16 },
  remindersSetupStepTitle: {
    fontSize: FLARE_FONT_SIZE.body,
    fontFamily: FLARE_FONT_FAMILY.medium,
    lineHeight: FLARE_LINE_HEIGHT.body,
  },
  remindersStatusRow: { flexDirection: "row", alignItems: "flex-start" },
  remindersStatusSubtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
    marginTop: 4,
  },
  remindersHelpBlock: { gap: 12 },
  remindersHelpPathItem: { gap: 8 },
  notificationHelpSectionTitle: {
    fontSize: FLARE_FONT_SIZE.muted,
    fontFamily: FLARE_FONT_FAMILY.medium,
    lineHeight: FLARE_LINE_HEIGHT.muted,
  },
  notificationHelpStepList: { gap: 6 },
  notificationHelpStepRow: { flexDirection: "row", alignItems: "flex-start" },
  notificationHelpStepBullet: { fontSize: 13, lineHeight: 20, marginRight: 8, fontFamily: "Inter_700Bold" },
  notificationHelpStepText: { flex: 1, fontSize: 13, lineHeight: 20 },
  helpCardIntro: { fontSize: 13, lineHeight: 20 },
  notificationHelpEmphasis: { fontStyle: "italic" },
  notificationHelpAction: { marginTop: 6, marginBottom: 8 },
  helpSectionToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  helpSectionToggleExpanded: { paddingBottom: 12 },
  helpSectionToggleTitle: { flex: 1 },
  helpSectionToggleMark: {
    fontSize: 20,
    lineHeight: 20,
    fontFamily: "Inter_400Regular",
    minWidth: 20,
    textAlign: "center",
  },
  helpSectionBody: { gap: 12 },
  remindersGuideLinkPress: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    gap: 6,
    marginTop: 20,
    marginBottom: 4,
    paddingVertical: 4,
  },
  remindersGuideLink: {
    fontSize: FLARE_FONT_SIZE.body,
    fontFamily: FLARE_FONT_FAMILY.regular,
    textDecorationLine: "underline",
  },
  bigText: { fontSize: 30, fontFamily: "Inter_700Bold", marginBottom: 8 },
  headerIconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  headerSettingsButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 4,
  },
  headerBackButton: {
    justifyContent: "center",
    alignItems: "flex-start",
    paddingVertical: 8,
    paddingLeft: Platform.OS === "ios" ? 6 : 4,
    paddingRight: 10,
    minHeight: 44,
  },
  headerDeleteButton: {
    justifyContent: "center",
    alignItems: "flex-end",
    paddingVertical: 8,
    paddingLeft: 10,
    paddingRight: Platform.OS === "ios" ? 6 : 4,
    minHeight: 44,
  },
  bottomTabBarOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
  },
  bottomTabBarWrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  bottomTabItem: { flex: 1, alignItems: "center", justifyContent: "center", gap: 3, paddingVertical: 4 },
  bottomTabLabel: { fontSize: 11, fontFamily: "Inter_500Medium" },
  accountIdentityRow: { flexDirection: "row", alignItems: "center", flex: 1, minWidth: 0 },
  accountIdentityNavRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  /** Nudge only the profile chevron to match list-row chevrons (card 14 + row 20 − profile pad 18). */
  accountIdentityChevronAlign: {
    marginRight: CARD_INNER_PADDING + ACCOUNT_LIST_ROW_PADDING - 18,
  },
  accountPaddedCard: { padding: 18 },
  accountDeleteCard: { paddingBottom: 20 },
  accountDeleteCardBody: { gap: 12 },
  accountDeleteFooter: {
    marginTop: 8,
    paddingHorizontal: SCREEN_EDGE_PADDING,
    alignItems: "center",
    gap: 6,
  },
  accountDeleteLink: { paddingVertical: 10 },
  accountDeleteLinkText: { fontSize: FLARE_FONT_SIZE.subhead, fontFamily: "Inter_500Medium" },
  accountDeleteHint: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 18,
  },
  accountAvatarWell: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  accountIdentityTextCol: { flex: 1, minWidth: 0 },
  accountFirstName: { fontSize: 18, fontFamily: "Inter_700Bold" },
  accountEmailLine: { fontSize: FLARE_FONT_SIZE.muted, fontFamily: "Inter_400Regular", marginTop: 3 },
  accountMemberSince: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 6 },
  accountNavRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  accountScrollContent: { flexGrow: 1 },
  /** Same height and radius as `PrimaryButton`; two equal slots like paired actions. */
  bioLockRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  bioLockTextCol: { flex: 1 },
  bioLockTitle: { fontSize: 15, fontFamily: "Inter_500Medium", marginBottom: 2 },
  appearanceRow: { flexDirection: "row", gap: 8, marginTop: 14 },
  appearanceChip: {
    flex: 1,
    minHeight: FLARE_BUTTON_MIN_HEIGHT,
    paddingHorizontal: FLARE_BUTTON_PADDING_H,
    borderRadius: FLARE_BUTTON_BORDER_RADIUS,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "stretch",
  },
  appearanceChipText: { fontSize: 14, fontFamily: "Inter_700Bold" },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 8 },
  reportBox: {
    minHeight: 130,
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
  },
  weatherIntroWrap: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    paddingLeft: 3,
    /** Same height as stacked greeting + date (date now sits top-right). */
    paddingBottom: 4 + FLARE_LINE_HEIGHT.muted - 8,
    marginBottom: 6,
  },
  weatherHero: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 12,
    paddingHorizontal: 0,
    paddingVertical: 8,
  },
  weatherIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
    marginRight: 8,
  },
  weatherIcon: { fontSize: 24 },
  weatherLeft: { flex: 1, paddingRight: 8 },
  weatherCity: { fontSize: FLARE_FONT_SIZE.muted, fontFamily: "Inter_500Medium" },
  weatherGreeting: {
    flex: 1,
    fontSize: 22,
    fontFamily: "Inter_800ExtraBold",
    paddingRight: 8,
    marginTop: 8,
    marginLeft: 8,
  },
  weatherDate: {
    fontSize: FLARE_FONT_SIZE.caption,
    lineHeight: FLARE_LINE_HEIGHT.caption,
    fontFamily: "Inter_400Regular",
    marginTop: 8,
    marginRight: 12,
    flexShrink: 0,
    textAlign: "right",
  },
  weatherDesc: { fontSize: FLARE_FONT_SIZE.muted, fontFamily: "Inter_400Regular", textTransform: "capitalize" },
  weatherTempWrap: { flexDirection: "row", alignItems: "flex-start", marginRight: 8 },
  weatherTemp: { fontSize: 30, fontFamily: "Inter_800ExtraBold" },
  weatherUnit: { fontSize: 12, fontFamily: "Inter_700Bold", marginTop: 6, marginLeft: 2 },
  checkinSection: {},
  /** Daily Check-in strip + More grid — shared shell */
  homeDashboardTile: {
    position: "relative",
    flexDirection: "column",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: "stretch",
    justifyContent: "center",
    height: 124,
    overflow: "hidden",
  },
  homeDashboardTileScroll: { marginRight: HOME_TILE_GAP },
  homeDashboardTileScrollLast: { marginRight: 0 },
  homeDashboardTileBody: {
    flex: 1,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    width: "100%",
  },
  homeDashboardTileIconWrap: {
    width: 52,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  moreGrid: { flexDirection: "row", flexWrap: "wrap", gap: HOME_TILE_GAP },
  moreGridLabel: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
    lineHeight: 18,
    width: "100%",
  },
  summaryWebRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  summaryWebLeft: { flexDirection: "row", alignItems: "center", flex: 1, paddingRight: 8 },
  summaryWebLabel: { fontSize: 14, fontFamily: "Inter_400Regular", flex: 1 },
  summaryWebValue: { fontSize: 14, fontFamily: "Inter_500Medium" },
  activityListWrap: {
    borderRadius: 10,
    overflow: "hidden",
  },
  /** After today’s list — away from Daily Check-in title band. */
  activityNoteRowDivider: { borderBottomWidth: 1 },
  aboutTagline: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    textAlign: "left",
    lineHeight: 20,
    marginBottom: 20,
  },
  ibdIntro: { fontSize: 13, lineHeight: 20, marginBottom: 8 },
  ibdSubsectionTitle: {
    fontSize: FLARE_FONT_SIZE.body,
    lineHeight: FLARE_LINE_HEIGHT.body,
    fontFamily: "Inter_700Bold",
    textAlign: "left",
    marginTop: 16,
    marginBottom: 10,
  },
  nutritionExamplesLabel: {
    fontFamily: FLARE_FONT_FAMILY.extrabold,
    fontSize: 13,
    marginBottom: 8,
  },
  aboutBody: { fontSize: 13, lineHeight: 20, marginBottom: 12 },
  aboutBodyLast: { fontSize: 13, lineHeight: 20, marginBottom: 0 },
  infoSectionContentEnd: { marginBottom: 0 },
  ibdBulletList: { gap: 8 },
  ibdBulletRow: { flexDirection: "row", alignItems: "flex-start" },
  ibdBulletDot: { fontSize: 14, lineHeight: 20, marginRight: 8, fontFamily: "Inter_700Bold" },
  ibdBulletText: { flex: 1, fontSize: 13, lineHeight: 20 },
  ibdCheckList: { gap: 8 },
  ibdCheckRow: { flexDirection: "row", alignItems: "flex-start" },
  ibdCheckIcon: { marginRight: 8, marginTop: 2 },
  ibdCheckText: { flex: 1, fontSize: 13, lineHeight: 20 },
  aboutContactSectionTitle: { marginTop: 28 },
  /** Contact card: paragraph only; spacing to email row is handled by button `marginTop`. */
  aboutContactIntro: { marginBottom: 0 },
  /** Sits directly under Contact intro copy. */
  aboutSupportButton: { alignSelf: "flex-start", marginTop: 10, paddingVertical: 10, paddingHorizontal: 4 },
  aboutSupportButtonPressed: { opacity: 0.75 },
  aboutSupportButtonText: { fontFamily: "Inter_700Bold", fontSize: FLARE_FONT_SIZE.subhead },
  /** Version / build separated from branding hero — typical for production About screens. */
  aboutFooter: { paddingTop: 28, paddingBottom: 16, paddingHorizontal: 16 },
  moreNavRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  moreNavRowLabel: { fontSize: 14, fontFamily: "Inter_400Regular", flex: 1, paddingRight: 10 },
  recentLogsViewAllRow: { alignItems: "flex-end", marginBottom: 8 },
  recentLogsViewAllText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  recentLogsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  recentLogsRowDate: { fontSize: 14, fontFamily: "Inter_500Medium" },
  recentLogsRowTime: { fontSize: 12, fontFamily: "Inter_400Regular" },
  recentLogsEmpty: { alignItems: "center", paddingVertical: 16, paddingHorizontal: 8 },
  recentLogsEmptyCta: { marginTop: 8 },
  /** Logged-at line above symptom detail review cards. */
  symptomDetailLoggedAt: {
    fontSize: FLARE_FONT_SIZE.caption,
    fontFamily: FLARE_FONT_FAMILY.regular,
    marginBottom: 16,
    textAlign: "center",
    lineHeight: FLARE_LINE_HEIGHT.caption,
  },
  hydrationCard: { paddingTop: 28, paddingBottom: 24, paddingHorizontal: 16 },
  hydrationTrackerBody: { alignSelf: "stretch", alignItems: "center", gap: 18 },
  hydrationHelpLinkPress: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    gap: 6,
    marginTop: 8,
    paddingVertical: 4,
  },
  hydrationHelpLink: {
    fontSize: FLARE_FONT_SIZE.body,
    fontFamily: FLARE_FONT_FAMILY.regular,
    textDecorationLine: "underline",
  },
  /** Keeps stacked detail rows out of `cardBody` gap (which would add space between every field). */
  detailFieldsStack: { alignSelf: "stretch" },
});
