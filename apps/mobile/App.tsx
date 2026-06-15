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
  Alert,
  Image,
  InteractionManager,
  Linking,
  Modal,
  Platform,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  ViewStyle,
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
import { flareFieldErrorStyle, LabeledInput } from "./components/FlareInput";
import { flareCardSectionStyles, FlareScreenSectionTitle } from "./components/FlareScreenSectionTitle";
import { HeaderOverflowMenu } from "./components/HeaderOverflowMenu";
import { SuccessNoticeScreen } from "./components/SuccessNoticeScreen";
import { CollapsingTitleScrollScreen } from "./components/CollapsingTitleScrollScreen";
import { FlareThemeProvider, useFlareColors, useFlareTheme } from "./theme";
import { formatUkDate } from "./lib/formatUkDate";
import { BOWEL_FEATURE_MCI_ICON, todayYmd } from "./lib/bowelMovementShared";
import { handleListExpansionNavigationRouteChange } from "./lib/listExpansionNavigation";
import { ListSelectionChromeProvider, useListSelectionChrome } from "./lib/listSelectionChrome";
import { useLogListSelection } from "./lib/useLogListSelection";
import { MY_MEDS_MCI_ICON, TRACK_MEDICATIONS_MCI_ICON } from "./lib/medicationFeatureIcons";
import {
  fetchMedicationsForUser,
  MEDICATIONS_GOAL_ACTIVITY_TITLE,
  MEDICATION_ADDED_ACTIVITY_TITLE,
  MEDICATION_TRACKING_ACTIVITY_TITLE,
} from "./lib/medicationShared";
import { HYDRATION_TARGET, HYDRATION_MCI_ICON, HYDRATION_MCI_ICON_EMPTY, loadHydrationResetTimestamp, saveHydrationReset, HYDRATION_GOAL_ACTIVITY_TITLE, HYDRATION_RESET_ACTIVITY_TITLE } from "./lib/hydrationShared";
import {
  bottomTabBarHeight,
  ACCOUNT_LIST_ROW_PADDING,
  bottomTabBarScrollInset,
  FLARE_FONT_FAMILY,
  FLARE_FONT_SIZE,
  FLARE_LINE_HEIGHT,
  HOME_TILE_GAP,
  SCREEN_EDGE_PADDING,
  SECTION_TITLE_MARGIN_BOTTOM,
  SECTION_TITLE_MARGIN_TOP,
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
  LogHistoryIntroSection,
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
import { supabase, TABLES } from "./lib/supabase";
import {
  dashboardSnapshotByUserId,
  dedupeNewsItems,
  invalidateDashboardSnapshot,
  type DashboardActivityRow,
  type DashboardNewsItem,
  type DashboardSnapshot,
} from "./lib/dashboardSnapshotCache";
/** Bowel UI lives in `screens/BowelScreen.tsx` — do not re-declare `BowelScreen` in this file. */
import { BristolGuideScreen } from "./screens/BristolGuideScreen";
import { BowelLogDetailScreen } from "./screens/BowelLogDetailScreen";
import { BowelScreen } from "./screens/BowelScreen";
import { MedicationDetailScreen } from "./screens/MedicationDetailScreen";
import { MedicationsScreen } from "./screens/MedicationsScreen";
import { WeightLogDetailScreen } from "./screens/WeightLogDetailScreen";
import { WeightScreen } from "./screens/WeightScreen";
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
  rescheduleAllLocalRemindersForUser,
  rescheduleAppointmentNotificationsForUser,
  rescheduleMedicationNotificationsForUser,
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

/** Reusable confirm sheet — use for logout, destructive actions, and future prompts. */
function ConfirmModal({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel = "Cancel",
  confirmDestructive,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel?: string;
  confirmDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const c = useFlareColors();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel} statusBarTranslucent>
      <View style={styles.confirmModalRoot}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
          onPress={onCancel}
          style={[StyleSheet.absoluteFillObject, { backgroundColor: c.modalBackdrop }]}
        />
        <View style={[styles.confirmModalCard, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
          <Text style={[styles.confirmModalTitle, { color: c.text }]}>{title}</Text>
          {message ? (
            <Text style={[styles.confirmModalMessage, { color: c.textMuted }]}>{message}</Text>
          ) : null}
          <View style={styles.confirmModalActions}>
            <View style={styles.confirmModalActionSlot}>
              <SecondaryButton title={cancelLabel} onPress={onCancel} />
            </View>
            <View style={styles.confirmModalActionSlot}>
              <PrimaryButton
                title={confirmLabel}
                onPress={onConfirm}
                variant={confirmDestructive ? "destructive" : "default"}
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
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
    title: "Account deleted",
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

/** Match web /api/image-proxy for production https; on LAN (http web) load https images directly — Android blocks cleartext to the dev server. */
function resolveNewsImageUri(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const webBase = (process.env.EXPO_PUBLIC_WEB_API_BASE_URL || "").replace(/\/$/, "");
  const webIsHttps = webBase.startsWith("https://");
  const imageIsHttps = /^https:\/\//i.test(trimmed);
  if (webBase && webIsHttps) {
    return `${webBase}/api/image-proxy?url=${encodeURIComponent(trimmed)}`;
  }
  if (webBase && !webIsHttps && !imageIsHttps) {
    return `${webBase}/api/image-proxy?url=${encodeURIComponent(trimmed)}`;
  }
  return trimmed;
}

function NewsThumbnail({ imageUrl }: { imageUrl?: string | null }) {
  const c = useFlareColors();
  const candidates = useMemo(() => {
    const trimmed = (imageUrl && String(imageUrl).trim()) || "";
    if (!trimmed) return [] as string[];
    const primary = resolveNewsImageUri(trimmed);
    const list: string[] = [];
    if (primary) list.push(primary);
    if (!list.includes(trimmed)) list.push(trimmed);
    return list;
  }, [imageUrl]);

  const [index, setIndex] = useState(0);
  useEffect(() => {
    setIndex(0);
  }, [candidates.join("|")]);

  if (!candidates.length) {
    return <Ionicons name="newspaper-outline" size={30} color={c.primary} style={{ opacity: 0.45 }} />;
  }
  if (index >= candidates.length) {
    return <Ionicons name="newspaper-outline" size={30} color={c.primary} style={{ opacity: 0.45 }} />;
  }

  return (
    <Image
      source={{ uri: candidates[index] }}
      style={styles.newsCardImageAsset}
      resizeMode="cover"
      onError={() => setIndex((i) => i + 1)}
    />
  );
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
      Alert.alert("Sign in failed", otpResendErrorMessage(error.message));
      return;
    }
    setOtpResendCount(0);
    setOtpSentAt(Date.now());
    setStep("code");
    Alert.alert(
      "Check your email",
      "We've sent a 6-digit code to the email you entered. It may take a minute to arrive.",
    );
  };

  const resendOtpCode = async () => {
    if (!canResendOtp) return;
    const email = getEmailValues("email");
    if (!email) {
      Alert.alert("Missing email", "Please enter your email first.");
      setStep("email");
      clearOtpSession();
      return;
    }
    setActiveAuthAction("resend");
    const { error } = await sendOtpToEmail(email);
    setActiveAuthAction(null);
    if (error) {
      Alert.alert("Could not resend code", otpResendErrorMessage(error.message));
      return;
    }
    setOtpResendCount((n) => n + 1);
    setOtpSentAt(Date.now());
    resetCode({ otpCode: "" });
    Alert.alert("New code sent", "We've sent a new 6-digit code to your email.");
  };

  const verifyOtpCode = async ({ otpCode }: { otpCode: string }) => {
    const email = getEmailValues("email");
    if (!email) {
      Alert.alert("Missing email", "Please enter your email first.");
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
      Alert.alert("Code verification failed", otpVerifyErrorMessage(error.message));
      return;
    }
    clearOtpSession();
    const user = data.user;
    if (user) {
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
      Alert.alert("Google sign in failed", error.message);
      return;
    }
    if (!data?.url) {
      setActiveAuthAction(null);
      Alert.alert("Google sign in failed", "Missing auth URL.");
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
          onSignedIn(sessionUserFromSupabaseAuthUser(sessionUser));
        } else {
          Alert.alert("Google sign in incomplete", "No session returned. Please try again.");
        }
      } finally {
        onAuthBusy?.(false);
      }
    }
    setActiveAuthAction(null);
  };

  /** Same layout as gray auth; fill page with blue in light appearance only. */
  const authBlue = !cAuth.isDark;
  const onPrimaryChrome = authBlue;
  return (
    <View
      style={[
        styles.authScreenFill,
        {
          backgroundColor: authBlue ? cAuth.primary : cAuth.screen,
          paddingTop: insets.top + 32,
          paddingBottom: Math.max(insets.bottom, 12),
          paddingHorizontal: SCREEN_EDGE_PADDING,
        },
      ]}
    >
      <View style={styles.authShell}>
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
        <Card title="" plain style={styles.authCardPlain}>
          {step === "method" ? (
            <View style={styles.authMethodPanel}>
              <Text style={[styles.authPromptTitle, { color: onPrimaryChrome ? cAuth.white : cAuth.text }]}>Sign in to continue</Text>
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: legalAccepted }}
                accessibilityLabel="Agree to Terms of Service and Privacy Policy, including how FlareCare processes health information you choose to provide"
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
                  , including how FlareCare processes health information I choose to provide.
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
            <View style={styles.authFlowPanel}>
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
            <View style={styles.authFlowPanel}>
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
        </Card>
      </View>
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
      Alert.alert("Could not save profile", error.message);
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
          paddingHorizontal: SCREEN_EDGE_PADDING,
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
const BOTTOM_BAR_VISIBLE_ROUTES = new Set(["Dashboard", "Account", "Reminders", "Meds", "Appointments"]);

/** Padding uses this screen’s route—not the globally focused route—so the exiting page doesn’t jump during transitions. */
function useBottomTabScrollInset() {
  const route = useRoute();
  const insets = useSafeAreaInsets();
  return BOTTOM_BAR_VISIBLE_ROUTES.has(route.name) ? bottomTabBarScrollInset(insets.bottom) : 0;
}

/** Matches `styles.screen` edge padding (used to size Daily Check-in row). */
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

type HomeDashTab = "today" | "news" | "logs" | "more";
/** When leaving Dashboard via a pill section, restore that pill on the next Dashboard focus (e.g. back from history). */
let dashboardHomeDashTabRestore: HomeDashTab | null = null;

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
        <Text style={[styles.moreGridLabel, { color: c.textSecondary }]} numberOfLines={2}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

function DashboardScreen({
  user,
  onTodayModeChange,
  onRegisterResetHome,
}: {
  user: SessionUser;
  onTodayModeChange?: (active: boolean) => void;
  onRegisterResetHome?: (reset: (() => void) | null) => void;
}) {
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
  const [recentActivity, setRecentActivity] = useState<DashboardActivityRow[]>(() => snapshotSeed?.recentActivity ?? []);
  const [historyPreview, setHistoryPreview] = useState({ symptomCount: 0, medicationCount: 0 });
  /** Dashboard pills — exclusive selection; default **More** shows the shortcuts grid. */
  const [homeDashTab, setHomeDashTab] = useState<HomeDashTab>("more");
  const hydrationTarget = HYDRATION_TARGET;
  useEffect(() => {
    onTodayModeChange?.(homeDashTab !== "more");
  }, [homeDashTab, onTodayModeChange]);
  useEffect(() => {
    onRegisterResetHome?.(() => {
      dashboardHomeDashTabRestore = null;
      setHomeDashTab("more");
    });
    return () => onRegisterResetHome?.(null);
  }, [onRegisterResetHome]);
  const dailyCheckinCards = [
    { key: "symptoms" as const, label: "Log Symptoms", icon: "thermometer", family: "mci", goTo: "SymptomLogWizard" },
    { key: "track-meds" as const, label: "Track Medications", icon: TRACK_MEDICATIONS_MCI_ICON, family: "mci", goTo: "MedicationTrackingWizard" },
    { key: "hydration" as const, label: "My Hydration", icon: HYDRATION_MCI_ICON, family: "mci", goTo: "Hydration" },
    { key: "bowel" as const, label: "Bowel Movements", icon: BOWEL_FEATURE_MCI_ICON, family: "mci", goTo: "Bowel" },
  ];
  const moreLinkCards = [
    { key: "meds", label: "My Meds", screen: "Meds" as const, icon: MY_MEDS_MCI_ICON, family: "mci" as const },
    { key: "reports", label: "Reports", screen: "Reports" as const, icon: "document-text-outline", family: "ion" as const },
    { key: "weight", label: "My Weight", screen: "Weight" as const, icon: "scale-bathroom", family: "mci" as const },
    { key: "appointments", label: "Appointments", screen: "Appointments" as const, icon: "calendar-outline", family: "ion" as const },
  ];
  const computedGreetingFirst = firstNameFromSessionUser(user);
  useEffect(() => {
    if (computedGreetingFirst !== "there") dashboardGreetingFirstNameByUserId[user.id] = computedGreetingFirst;
  }, [computedGreetingFirst, user.id]);
  const greetingFirstName =
    computedGreetingFirst !== "there"
      ? computedGreetingFirst
      : dashboardGreetingFirstNameByUserId[user.id] ?? "there";
  const todayLabel = `${new Date().toLocaleDateString("en-GB", { weekday: "long" })}, ${formatUkDate(new Date())}`;
  const formatRelativeTime = (timestamp: number) => {
    const diffMinutes = Math.floor((Date.now() - timestamp) / (1000 * 60));
    if (diffMinutes < 1) return "Just now";
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatUkDate(new Date(timestamp));
  };
  useFocusEffect(
    useCallback(() => {
      const restoreTab = dashboardHomeDashTabRestore;
      if (restoreTab !== null) {
        dashboardHomeDashTabRestore = null;
        setHomeDashTab(restoreTab);
      }

      let cancelled = false;
      const seedSnap = dashboardSnapshotByUserId[user.id];
      const snap: DashboardSnapshot = {
        todaySummary: seedSnap?.todaySummary ?? { symptoms: 0, medsTaken: 0, medsTotal: 0, hydration: 0 },
        recentActivity: seedSnap?.recentActivity ?? [],
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
            recentSymptomsRes,
            recentMedsRes,
            symptomHistoryCountRes,
            medicationHistoryCountRes,
            recentBowelRes,
            recentWeightRes,
          ] = await Promise.all([
            supabase.from(TABLES.LOG_SYMPTOMS).select("id,created_at").eq("user_id", user.id).gte("created_at", `${today}T00:00:00`),
            fetchMedicationsForUser(user.id),
            supabase
              .from(TABLES.MEDICATION_TAKEN)
              .select("medication_id,created_at")
              .eq("user_id", user.id)
              .eq("taken_date", today),
            supabase.from(TABLES.DAILY_HYDRATION).select("glasses,updated_at").eq("user_id", user.id).eq("date", today).maybeSingle(),
            supabase.from(TABLES.LOG_SYMPTOMS).select("id,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1),
            supabase.from(TABLES.LOG_MEDICATIONS).select("id,name,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1),
            supabase.from(TABLES.LOG_SYMPTOMS).select("id", { count: "exact", head: true }).eq("user_id", user.id),
            supabase.from(TABLES.LOG_MEDICATIONS).select("id", { count: "exact", head: true }).eq("user_id", user.id),
            supabase
              .from(TABLES.BOWEL_MOVEMENTS)
              .select("id,occurred_at,updated_at,created_at")
              .eq("user_id", user.id)
              .order("updated_at", { ascending: false })
              .limit(1),
            supabase.from(TABLES.TRACK_WEIGHT).select("id,date,value_kg").eq("user_id", user.id).order("date", { ascending: false }).limit(1),
          ]);

          const prescribedMeds = medicationsList.filter((med) => med.name !== "Medication Tracking");

          snap.todaySummary = {
            symptoms: todaySymptomsRes.data?.length ?? 0,
            medsTaken: takenMedsRes.data?.length ?? 0,
            medsTotal: prescribedMeds.length,
            hydration: todayHydrationRes.data?.glasses ?? 0,
          };

          const activityRows: DashboardActivityRow[] = [];
          const fourHoursAgo = Date.now() - 4 * 60 * 60 * 1000;

          const takenMedRows = (takenMedsRes.data ?? []) as { medication_id: string | number; created_at?: string }[];

          const recentSymptom = recentSymptomsRes.data?.[0] as { id: string; created_at: string } | undefined;
          const recentMedLog = recentMedsRes.data?.[0] as { id: string; created_at: string } | undefined;
          setHistoryPreview({
            symptomCount: symptomHistoryCountRes.count ?? 0,
            medicationCount: medicationHistoryCountRes.count ?? 0,
          });

          if (recentSymptom?.created_at) {
            activityRows.push({
              key: `symptom-${recentSymptom.id}`,
              title: "Logged symptom",
              ts: new Date(recentSymptom.created_at).getTime(),
              icon: "symptom",
            });
          }
          if (recentMedLog?.created_at) {
            activityRows.push({
              key: `med-${recentMedLog.id}`,
              title: MEDICATION_TRACKING_ACTIVITY_TITLE,
              ts: new Date(recentMedLog.created_at).getTime(),
              icon: "medication",
            });
          }

          for (const med of prescribedMeds) {
            if (!med.created_at) continue;
            const ts = new Date(med.created_at).getTime();
            if (Number.isNaN(ts) || ts < fourHoursAgo) continue;
            activityRows.push({
              key: `med-added-${med.id}`,
              title: MEDICATION_ADDED_ACTIVITY_TITLE,
              ts,
              icon: "medication",
            });
          }

          const allMedsTaken =
            prescribedMeds.length > 0 &&
            prescribedMeds.every((med) =>
              takenMedRows.some((row) => String(row.medication_id) === String(med.id)),
            );
          if (allMedsTaken && takenMedRows.length > 0) {
            const completedTs = takenMedRows.reduce((max, row) => {
              const ts = row.created_at ? new Date(row.created_at).getTime() : 0;
              return ts > max ? ts : max;
            }, 0);
            if (completedTs >= fourHoursAgo) {
              activityRows.push({
                key: `meds-goal-${today}`,
                title: MEDICATIONS_GOAL_ACTIVITY_TITLE,
                ts: completedTs,
                icon: "medication",
              });
            }
          }

          const recentBowel = recentBowelRes.data?.[0];
          const recentBowelSavedAt = recentBowel?.updated_at ?? recentBowel?.created_at;
          if (recentBowel && recentBowelSavedAt) {
            activityRows.push({
              key: `bowel-${recentBowel.id}`,
              title: "Logged bowel movement",
              ts: new Date(recentBowelSavedAt).getTime(),
              icon: "bowel",
            });
          }
          const recentWeight = recentWeightRes.data?.[0];
          if (recentWeight?.date) {
            const whenIso = `${recentWeight.date}T12:00:00`;
            activityRows.push({
              key: `weight-${recentWeight.id}`,
              title: `Logged weight (${Number(recentWeight.value_kg)} kg)`,
              ts: new Date(whenIso).getTime(),
              icon: "weight",
            });
          }

          const hydrationRow = todayHydrationRes.data;
          const hydrationGlasses = hydrationRow?.glasses ?? 0;
          if (hydrationGlasses >= HYDRATION_TARGET && hydrationRow?.updated_at) {
            activityRows.push({
              key: `hydration-goal-${today}`,
              title: HYDRATION_GOAL_ACTIVITY_TITLE,
              ts: new Date(hydrationRow.updated_at).getTime(),
              icon: "hydration",
            });
          }

          const hydrationResetTs = await loadHydrationResetTimestamp(user.id, today);
          if (hydrationResetTs != null) {
            activityRows.push({
              key: `hydration-reset-${today}`,
              title: HYDRATION_RESET_ACTIVITY_TITLE,
              ts: hydrationResetTs,
              icon: "hydration",
            });
          }

          snap.recentActivity = activityRows
            .filter((row) => row.ts >= fourHoursAgo)
            .sort((a, b) => b.ts - a.ts)
            .slice(0, 2);

          if (cancelled) return;
          setTodaySummary(snap.todaySummary);
          setRecentActivity(snap.recentActivity);
        } catch {
          snap.todaySummary = { symptoms: 0, medsTaken: 0, medsTotal: 0, hydration: 0 };
          snap.recentActivity = [];
          if (cancelled) return;
          setTodaySummary(snap.todaySummary);
          setRecentActivity(snap.recentActivity);
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

  const homeNavPills = (
    <View style={styles.homeNavPillsSection}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.homeNavPillsRow}>
        {(
          [
            ["today", "Today's"],
            ["logs", "Logs"],
            ["news", "Latest"],
            ["more", "More"],
          ] as const
        ).map(([tab, label]) => {
          const active = homeDashTab === tab;
          return (
            <Pressable
              key={tab}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => setHomeDashTab(tab)}
              style={[styles.homeNavPill, { backgroundColor: active ? c.primary : c.card }]}
            >
              <Text style={[styles.homeNavPillLabel, { color: active ? c.white : c.text }]}>{label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );

  const medsGoalComplete =
    todaySummary.medsTotal > 0 && todaySummary.medsTaken >= todaySummary.medsTotal;
  const hydrationGoalComplete = todaySummary.hydration >= hydrationTarget;

  const todayGoalItems = useMemo(
    () => [
      {
        id: "meds-goal",
        title: "Take Medications",
        subtitle: medsGoalComplete ? "Complete" : "Active",
        completed: medsGoalComplete,
      },
      {
        id: "hydration-goal",
        title: "Stay Hydrated",
        subtitle: hydrationGoalComplete ? "Complete" : "Active",
        completed: hydrationGoalComplete,
      },
    ],
    [hydrationGoalComplete, medsGoalComplete],
  );

  const todaySummaryItems = useMemo(
    () => [
      { id: "symptoms-summary", title: "Symptoms logged", trailingText: String(todaySummary.symptoms) },
      {
        id: "meds-summary",
        title: "Medications taken",
        trailingText: `${todaySummary.medsTaken}/${todaySummary.medsTotal}`,
      },
      { id: "hydration-summary", title: "Hydration", trailingText: `${todaySummary.hydration}/${hydrationTarget}` },
    ],
    [hydrationTarget, todaySummary],
  );

  const homePillBody =
    homeDashTab === "today" ? (
      <View style={styles.todayPillSection}>
        <Text
          style={[styles.dashboardSectionTitleLeft, styles.dashboardSectionTitleAfterPills, { color: c.text }]}
        >
          Goals
        </Text>
        <View style={[logHistoryCardStyles.trackerCard, { backgroundColor: c.card }]}>
          <LogHistoryList items={todayGoalItems} rowPaddingHorizontal={ACCOUNT_LIST_ROW_PADDING} />
        </View>
        <Text style={[styles.dashboardSectionTitleLeft, { color: c.text }]}>Summary</Text>
        <View style={[logHistoryCardStyles.trackerCard, { backgroundColor: c.card }]}>
          <LogHistoryList items={todaySummaryItems} rowPaddingHorizontal={ACCOUNT_LIST_ROW_PADDING} />
        </View>
      </View>
    ) : homeDashTab === "news" ? (
      <View style={styles.todayPillSection}>
        <Text
          style={[styles.dashboardSectionTitleLeft, styles.dashboardSectionTitleAfterPills, { color: c.text }]}
        >
          News
        </Text>
        {newsLoading ? (
          <Text style={[styles.muted, { color: c.textMuted }]}>Getting latest news...</Text>
        ) : newsError ? (
          <Text style={[styles.muted, { color: c.textMuted }]}>{newsError}</Text>
        ) : newsItems.length === 0 ? (
          <Text style={[styles.muted, { color: c.textMuted }]}>No news available right now.</Text>
        ) : (
          <View style={styles.newsFeed}>
            {newsItems.map((item) => (
              <Pressable
                key={item.link ?? item.title}
                style={[styles.newsFeedCard, { backgroundColor: c.newsCardBg }]}
                onPress={() => {
                  if (item.link) {
                    Linking.openURL(item.link);
                  }
                }}
              >
                <View style={styles.newsCardInner}>
                  <View style={[styles.newsCardImage, { backgroundColor: c.newsImageBg }]}>
                    <NewsThumbnail imageUrl={item.imageUrl} />
                  </View>
                  <View style={styles.newsCardBody}>
                    <Text style={[styles.newsTitle, { color: c.text }]} numberOfLines={3}>
                      {item.title}
                    </Text>
                    <Text style={[styles.newsMeta, { color: c.textMuted }]} numberOfLines={1}>
                      {item.source}
                      {item.publishedAt ? ` • ${formatUkDate(item.publishedAt)}` : ""}
                    </Text>
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </View>
    ) : homeDashTab === "logs" ? (
      <View style={styles.todayPillSection}>
        <Text
          style={[styles.dashboardSectionTitleLeft, styles.dashboardSectionTitleAfterPills, { color: c.text }]}
        >
          History
        </Text>
        <LogHistoryCard>
          <LogHistoryList
            items={[
              buildBrowseLogRowItem({
                id: "symptom",
                title: "Symptom logs",
                subtitle: formatHistoryBrowseSubtitle(historyPreview.symptomCount),
                accessibilityLabel: "Browse symptom history",
              }),
              buildBrowseLogRowItem({
                id: "medication",
                title: "Medication logs",
                subtitle: formatHistoryBrowseSubtitle(historyPreview.medicationCount),
                accessibilityLabel: "Browse medication tracking history",
              }),
            ]}
            onPressItem={(rowId) => {
              dashboardHomeDashTabRestore = "logs";
              navigation.navigate(rowId === "symptom" ? "SymptomHistory" : "MedicationTrackingHistory");
            }}
          />
        </LogHistoryCard>
      </View>
    ) : (
      <View style={styles.moreSection}>
        <Text style={[styles.dashboardSectionTitleLeft, styles.dashboardSectionTitleAfterPills, { color: c.text }]}>
          More
        </Text>
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
    );

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: c.screen }]}
      contentContainerStyle={{ paddingBottom: bottomScrollInset }}
      showsVerticalScrollIndicator={false}
    >
      <Card title="">
        <View style={styles.weatherIntroWrap}>
          <Text style={[styles.weatherGreeting, { color: c.text }]}>Hi, {greetingFirstName}</Text>
          <Text style={[styles.weatherDate, { color: c.textMuted }]}>{todayLabel}</Text>
        </View>
        {weatherMeta ? (
          <View style={styles.weatherHero}>
            <View style={styles.weatherIconWrap}>
              <Ionicons name={weatherMeta.icon ? owmIconIdToIoniconsName(weatherMeta.icon) : "partly-sunny"} size={28} color={c.primary} />
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
      <View style={styles.checkinSection}>
        <Text style={[styles.dashboardSectionTitle, { color: c.text }]}>Daily Check-in</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.checkinsRow}
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
      <Text style={[styles.dashboardSectionTitleLeft, { color: c.text }]}>Recent Activity</Text>
      <Card title="" style={styles.accountPaddedCard} compactBody>
        {recentActivity.length ? (
          <View style={styles.recentActivityFeed}>
            {recentActivity.map((item) => (
              <View key={item.key} style={styles.recentActivityFeedItem}>
                <Ionicons
                  name="pulse"
                  size={20}
                  color={c.primary}
                  style={styles.recentActivityFeedIcon}
                  accessibilityIgnoresInvertColors
                />
                <View style={styles.recentActivityFeedText}>
                  <Text style={[styles.recentActivityFeedTitle, { color: c.textMuted }]} numberOfLines={2}>
                    {item.title}
                  </Text>
                  <Text style={[styles.recentActivityFeedWhen, { color: c.textMuted }]}>{formatRelativeTime(item.ts)}</Text>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <Text style={[styles.muted, { color: c.textMuted }]}>No recent activity</Text>
        )}
      </Card>
      {homeNavPills}
      <View style={styles.homePillBodySection}>{homePillBody}</View>
    </ScrollView>
  );
}

function SymptomHistoryScreen({ user }: { user: SessionUser }) {
  const navigation = useNavigation<any>();
  const c = useFlareColors();
  const insets = useSafeAreaInsets();
  const bottomScrollInset = useBottomTabScrollInset();
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
      title: "Symptom log",
      whenIso: row.created_at,
    }),
  );

  const handleBulkDeleteConfirm = useCallback(() => {
    void runBulkDelete(async (ids) => {
      const result = await deleteUserLogRows(TABLES.LOG_SYMPTOMS, ids, user.id);
      if (!result.ok) {
        Alert.alert("Could not delete", result.message);
        throw new Error(result.message);
      }
      invalidateDashboardSnapshot(user.id);
      await refresh();
    });
  }, [refresh, runBulkDelete, user.id]);

  return (
    <>
      <ScrollView
        style={[styles.screen, { backgroundColor: c.screen }]}
        contentContainerStyle={{ paddingBottom: bottomScrollInset + selectionBarInset + 24 }}
      >
        <LogHistoryIntroSection tip="A list of your symptom events recorded through Log Symptoms.">
          {loading && rows.length === 0 ? (
            <LogHistoryListLoading />
          ) : (
            <LogHistoryPreviewList
              emptyMessage="No symptom logs yet."
              items={symptomLogItems}
              visibleCount={visibleCount}
              hasMore={hasMore}
              loadingMore={loadingMore}
              onLoadMore={() => void loadMore()}
              onPressItem={(logId) => navigation.navigate("SymptomDetail", { id: logId })}
              selectionMode={selectionMode}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
              onLongPressItem={enterSelectionWith}
            />
          )}
        </LogHistoryIntroSection>
      </ScrollView>
      <ConfirmModal
        visible={bulkDeleteOpen}
        title={selectedIds.size === 1 ? "Delete symptom log?" : `Delete ${selectedIds.size} symptom logs?`}
        message="This action cannot be undone."
        confirmLabel={bulkDeleting ? "Deleting…" : "Delete"}
        confirmDestructive
        onConfirm={handleBulkDeleteConfirm}
        onCancel={() => setBulkDeleteOpen(false)}
      />
    </>
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
      Alert.alert("Could not delete", result.message);
      return;
    }
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
      title: "Medication log",
      whenIso: row.created_at,
    }),
  );

  const handleBulkDeleteConfirm = useCallback(() => {
    void runBulkDelete(async (ids) => {
      const result = await deleteUserLogRows(TABLES.LOG_MEDICATIONS, ids, user.id);
      if (!result.ok) {
        Alert.alert("Could not delete", result.message);
        throw new Error(result.message);
      }
      invalidateDashboardSnapshot(user.id);
      await refresh();
    });
  }, [refresh, runBulkDelete, user.id]);

  return (
    <>
      <ScrollView
        style={[styles.screen, { backgroundColor: c.screen }]}
        contentContainerStyle={{ paddingBottom: bottomScrollInset + selectionBarInset + 24 }}
      >
        <LogHistoryIntroSection tip="A list of your medication events recorded through Track Medications.">
          {loading && rows.length === 0 ? (
            <LogHistoryListLoading />
          ) : (
            <LogHistoryPreviewList
              emptyMessage="No medication logs yet."
              items={medicationLogItems}
              visibleCount={visibleCount}
              hasMore={hasMore}
              loadingMore={loadingMore}
              onLoadMore={() => void loadMore()}
              onPressItem={(logId) => navigation.navigate("MedicationLogDetail", { id: logId })}
              selectionMode={selectionMode}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
              onLongPressItem={enterSelectionWith}
            />
          )}
        </LogHistoryIntroSection>
      </ScrollView>
      <ConfirmModal
        visible={bulkDeleteOpen}
        title={selectedIds.size === 1 ? "Delete medication log?" : `Delete ${selectedIds.size} medication logs?`}
        message="This action cannot be undone."
        confirmLabel={bulkDeleting ? "Deleting…" : "Delete"}
        confirmDestructive
        onConfirm={handleBulkDeleteConfirm}
        onCancel={() => setBulkDeleteOpen(false)}
      />
    </>
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
      Alert.alert("Could not delete", result.message);
      return;
    }
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

function HydrationStepperButton({
  icon,
  onPress,
  disabled,
  variant,
}: {
  icon: "minus" | "plus";
  onPress: () => void;
  disabled?: boolean;
  variant: "secondary" | "primary";
}) {
  const c = useFlareColors();
  const isPrimary = variant === "primary";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={icon === "minus" ? "Remove one glass" : "Add one glass"}
      accessibilityState={{ disabled: !!disabled }}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.hydrationStepperBtn,
        isPrimary
          ? { backgroundColor: disabled ? c.primaryDisabledBg : c.primary }
          : { backgroundColor: c.secondaryBtnBg, borderWidth: 1, borderColor: c.secondaryBtnBorder },
        disabled ? { opacity: 0.45 } : pressed ? { opacity: 0.88 } : null,
      ]}
    >
      <Ionicons
        name={icon === "minus" ? "remove" : "add"}
        size={20}
        color={isPrimary ? c.white : c.textSecondary}
        accessibilityIgnoresInvertColors
      />
    </Pressable>
  );
}

function HydrationScreen({ user }: { user: SessionUser }) {
  const c = useFlareColors();
  const navigation = useNavigation<any>();
  const bottomScrollInset = useBottomTabScrollInset();
  const [glasses, setGlasses] = useState(() => dashboardSnapshotByUserId[user.id]?.todaySummary.hydration ?? 0);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const today = todayYmd();
  const atGoal = glasses >= HYDRATION_TARGET;

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
    async (next: number) => {
      const clamped = Math.max(0, Math.min(HYDRATION_TARGET, next));
      const { error } = await supabase.from(TABLES.DAILY_HYDRATION).upsert(
        { user_id: user.id, date: today, glasses: clamped, updated_at: new Date().toISOString() },
        { onConflict: "user_id,date" },
      );
      if (error) return Alert.alert("Could not update hydration", error.message);
      setGlasses(clamped);
      invalidateDashboardSnapshot(user.id);
    },
    [today, user.id],
  );

  const handleResetConfirm = useCallback(async () => {
    setResetConfirmOpen(false);
    await saveHydrationReset(user.id, today);
    await persistGlasses(0);
  }, [persistGlasses, today, user.id]);

  return (
    <>
      <ScrollView
        style={[styles.screen, { backgroundColor: c.screen }]}
        contentContainerStyle={{ paddingBottom: bottomScrollInset + 32 }}
        showsVerticalScrollIndicator={false}
      >
        <LogHistoryCard style={styles.hydrationCard}>
          <View style={styles.hydrationTrackerBody}>
            <Text style={[styles.hydrationTodayLabel, { color: c.textMuted }]}>{formatUkDate(today)}</Text>

            <View style={styles.hydrationCupsRow}>
              {Array.from({ length: HYDRATION_TARGET }, (_, index) => {
                const filled = index < glasses;
                return (
                  <View key={index} style={styles.hydrationCupSlot}>
                    <MaterialCommunityIcons
                      name={filled ? HYDRATION_MCI_ICON : HYDRATION_MCI_ICON_EMPTY}
                      size={40}
                      color={filled ? c.primary : c.cardBorder}
                      accessibilityElementsHidden
                      importantForAccessibility="no"
                      accessibilityIgnoresInvertColors
                    />
                  </View>
                );
              })}
            </View>

            <Text style={[styles.hydrationCountLabel, { color: c.text }]}>
              {glasses} of {HYDRATION_TARGET} glasses
            </Text>

            <View style={[styles.hydrationStepperTrack, { backgroundColor: c.surfaceSubtle, borderColor: c.cardBorder }]}>
              <HydrationStepperButton
                icon="minus"
                variant="secondary"
                disabled={glasses === 0}
                onPress={() => persistGlasses(glasses - 1)}
              />
              <View style={[styles.hydrationStepperDivider, { backgroundColor: c.cardBorder }]} />
              <HydrationStepperButton
                icon="plus"
                variant="primary"
                disabled={atGoal}
                onPress={() => persistGlasses(glasses + 1)}
              />
            </View>

            {atGoal ? (
              <Text style={[styles.hydrationGoalReached, { color: c.primary }]}>Daily goal reached!</Text>
            ) : null}

            {glasses > 0 ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Reset today's hydration count"
                onPress={() => setResetConfirmOpen(true)}
                hitSlop={8}
                style={({ pressed }) => [styles.hydrationResetLink, pressed && { opacity: 0.7 }]}
              >
                <Text style={[styles.hydrationResetText, { color: c.textSecondary }]}>Reset today</Text>
              </Pressable>
            ) : null}
          </View>
        </LogHistoryCard>

        <Pressable
          accessibilityRole="link"
          accessibilityLabel="Daily Intake Guidelines for adults"
          onPress={() => navigation.navigate("AccountHelp", { expandSection: "hydration" })}
          style={({ pressed }) => [styles.hydrationHelpLinkPress, pressed && { opacity: 0.7 }]}
        >
          <Ionicons name="book-outline" size={16} color={c.textSecondary} accessibilityIgnoresInvertColors />
          <Text style={[styles.hydrationHelpLink, { color: c.text }]}>Daily Intake Guidelines</Text>
        </Pressable>
      </ScrollView>

      <ConfirmModal
        visible={resetConfirmOpen}
        title="Reset today's count?"
        message="Your hydration progress will be reset to 0. If you did not mean to do this, tap Cancel."
        confirmLabel="Reset"
        cancelLabel="Cancel"
        onCancel={() => setResetConfirmOpen(false)}
        onConfirm={handleResetConfirm}
      />
    </>
  );
}

function ReportsScreen({ user }: { user: SessionUser }) {
  const c = useFlareColors();
  const bottomScrollInset = useBottomTabScrollInset();
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<string>("");
  const [email, setEmail] = useState("");

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
    if (!base) return Alert.alert("Missing API base URL", "Set EXPO_PUBLIC_WEB_API_BASE_URL");
    const response = await fetch(`${base}/api/send-report-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clinicianEmail: email, reportText: report }),
    });
    if (!response.ok) {
      Alert.alert("Email failed", "Could not send report email.");
      return;
    }
    Alert.alert("Report sent", "Clinician email workflow completed.");
  };

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: c.screen }]}
      contentContainerStyle={{ paddingBottom: bottomScrollInset }}
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
    </ScrollView>
  );
}

const NOTIFICATION_HELP_SECTIONS = [
  {
    label: "Device settings",
    steps: [
      "Open your device's notification settings for Flare Care Mobile.",
      "Ensure notifications are allowed.",
    ],
  },
  {
    label: "Flare Care reminders",
    steps: [
      "Open the Reminders screen.",
      "Tap Enable Notifications if available.",
      "Verify that reminder alerts are turned on.",
    ],
  },
];

function NotificationHelpContent() {
  const c = useFlareColors();
  const [deviceSection, remindersSection] = NOTIFICATION_HELP_SECTIONS;

  return (
    <>
      <Text style={[logHistoryCardStyles.trackerIntro, { color: c.textMuted }]}>
        If you&apos;re not receiving alerts, check that notifications are enabled both in Flare Care and in your
        device settings.
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
          <PrimaryButton title="Open notification settings" onPress={() => void openAppNotificationSettings()} />
        </View>
      </View>

      <View style={styles.remindersHelpPathItem}>
        <Text style={[styles.notificationHelpSectionTitle, { color: c.text }]}>{remindersSection.label}</Text>
        <View style={styles.notificationHelpStepList}>
          {remindersSection.steps.map((step) => (
            <View key={step} style={styles.notificationHelpStepRow}>
              <Text style={[styles.notificationHelpStepBullet, { color: c.primary }]}>•</Text>
              <Text style={[styles.text, styles.notificationHelpStepText, { color: c.textMuted }]}>{step}</Text>
            </View>
          ))}
        </View>
      </View>

      <Text style={[styles.muted, styles.notificationHelpEmphasis, { color: c.textMuted, lineHeight: 20 }]}>
        Notification settings may vary by device
        {Platform.OS === "android" ? " and Android version" : ""}.
      </Text>
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
      <Text style={[logHistoryCardStyles.trackerIntro, { color: c.textMuted }]}>
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
    "From Appointments, tap Appointment summary.",
    "Choose a time period — a preset (2, 4, or 6 weeks) or a custom date range.",
    "Review each section: Health overview, Next appointment, and What changed.",
    "Tap Share or Email to send your summary to your clinician.",
  ];

  return (
    <>
      <Text style={[logHistoryCardStyles.trackerIntro, { color: c.textMuted }]}>
        Appointment summary pulls together your recent logs so you can prepare for a visit.
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
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [scheduled, setScheduled] = useState(0);
  const [lastError, setLastError] = useState("");
  const [registering, setRegistering] = useState(false);

  const refreshReminderStatus = useCallback(async () => {
    if (!Notifications) return;
    try {
      const { status } = await Notifications.getPermissionsAsync();
      const granted = status === "granted";
      setPermissionGranted(granted);
      setScheduled(granted ? await getLocalReminderScheduledCount() : 0);
    } catch {
      // non-fatal status read
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setRegistering(false);
      void refreshReminderStatus();
    }, [refreshReminderStatus]),
  );

  const register = async () => {
    setLastError("");
    setRegistering(true);
    if (!Notifications || !Device) {
      setRegistering(false);
      Alert.alert("Not supported in Expo Go", "Use a development build to test local reminders.");
      return;
    }
    if (!Device.isDevice) {
      setRegistering(false);
      Alert.alert("Device required", "Use a physical device for reminders.");
      return;
    }
    await ensureLocalReminderNotificationsReady();
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== "granted") {
      setRegistering(false);
      Alert.alert("Permission denied", "Notification permission is required.");
      return;
    }
    setPermissionGranted(true);
    try {
      const { scheduledCount, permissionGranted } = await rescheduleAllLocalRemindersForUser(user.id);
      if (!permissionGranted) {
        setPermissionGranted(false);
        setRegistering(false);
        Alert.alert("Permission denied", "Notification permission is required.");
        return;
      }
      setScheduled(scheduledCount);
      setLastError("");

      try {
        await registerExpoPushTokenBestEffort();
      } catch (pushError) {
        console.warn("PUSH_REGISTER_SKIPPED", pushError);
      }
    } catch (error: any) {
      const message =
        error?.message ||
        error?.toString?.() ||
        (typeof error === "string" ? error : "Unknown error");
      console.error("LOCAL_REMINDER_SETUP_ERROR", error);
      setLastError(message);
      Alert.alert("Notification setup failed", message);
    } finally {
      setRegistering(false);
    }
  };

  const reminderStatusSubtitle = !permissionGranted
    ? "Turn on to receive medication and appointment reminders"
    : scheduled > 0
      ? `${scheduled} reminder${scheduled === 1 ? "" : "s"} scheduled`
      : "No reminders scheduled yet";

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: c.screen }]}
      contentContainerStyle={{ paddingBottom: bottomScrollInset + 16 }}
    >
      <Card title="" style={styles.accountPaddedCard} compactBody>
        <View style={styles.remindersStatusRow}>
          <View style={[styles.accountAvatarWell, { backgroundColor: c.surfaceSubtle }]}>
            <Ionicons
              name={permissionGranted ? "notifications" : "notifications-off-outline"}
              size={26}
              color={c.primary}
              accessibilityIgnoresInvertColors
            />
          </View>
          <View style={styles.accountIdentityTextCol}>
            <Text style={[styles.accountFirstName, { color: c.text }]}>
              {permissionGranted ? "Notifications on" : "Notifications off"}
            </Text>
            <Text style={[styles.remindersStatusSubtitle, { color: c.textMuted }]}>{reminderStatusSubtitle}</Text>
          </View>
        </View>
        {!permissionGranted ? (
          <Text style={[styles.muted, { color: c.textMuted, marginTop: 16, lineHeight: 20 }]}>
            Tap once to allow notifications. After that, saving medications or appointments will schedule reminders
            automatically.
          </Text>
        ) : null}
        <View style={styles.remindersSetupBlock}>
          <PrimaryButton
            title={permissionGranted ? "Refresh reminders" : "Enable notifications"}
            onPress={register}
            loading={registering}
          />
        </View>
        {lastError ? (
          <Text style={[flareFieldErrorStyle(c, "wizard"), { marginTop: 12 }]}>{lastError}</Text>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Troubleshoot notifications"
          onPress={() => navigation.navigate("AccountHelp", { expandSection: "notifications" })}
          style={({ pressed }) => [styles.remindersGuideLinkPress, pressed && { opacity: 0.7 }]}
        >
          <Text style={[styles.remindersGuideLink, { color: c.text }]}>Troubleshoot notifications</Text>
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

      <Text style={[styles.dashboardSectionTitleLeft, { color: c.text }]}>The two main types are:</Text>
      <Text style={[styles.ibdSubsectionTitle, { color: c.text }]}>Crohn&apos;s disease</Text>
      <IbdBulletList
        items={[
          "Can affect any part of the digestive tract",
          "Inflammation can be patchy with healthy areas in between",
          "Can affect the full thickness of the bowel wall",
          "May cause complications like fistulas and strictures",
        ]}
        isLastInSection
      />

      <Text style={[styles.ibdSubsectionTitle, { color: c.text }]}>Ulcerative colitis</Text>
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
        Common symptoms include
      </Text>
      <IbdBulletList items={IBD_SYMPTOMS} isLastInSection />

      <Text style={[styles.dashboardSectionTitleLeft, styles.aboutContactSectionTitle, { color: c.text }]}>Common triggers</Text>
      <IbdBulletList items={IBD_TRIGGERS} isLastInSection />

      <Text style={[styles.dashboardSectionTitleLeft, styles.aboutContactSectionTitle, { color: c.text }]}>How FlareCare can help</Text>
      <IbdCheckList items={IBD_FLARECARE_HELPS} isLastInSection />
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
      <Card title="" style={styles.accountPaddedCard} compactBody>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Personal details, ${firstLine}, ${emailLine}`}
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
      </Card>
      <View style={[logHistoryCardStyles.trackerCard, flareCardSectionStyles.container, { backgroundColor: c.card }]}>
        <FlareScreenSectionTitle inCard>Account info</FlareScreenSectionTitle>
        <LogDetailFieldGroup
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
      <Card title="" style={styles.accountPaddedCard} compactBody>
        <View style={styles.accountIdentityRow}>
          <View style={[styles.accountAvatarWell, { backgroundColor: c.surfaceSubtle }]}>
            <Ionicons name="person" size={26} color={c.primary} accessibilityIgnoresInvertColors />
          </View>
          <View style={styles.accountIdentityTextCol}>
            <Text style={[styles.accountFirstName, { color: c.text }]}>{accountIdentityFirstLine(user)}</Text>
            <Text style={[styles.accountEmailLine, { color: c.textMuted }]}>{user.email || "Unknown user"}</Text>
          </View>
        </View>
      </Card>
      <View style={[logHistoryCardStyles.trackerCard, flareCardSectionStyles.container, { backgroundColor: c.card }]}>
        <FlareScreenSectionTitle inCard>Profile info</FlareScreenSectionTitle>
        <LogDetailFieldGroup
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
          rowPaddingHorizontal={ACCOUNT_LIST_ROW_PADDING}
          onPressItem={(document) => navigation.navigate("LegalDocument", { document })}
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

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: c.screen }]}
      contentContainerStyle={[styles.accountScrollContent, { paddingBottom: bottomScrollInset + 16 }]}
    >
      <View style={[logHistoryCardStyles.trackerCard, flareCardSectionStyles.container, { backgroundColor: c.card }]}>
        <FlareScreenSectionTitle inCard>Notifications</FlareScreenSectionTitle>
        <LogHistoryList
          items={[
            {
              id: "reminders",
              title: "Push notifications and reminders",
              accessibilityLabel: "Push notifications and reminders",
            },
          ]}
          rowPaddingHorizontal={ACCOUNT_LIST_ROW_PADDING}
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
    </ScrollView>
  );
}

function AccountScreen({
  user,
  prepareSignOut,
  finishSignOut,
  restoreAfterAbortedSignOut,
}: {
  user: SessionUser;
  prepareSignOut: (reason: SignOutReason) => void;
  finishSignOut: () => Promise<void>;
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
    prepareSignOut("account_deleted");
    try {
      const { error } = await supabase.rpc("delete_user_account");
      if (error) {
        await restoreAfterAbortedSignOut();
        Alert.alert("Could not delete account", error.message);
        return;
      }
      await finishSignOut();
    } catch (e: unknown) {
      await restoreAfterAbortedSignOut();
      const msg = e instanceof Error ? e.message : "Something went wrong.";
      Alert.alert("Could not delete account", msg);
    } finally {
      deleteAccountInFlight.current = false;
    }
  }, [finishSignOut, prepareSignOut, restoreAfterAbortedSignOut]);

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: c.screen }]}
      contentContainerStyle={{ paddingBottom: bottomScrollInset + 16 }}
    >
      <Card title="" style={styles.accountPaddedCard} compactBody>
        <View style={styles.accountIdentityRow}>
          <View style={[styles.accountAvatarWell, { backgroundColor: c.surfaceSubtle }]}>
            <Ionicons name="person" size={26} color={c.primary} accessibilityIgnoresInvertColors />
          </View>
          <View style={styles.accountIdentityTextCol}>
            <Text style={[styles.accountFirstName, { color: c.text }]}>{accountFirstName}</Text>
            <Text style={[styles.accountEmailLine, { color: c.textMuted }]}>{user.email || "Unknown user"}</Text>
          </View>
        </View>
      </Card>
      <View style={[logHistoryCardStyles.trackerCard, flareCardSectionStyles.container, { backgroundColor: c.card }]}>
        <FlareScreenSectionTitle inCard>My account</FlareScreenSectionTitle>
        <LogHistoryList
          items={ACCOUNT_OPTION_ROUTES.map((item) => ({
            id: item.route,
            title: item.label,
            accessibilityLabel: item.label,
          }))}
          rowPaddingHorizontal={ACCOUNT_LIST_ROW_PADDING}
          onPressItem={(route) => navigation.navigate(route)}
        />
      </View>
      <View style={[logHistoryCardStyles.trackerCard, flareCardSectionStyles.container, { backgroundColor: c.card }]}>
        <FlareScreenSectionTitle inCard>Delete account</FlareScreenSectionTitle>
        <Text style={[styles.muted, { color: c.textMuted, lineHeight: 20 }]}>
          Permanently delete your account and all associated data. This cannot be undone.
        </Text>
        <SecondaryButton
          title="Delete account"
          onPress={() => setDeleteAccountConfirmOpen(true)}
        />
      </View>
      <ConfirmModal
        visible={deleteAccountConfirmOpen}
        title="Delete account"
        message="Are you sure you want to permanently delete your account? This action cannot be undone and all your data will be lost."
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
  suppressDashboardActive = false,
  onResetDashboardHome,
}: {
  routeName: string;
  navigationRef: NavigationContainerRef<Record<string, object | undefined>> | null;
  suppressDashboardActive?: boolean;
  onResetDashboardHome?: () => void;
}) {
  const { colors } = useFlareTheme();
  const c = useFlareColors();
  const insets = useSafeAreaInsets();
  const { chrome } = useListSelectionChrome();
  const selectionChrome = chrome?.routeName === routeName ? chrome : null;

  if (!BOTTOM_BAR_VISIBLE_ROUTES.has(routeName) && !selectionChrome) {
    return null;
  }

  const go = (target: "Dashboard" | "Reminders" | "Account") => {
    if (target === "Dashboard" && routeName === "Dashboard" && suppressDashboardActive) {
      onResetDashboardHome?.();
      return;
    }
    if (target === "Dashboard") {
      dashboardHomeDashTabRestore = null;
    }
    navigationRef?.navigate(target as never);
  };

  const item = (
    target: "Dashboard" | "Reminders" | "Account",
    icon: ({ active }: { active: boolean }) => React.ReactNode,
    label: string,
  ) => {
    const active = routeName === target && !(target === "Dashboard" && suppressDashboardActive);
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
        "Reminders",
        ({ active }) => (
          <Ionicons name={active ? "notifications" : "notifications-outline"} size={23} color={active ? colors.primary : colors.textMuted} />
        ),
        "Reminders",
      )}
      {deleteSlot}
    </View>
  );
}

function AppTabs({
  user,
  onLogout,
  prepareSignOut,
  finishSignOut,
  restoreAfterAbortedSignOut,
  onAppShellReady,
}: {
  user: SessionUser;
  onLogout: (reason?: SignOutReason) => void | Promise<void>;
  prepareSignOut: (reason: SignOutReason) => void;
  finishSignOut: () => Promise<void>;
  restoreAfterAbortedSignOut: () => Promise<void>;
  /** Fires once the root navigator has laid out — use to hide the post-login entry blocker. */
  onAppShellReady?: () => void;
}) {
  const { nav, colors } = useFlareTheme();
  const navigationRef = useNavigationContainerRef<Record<string, object | undefined>>();
  const [focusRouteName, setFocusRouteName] = useState("Dashboard");
  const [dashboardHomePillActive, setDashboardHomePillActive] = useState(false);
  const resetDashboardHomeRef = useRef<(() => void) | null>(null);
  const resetDashboardHome = useCallback(() => {
    resetDashboardHomeRef.current?.();
  }, []);
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
    const isLegalDocument = route.name === "LegalDocument";
    const isAccount = route.name === "Account";
    const isReminders = route.name === "Reminders";
    const titleForRoute: Record<string, string> = {
      SymptomHistory: "History",
      SymptomDetail: "Symptom Details",
      MedicationTrackingHistory: "History",
      MedicationLogDetail: "Medication Log",
      SymptomLogWizard: "Log Symptoms",
      MedicationTrackingWizard: "Track Medications",
      AccountInfo: "Information",
      AccountPersonalDetails: "Personal details",
      AccountSecurity: "Security",
      AccountLegal: "Legal",
      AccountHelp: "Help",
      Settings: "Settings",
      Reminders: "Reminders",
      Hydration: "My Hydration",
      Meds: "My Meds",
      MedicationDetail: "Medication",
      Bowel: "Bowel Movements",
      BowelLogDetail: "Bowel log",
      BristolGuide: "Bristol Stool Chart",
      Weight: "My Weight",
      WeightLogDetail: "Weight log",
      Appointments: "Appointments",
      AppointmentsPast: "Past appointments",
      AppointmentDetail: "Appointment",
      AppointmentBrief: "Appointment summary",
      AppointmentBriefCustomRange: "Custom range",
      AppointmentBriefResult: "Your summary",
      AppointmentBriefHealth: "Health overview",
      AppointmentBriefNext: "Next appointment",
      AppointmentBriefChanges: "What changed",
    };
    const isSymptomLogWizard = route.name === "SymptomLogWizard";
    const isMedicationTrackingWizard = route.name === "MedicationTrackingWizard";

    const headerHidesOverflowMenu =
      route.name === "Settings" ||
      route.name === "SymptomLogWizard" ||
      route.name === "MedicationTrackingWizard" ||
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
            : isLegalDocument
              ? ""
            : isAccount
              ? "Account"
              : isReminders
                ? "Reminders"
                : isSymptomLogWizard || isMedicationTrackingWizard
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
      headerBackVisible: false,
      /** Match `styles.screen` horizontal inset so header controls line up with cards. */
      headerRightContainerStyle: { paddingRight: SCREEN_EDGE_PADDING, paddingLeft: 0 },
      /** Avoid stacking default header padding with our own — keeps chevron near the leading edge. */
      headerLeftContainerStyle: { paddingLeft: 0, marginLeft: 0 },
      headerLeft:
        !isDashboard &&
        !isSymptomLogWizard &&
        !isMedicationTrackingWizard &&
        !isAccount &&
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
              {() => (
                <DashboardScreen
                  key={user.id}
                  user={user}
                  onTodayModeChange={setDashboardHomePillActive}
                  onRegisterResetHome={(reset) => {
                    resetDashboardHomeRef.current = reset;
                  }}
                />
              )}
            </AppStack.Screen>
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
            <AppStack.Screen name="BowelLogDetail">{() => <BowelLogDetailScreen user={user} />}</AppStack.Screen>
            <AppStack.Screen name="BristolGuide" component={BristolGuideScreen} />
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
            <AppStack.Screen name="Account">
              {() => (
                <AccountScreen
                  user={user}
                  prepareSignOut={prepareSignOut}
                  finishSignOut={finishSignOut}
                  restoreAfterAbortedSignOut={restoreAfterAbortedSignOut}
                />
              )}
            </AppStack.Screen>
            <AppStack.Screen name="Settings">{() => <SettingsScreen />}</AppStack.Screen>
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
          <MainBottomTabBar
            routeName={focusRouteName}
            navigationRef={navigationRef}
            suppressDashboardActive={focusRouteName === "Dashboard" && dashboardHomePillActive}
            onResetDashboardHome={resetDashboardHome}
          />
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
  const [appShellReady, setAppShellReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authBusy, setAuthBusy] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
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

  const prepareSignOut = useCallback((reason: SignOutReason) => {
    setSignOutNotice(reason);
  }, []);

  const finishSignOut = useCallback(async () => {
    try {
      await clearMedicationNotificationsForUser();
    } catch {
      // non-fatal
    }
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
      prepareSignOut(reason);
      await finishSignOut();
    },
    [finishSignOut, prepareSignOut],
  );

  const profileSetupActive = Boolean(user && profileNeedsSetup(user));

  useEffect(() => {
    setAppShellReady(false);
  }, [user?.id, profileSetupActive]);

  const markAppShellReady = useCallback(() => {
    setAppShellReady(true);
  }, []);

  const content = useMemo(() => {
    if (!fontsLoaded || loading || showSplash || !appearanceHydrated) {
      return <SplashScreen />;
    }
    if (signOutNotice) {
      const copy = SIGN_OUT_COPY[signOutNotice];
      return (
        <View style={[styles.signOutShell, { backgroundColor: c.screen }]}>
          {user ? (
            <AppTabs
              user={user}
              onLogout={completeSignOut}
              prepareSignOut={prepareSignOut}
              finishSignOut={finishSignOut}
              restoreAfterAbortedSignOut={restoreAfterAbortedSignOut}
              onAppShellReady={markAppShellReady}
            />
          ) : null}
          <View style={styles.signOutOverlay}>
            <SuccessNoticeScreen
              title={copy.title}
              message={copy.message}
              buttonTitle="Sign in"
              fullScreen
              onPress={() => setSignOutNotice(null)}
            />
          </View>
        </View>
      );
    }
    if (profileSetupActive) {
      return <ProfileSetupScreen user={user!} onComplete={(next) => setUser(next)} />;
    }
    if (user) {
      return (
        <AppEntryShell ready={appShellReady} backgroundColor={c.screen}>
          <AppTabs
            user={user}
            onLogout={completeSignOut}
            prepareSignOut={prepareSignOut}
            finishSignOut={finishSignOut}
            restoreAfterAbortedSignOut={restoreAfterAbortedSignOut}
            onAppShellReady={markAppShellReady}
          />
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
    authBusy,
    appShellReady,
    c.screen,
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
  signOutShell: { flex: 1 },
  signOutOverlay: { ...StyleSheet.absoluteFillObject },
  screen: { flex: 1, padding: SCREEN_EDGE_PADDING },
  authScreenFill: { flex: 1 },
  authShell: { flex: 1, transform: [{ translateY: 40 }] },
  authBrandBlock: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 12,
    paddingTop: 12,
    transform: [{ translateY: 44 }],
  },
  authLogo: { width: 92, height: 92 },
  authBrandName: { fontSize: 28, fontFamily: "Inter_700Bold" },
  authBrandTagline: {
    textAlign: "center",
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "Inter_400Regular",
    paddingHorizontal: 8,
  },
  authCardPlain: { flex: 1 },
  authMethodPanel: { flex: 1, justifyContent: "center" },
  authMethodActions: { marginTop: 18, gap: 8 },
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
  confirmModalRoot: { flex: 1, justifyContent: "center", paddingHorizontal: 20 },
  confirmModalCard: {
    borderRadius: 14,
    padding: 20,
    borderWidth: StyleSheet.hairlineWidth,
    width: "100%",
    maxWidth: 400,
    alignSelf: "center",
  },
  confirmModalTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  confirmModalMessage: { fontSize: 14, fontFamily: "Inter_400Regular", marginTop: 10, lineHeight: 20 },
  confirmModalActions: { flexDirection: "row", gap: 8, marginTop: 22 },
  confirmModalActionSlot: { flex: 1, minWidth: 0 },
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
  todayPillSection: { width: "100%" },
  homePillCard: { paddingHorizontal: 18, paddingVertical: 14 },
  homePillNavRow: { paddingVertical: 0 },
  todaySummaryRows: { gap: 8 },
  homeNavPillsSection: { marginTop: 10 },
  homePillBodySection: { marginTop: 16 },
  dashboardSectionTitleAfterPills: { marginTop: 0 },
  homeNavPillsRow: { flexDirection: "row", gap: 8, paddingVertical: 2 },
  homeNavPill: {
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  homeNavPillLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  dashboardSectionTitle: {
    fontSize: FLARE_FONT_SIZE.sectionTitle,
    fontFamily: FLARE_FONT_FAMILY.bold,
    marginBottom: SECTION_TITLE_MARGIN_BOTTOM,
    marginTop: SECTION_TITLE_MARGIN_TOP,
    textAlign: "center",
  },
  dashboardSectionTitleLeft: {
    fontSize: FLARE_FONT_SIZE.sectionTitle,
    fontFamily: FLARE_FONT_FAMILY.bold,
    marginBottom: SECTION_TITLE_MARGIN_BOTTOM,
    marginTop: SECTION_TITLE_MARGIN_TOP,
    textAlign: "left",
  },
  text: { fontSize: 14, fontFamily: "Inter_400Regular" },
  muted: { fontSize: 13, fontFamily: "Inter_400Regular" },
  remindersSetupBlock: { gap: 12, marginTop: 16 },
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
  notificationHelpStepBullet: { fontSize: 14, lineHeight: 20, marginRight: 8, fontFamily: "Inter_700Bold" },
  notificationHelpStepText: { flex: 1, lineHeight: 20 },
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
  accountPaddedCard: { padding: 18 },
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
  accountEmailLine: { fontSize: 14, fontFamily: "Inter_400Regular", marginTop: 2 },
  accountMemberSince: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 6 },
  accountNavRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  accountScrollContent: { flexGrow: 1 },
  /** Same height and radius as `PrimaryButton`; two equal slots like paired actions. */
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
  weatherIntroWrap: { paddingLeft: 3 },
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
  weatherCity: { fontSize: 15, fontFamily: "Inter_500Medium" },
  weatherGreeting: { fontSize: 24, fontFamily: "Inter_800ExtraBold", marginBottom: 2 },
  weatherDate: { fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: 6 },
  weatherDesc: { fontSize: 13, fontFamily: "Inter_400Regular", textTransform: "capitalize" },
  weatherTempWrap: { flexDirection: "row", alignItems: "flex-start", marginRight: 8 },
  weatherTemp: { fontSize: 30, fontFamily: "Inter_800ExtraBold" },
  weatherUnit: { fontSize: 12, fontFamily: "Inter_700Bold", marginTop: 6, marginLeft: 2 },
  checkinSection: { marginBottom: 12 },
  checkinsRow: { paddingVertical: 2 },
  /** Daily Check-in strip + More grid — shared shell */
  homeDashboardTile: {
    position: "relative",
    flexDirection: "column",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: "stretch",
    justifyContent: "center",
    minHeight: 124,
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
  moreSection: { marginBottom: 12 },
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
  recentActivityFeed: { gap: 14 },
  recentActivityFeedItem: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  recentActivityFeedIcon: { flexShrink: 0, alignSelf: "flex-start" },
  recentActivityFeedText: { flex: 1, minWidth: 0, gap: 4 },
  recentActivityFeedTitle: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
  recentActivityFeedWhen: { fontSize: 12, fontFamily: "Inter_400Regular" },
  activityNoteRowDivider: { borderBottomWidth: 1 },
  aboutTagline: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    textAlign: "left",
    lineHeight: 20,
    marginBottom: 20,
  },
  ibdIntro: { lineHeight: 22, marginBottom: 8 },
  ibdSubsectionTitle: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    textAlign: "left",
    marginTop: 16,
    marginBottom: 10,
  },
  aboutBody: { lineHeight: 22, marginBottom: 12 },
  aboutBodyLast: { lineHeight: 22, marginBottom: 0 },
  infoSectionContentEnd: { marginBottom: 0 },
  ibdBulletList: { gap: 8 },
  ibdBulletRow: { flexDirection: "row", alignItems: "flex-start" },
  ibdBulletDot: { fontSize: 14, lineHeight: 20, marginRight: 8, fontFamily: "Inter_700Bold" },
  ibdBulletText: { flex: 1, lineHeight: 20 },
  ibdCheckList: { gap: 8 },
  ibdCheckRow: { flexDirection: "row", alignItems: "flex-start" },
  ibdCheckIcon: { marginRight: 8, marginTop: 2 },
  ibdCheckText: { flex: 1, lineHeight: 20 },
  aboutContactSectionTitle: { marginTop: 28 },
  /** Contact card: paragraph only; spacing to email row is handled by button `marginTop`. */
  aboutContactIntro: { marginBottom: 0 },
  /** Sits directly under Contact intro copy. */
  aboutSupportButton: { alignSelf: "flex-start", marginTop: 10, paddingVertical: 10, paddingHorizontal: 4 },
  aboutSupportButtonPressed: { opacity: 0.75 },
  aboutSupportButtonText: { fontFamily: "Inter_700Bold", fontSize: 15 },
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
  newsFeed: { gap: 16 },
  newsFeedCard: {
    width: "100%",
    borderRadius: 12,
    overflow: "hidden",
  },
  /** Inset for image + text; marginTop on body spaces image from title (gap on Pressable is unreliable). */
  newsCardInner: { padding: 14 },
  newsCardImage: {
    width: "100%",
    aspectRatio: 16 / 10,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    overflow: "hidden",
  },
  newsCardImageAsset: {
    width: "100%",
    height: "100%",
  },
  newsCardBody: { marginTop: 14 },
  newsTitle: { fontSize: 14, fontFamily: "Inter_700Bold", lineHeight: 20 },
  newsMeta: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 6 },
  /** Logged-at line above symptom detail review cards. */
  symptomDetailLoggedAt: { fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: 16, textAlign: "center" },
  hydrationCard: { paddingVertical: 14 },
  hydrationTrackerBody: { alignSelf: "stretch", alignItems: "center", gap: 16 },
  hydrationTodayLabel: {
    fontSize: FLARE_FONT_SIZE.body,
    fontFamily: FLARE_FONT_FAMILY.regular,
  },
  hydrationCupsRow: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "stretch",
  },
  hydrationCupSlot: { flex: 1, alignItems: "center" },
  hydrationCountLabel: {
    fontSize: FLARE_FONT_SIZE.navTitle,
    fontFamily: FLARE_FONT_FAMILY.bold,
  },
  hydrationStepperTrack: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "stretch",
    borderWidth: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  hydrationStepperDivider: { width: StyleSheet.hairlineWidth, alignSelf: "stretch" },
  hydrationResetLink: { paddingVertical: 4 },
  hydrationResetText: { fontSize: 14, fontFamily: "Inter_400Regular", textDecorationLine: "underline" },
  hydrationStepperBtn: {
    flex: 1,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  hydrationGoalReached: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
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
