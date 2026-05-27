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
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  ViewStyle,
} from "react-native";
import { SafeAreaProvider, initialWindowMetrics, useSafeAreaInsets } from "react-native-safe-area-context";
import {
  FLARE_BUTTON_BORDER_RADIUS,
  FLARE_BUTTON_MIN_HEIGHT,
  FLARE_BUTTON_PADDING_H,
  PrimaryButton,
  SecondaryButton,
} from "./components/FlareButton";
import { flareFieldErrorStyle, LabeledInput } from "./components/FlareInput";
import { HeaderOverflowMenu } from "./components/HeaderOverflowMenu";
import { StackedDetailField } from "./components/StackedDetailField";
import {
  SymptomReviewCard,
  SymptomReviewField,
  SymptomReviewGrid,
  SymptomReviewMealBlock,
  SymptomReviewNotesBody,
  SymptomReviewSubsection,
} from "./components/symptomReviewLayout";
import { FlareThemeProvider, useFlareColors, useFlareTheme } from "./theme";
import { formatUkDate } from "./lib/formatUkDate";
import { HYDRATION_TARGET, loadHydrationResetTimestamp, saveHydrationReset, HYDRATION_GOAL_ACTIVITY_TITLE, HYDRATION_RESET_ACTIVITY_TITLE } from "./lib/hydrationShared";
import {
  formatOtpCountdown,
  OTP_MAX_RESENDS,
  otpRemainingSeconds,
  otpResendErrorMessage,
  otpVerifyErrorMessage,
} from "./lib/otpAuth";
import { LegalDocumentView, type LegalDocumentKind } from "./components/LegalDocumentView";
import { supabase, TABLES } from "./lib/supabase";
import {
  dashboardSnapshotByUserId,
  dedupeNewsItems,
  invalidateDashboardSnapshot,
  type DashboardActivityRow,
  type DashboardNewsItem,
  type DashboardSnapshot,
} from "./lib/dashboardSnapshotCache";
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
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
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
type Appointment = { id: number; date: string; type: string | null; notes: string | null; time: string | null };
type Medication = { id: number; name: string; dosage: string | null; time_of_day: string | null };

async function rescheduleMedicationNotificationsForUser(userId: string) {
  if (!Notifications) return { scheduledCount: 0 };
  const existingRaw = await AsyncStorage.getItem("flarecare.notificationIds");
  const existingIds: string[] = existingRaw ? JSON.parse(existingRaw) : [];
  for (const id of existingIds) {
    try {
      await Notifications.cancelScheduledNotificationAsync(id);
    } catch {
      // ignore stale ids
    }
  }

  const { data: meds } = await supabase
    .from(TABLES.MEDICATIONS)
    .select("name,time_of_day")
    .eq("user_id", userId)
    .eq("reminders_enabled", true);

  const ids: string[] = [];
  for (const med of meds ?? []) {
    const [hour, minute] = String(med.time_of_day || "08:00").split(":").map((v) => Number(v));
    const id = await Notifications.scheduleNotificationAsync({
      content: { title: "Medication Reminder", body: `Time to take ${med.name}` },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: hour || 8, minute: minute || 0 },
    });
    ids.push(id);
  }

  await AsyncStorage.setItem("flarecare.notificationIds", JSON.stringify(ids));
  return { scheduledCount: ids.length };
}

async function rescheduleAppointmentNotificationsForUser(userId: string) {
  if (!Notifications) return { scheduledCount: 0 };
  const existingRaw = await AsyncStorage.getItem("flarecare.appointmentNotificationIds");
  const existingIds: string[] = existingRaw ? JSON.parse(existingRaw) : [];
  for (const id of existingIds) {
    try {
      await Notifications.cancelScheduledNotificationAsync(id);
    } catch {
      // ignore stale ids
    }
  }

  const { data: appointments } = await supabase
    .from(TABLES.APPOINTMENTS)
    .select("id,date,time,type,reminder_minutes_before")
    .eq("user_id", userId);

  const ids: string[] = [];
  const now = Date.now();
  for (const apt of appointments ?? []) {
    const time = String(apt.time || "09:00");
    const dateTime = new Date(`${apt.date}T${time}:00`);
    if (Number.isNaN(dateTime.getTime())) continue;
    const leadMinutes = Number(apt.reminder_minutes_before ?? 60);
    const triggerDate = new Date(dateTime.getTime() - leadMinutes * 60 * 1000);
    if (triggerDate.getTime() <= now) continue;

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: "Appointment Reminder",
        body: `${apt.type || "Appointment"} at ${apt.time || "09:00"}`,
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: triggerDate },
    });
    ids.push(id);
  }

  await AsyncStorage.setItem("flarecare.appointmentNotificationIds", JSON.stringify(ids));
  return { scheduledCount: ids.length };
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

/** Shown after an explicit sign-out before returning to the login screen. */
function SignedOutScreen({ reason, onContinue }: { reason: SignOutReason; onContinue: () => void }) {
  const c = useFlareColors();
  const insets = useSafeAreaInsets();
  const copy = SIGN_OUT_COPY[reason];

  return (
    <View
      style={[
        styles.signedOutScreen,
        {
          backgroundColor: c.screen,
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 24,
          paddingHorizontal: SCREEN_EDGE_PADDING,
        },
      ]}
    >
      <View style={styles.signedOutCard}>
        <Ionicons name="checkmark-circle" size={72} color={c.primary} accessibilityIgnoresInvertColors />
        <Text style={[styles.signedOutTitle, { color: c.text }]}>{copy.title}</Text>
        <Text style={[styles.signedOutMessage, { color: c.textMuted }]}>{copy.message}</Text>
        <View style={styles.signedOutActions}>
          <PrimaryButton title="Sign in" onPress={onContinue} />
        </View>
      </View>
    </View>
  );
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
          paddingTop: insets.top + 20,
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
          {step === "method" ? (
            <View style={styles.authMethodPanel}>
              <Text style={[styles.authPromptTitle, { color: onPrimaryChrome ? cAuth.white : cAuth.text }]}>Sign in to continue</Text>
              <Text style={[styles.authPromptSub, { color: onPrimaryChrome ? "rgba(255,255,255,0.88)" : cAuth.textMuted }]}>
                Choose your preferred login method
              </Text>
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
          paddingTop: insets.top + 20,
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

/** Show bottom shortcuts on dashboard + primary tab destinations; hide on wizard/detail flows, Hydration, etc. */
/** Only bottom-bar tab roots — not individual “More” / check-in screens (go Home to switch tab). */
const BOTTOM_BAR_VISIBLE_ROUTES = new Set(["Dashboard", "Account", "Reminders"]);

/** Padding uses this screen’s route—not the globally focused route—so the exiting page doesn’t jump during transitions. */
function useBottomTabScrollInset() {
  const route = useRoute();
  const insets = useSafeAreaInsets();
  return BOTTOM_BAR_VISIBLE_ROUTES.has(route.name) ? Math.max(insets.bottom, 8) + 36 : 0;
}

/** Matches `styles.screen` edge padding (used to size Daily Check-in row). */
const SCREEN_EDGE_PADDING = 12;
/** Space between sibling home tiles: Daily Check-in scroll + More grid. */
const HOME_TILE_GAP = 12;

/** Dashboard / history lists — symptom log id + time. */
type RecentLogListRow = { id: string; created_at: string };

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

function formatRecentLogTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

/** Avoid greeting flicker (“there”) when session metadata/email arrives shortly after navigation. */
const dashboardGreetingFirstNameByUserId: Record<string, string> = {};

type HomeDashTab = "today" | "news" | "logs" | null;
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
  /** Dashboard pills — Today / Logs / News only; default (null) shows the main home dashboard. */
  const [homeDashTab, setHomeDashTab] = useState<HomeDashTab>(null);
  const hydrationTarget = HYDRATION_TARGET;
  useEffect(() => {
    onTodayModeChange?.(homeDashTab !== null);
  }, [homeDashTab, onTodayModeChange]);
  useEffect(() => {
    onRegisterResetHome?.(() => {
      dashboardHomeDashTabRestore = null;
      setHomeDashTab(null);
    });
    return () => onRegisterResetHome?.(null);
  }, [onRegisterResetHome]);
  const dailyCheckinCards = [
    { key: "symptoms" as const, label: "Log Symptoms", icon: "thermometer", family: "mci", goTo: "SymptomLogWizard" },
    { key: "track-meds" as const, label: "Track Medications", icon: "pill", family: "mci", goTo: "MedicationTrackingWizard" },
    { key: "hydration" as const, label: "My Hydration", icon: "water", family: "mci", goTo: "Hydration" },
    { key: "bowel" as const, label: "Bowel Movements", icon: "stomach", family: "mci", goTo: "Bowel" },
  ];
  const moreLinkCards = [
    { key: "meds", label: "My Meds", screen: "Meds" as const, icon: "pill", family: "mci" as const },
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
          const today = new Date().toISOString().split("T")[0];
          const [
            todaySymptomsRes,
            medicationsRes,
            takenMedsRes,
            todayHydrationRes,
            recentSymptomsRes,
            recentMedsRes,
            recentBowelRes,
            recentWeightRes,
          ] = await Promise.all([
            supabase.from(TABLES.LOG_SYMPTOMS).select("id,created_at").eq("user_id", user.id).gte("created_at", `${today}T00:00:00`),
            supabase
              .from(TABLES.MEDICATIONS)
              .select("id,name")
              .eq("user_id", user.id)
              .neq("name", "Medication Tracking"),
            supabase
              .from(TABLES.MEDICATION_TAKEN)
              .select("medication_id")
              .eq("user_id", user.id)
              .eq("taken_date", today),
            supabase.from(TABLES.DAILY_HYDRATION).select("glasses,updated_at").eq("user_id", user.id).eq("date", today).maybeSingle(),
            supabase.from(TABLES.LOG_SYMPTOMS).select("id,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1),
            supabase.from(TABLES.LOG_MEDICATIONS).select("id,name,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1),
            supabase.from(TABLES.BOWEL_MOVEMENTS).select("id,occurred_at").eq("user_id", user.id).order("occurred_at", { ascending: false }).limit(1),
            supabase.from(TABLES.TRACK_WEIGHT).select("id,date,value_kg").eq("user_id", user.id).order("date", { ascending: false }).limit(1),
          ]);

          snap.todaySummary = {
            symptoms: todaySymptomsRes.data?.length ?? 0,
            medsTaken: takenMedsRes.data?.length ?? 0,
            medsTotal: medicationsRes.data?.length ?? 0,
            hydration: todayHydrationRes.data?.glasses ?? 0,
          };

          const activityRows: DashboardActivityRow[] = [];

          const recentSymptom = recentSymptomsRes.data?.[0];
          if (recentSymptom?.created_at) {
            activityRows.push({
              key: `symptom-${recentSymptom.id}`,
              title: "Logged symptom",
              ts: new Date(recentSymptom.created_at).getTime(),
              icon: "symptom",
            });
          }
          const recentMed = recentMedsRes.data?.[0];
          if (recentMed?.created_at) {
            activityRows.push({
              key: `med-${recentMed.id}`,
              title: recentMed.name ? `Logged medication (${recentMed.name})` : "Logged medication",
              ts: new Date(recentMed.created_at).getTime(),
              icon: "medication",
            });
          }
          const recentBowel = recentBowelRes.data?.[0];
          if (recentBowel?.occurred_at) {
            activityRows.push({
              key: `bowel-${recentBowel.id}`,
              title: "Logged bowel movement",
              ts: new Date(recentBowel.occurred_at).getTime(),
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

          const fourHoursAgo = Date.now() - 4 * 60 * 60 * 1000;
          snap.recentActivity = activityRows
            .filter((row) => row.ts >= fourHoursAgo)
            .sort((a, b) => b.ts - a.ts)
            .slice(0, 4);

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
        <Pressable
          onPress={() => setHomeDashTab((prev) => (prev === "today" ? null : "today"))}
          style={[
            styles.homeNavPill,
            homeDashTab === "today"
              ? { backgroundColor: c.primary, borderColor: c.primary }
              : { backgroundColor: c.card, borderColor: c.cardBorder },
          ]}
        >
          <Text style={[styles.homeNavPillLabel, { color: homeDashTab === "today" ? c.white : c.text }]}>Today</Text>
        </Pressable>
        <Pressable
          onPress={() => setHomeDashTab((prev) => (prev === "logs" ? null : "logs"))}
          style={[
            styles.homeNavPill,
            homeDashTab === "logs"
              ? { backgroundColor: c.primary, borderColor: c.primary }
              : { backgroundColor: c.card, borderColor: c.cardBorder },
          ]}
        >
          <Text style={[styles.homeNavPillLabel, { color: homeDashTab === "logs" ? c.white : c.text }]}>Logs</Text>
        </Pressable>
        <Pressable
          onPress={() => setHomeDashTab((prev) => (prev === "news" ? null : "news"))}
          style={[
            styles.homeNavPill,
            homeDashTab === "news"
              ? { backgroundColor: c.primary, borderColor: c.primary }
              : { backgroundColor: c.card, borderColor: c.cardBorder },
          ]}
        >
          <Text style={[styles.homeNavPillLabel, { color: homeDashTab === "news" ? c.white : c.text }]}>News</Text>
        </Pressable>
      </ScrollView>
    </View>
  );

  const showMedsGoal = !(todaySummary.medsTotal > 0 && todaySummary.medsTaken >= todaySummary.medsTotal);
  const showHydrationGoal = todaySummary.hydration < hydrationTarget;
  const noGoalsToday = !showMedsGoal && !showHydrationGoal;

  const homePillBody =
    homeDashTab === "today" ? (
      <View style={styles.todayPillSection}>
        <Text
          style={[styles.dashboardSectionTitleLeft, styles.dashboardSectionTitleAfterPills, { color: c.textSecondary }]}
        >
          Goals
        </Text>
        <Card title="" style={styles.homePillCard} compactBody>
          <View style={styles.todaySummaryRows}>
            {showMedsGoal ? (
              <View style={styles.summaryWebRow}>
                <View style={styles.summaryWebLeft}>
                  <Text style={[styles.summaryWebLabel, { color: c.textSecondary }]}>Take Medications</Text>
                </View>
              </View>
            ) : null}
            {showHydrationGoal ? (
              <View style={styles.summaryWebRow}>
                <View style={styles.summaryWebLeft}>
                  <Text style={[styles.summaryWebLabel, { color: c.textSecondary }]}>Stay Hydrated</Text>
                </View>
              </View>
            ) : null}
            {noGoalsToday ? (
              <Text style={[styles.summaryWebLabel, { color: c.textMuted }]}>No goals today.</Text>
            ) : null}
          </View>
        </Card>
        <Text style={[styles.dashboardSectionTitleLeft, { color: c.text }]}>Summary</Text>
        <Card title="" style={styles.homePillCard} compactBody>
          <View style={styles.todaySummaryRows}>
            <View style={styles.summaryWebRow}>
              <View style={styles.summaryWebLeft}>
                <Text style={[styles.summaryWebLabel, { color: c.textMuted }]}>Symptoms logged</Text>
              </View>
              <Text style={[styles.summaryWebValue, { color: c.text }]}>{todaySummary.symptoms}</Text>
            </View>
            <View style={styles.summaryWebRow}>
              <View style={styles.summaryWebLeft}>
                <Text style={[styles.summaryWebLabel, { color: c.textMuted }]}>Medications taken</Text>
              </View>
              <Text style={[styles.summaryWebValue, { color: c.text }]}>
                {todaySummary.medsTaken}/{todaySummary.medsTotal}
              </Text>
            </View>
            <View style={styles.summaryWebRow}>
              <View style={styles.summaryWebLeft}>
                <Text style={[styles.summaryWebLabel, { color: c.textMuted }]}>Hydration</Text>
              </View>
              <Text style={[styles.summaryWebValue, { color: c.text }]}>
                {todaySummary.hydration}/{hydrationTarget}
              </Text>
            </View>
          </View>
        </Card>
      </View>
    ) : homeDashTab === "news" ? (
      newsLoading ? (
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
      )
    ) : homeDashTab === "logs" ? (
      <Card title="" style={styles.homePillCard} compactBody>
        <AccountOptionRow
          label="Symptom History"
          labelColor="text"
          labelSize={14}
          chevronSize={16}
          rowStyle={styles.homePillOptionRow}
          onPress={() => {
            dashboardHomeDashTabRestore = "logs";
            navigation.navigate("SymptomHistory");
          }}
        />
        <AccountOptionRow
          label="Medication Tracking History"
          labelColor="text"
          labelSize={14}
          chevronSize={16}
          rowStyle={styles.homePillOptionRow}
          onPress={() => {
            dashboardHomeDashTabRestore = "logs";
            navigation.navigate("MedicationTrackingHistory");
          }}
        />
      </Card>
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
          <Text style={[styles.muted, { color: c.textMuted }]}>No recent activity yet.</Text>
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
  const bottomScrollInset = useBottomTabScrollInset();
  const [rows, setRows] = useState<RecentLogListRow[]>([]);
  const load = useCallback(async () => {
    const { data } = await supabase
      .from(TABLES.LOG_SYMPTOMS)
      .select("id,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100);
    setRows((data ?? []) as RecentLogListRow[]);
  }, [user.id]);
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );
  return (
    <ScrollView style={[styles.screen, { backgroundColor: c.screen }]} contentContainerStyle={{ paddingBottom: bottomScrollInset }}>
      <Card title="Symptom logs">
        <Text
          style={{
            marginBottom: 12,
            fontSize: 14,
            fontFamily: "Inter_400Regular",
            lineHeight: 22,
            color: c.textMuted,
          }}
        >
          Logs show what you reported on the day your symptoms started, not for every day of the symptom duration.
        </Text>
        <View style={styles.detailFieldsStack}>
          {rows.length === 0 ? (
            <Text style={[styles.muted, { color: c.textMuted }]}>No symptoms logged yet.</Text>
          ) : (
            <View style={[styles.activityListWrap, { backgroundColor: c.surfaceSubtle }]}>
              {rows.map((row, index) => (
                <Pressable
                  key={String(row.id)}
                  accessibilityRole="button"
                  onPress={() => navigation.navigate("SymptomDetail", { id: String(row.id) })}
                  style={[
                    styles.recentLogsRow,
                    index !== rows.length - 1 ? [styles.activityNoteRowDivider, { borderBottomColor: c.cardBorder }] : null,
                  ]}
                >
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={[styles.recentLogsRowDate, { color: c.textSecondary }]}>{formatUkDate(row.created_at)}</Text>
                  </View>
                  <Text style={[styles.recentLogsRowTime, { color: c.textMuted }]}>{formatRecentLogTime(row.created_at)}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </Card>
      <PrimaryButton title="Log a symptom" onPress={() => navigation.navigate("SymptomLogWizard")} />
    </ScrollView>
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
  useEffect(() => {
    load();
  }, [load]);

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
  const createdDate = createdIso ? new Date(createdIso) : null;
  const createdSubtitle =
    createdDate && !Number.isNaN(createdDate.getTime())
      ? `${createdDate.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short", year: "numeric" })} at ${createdDate.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}`
      : "";

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
      <View style={[styles.screen, styles.centered, { backgroundColor: c.screen, paddingBottom: bottomScrollInset }]}>
        <ActivityIndicator color={c.primary} />
        <Text style={[styles.muted, { color: c.textMuted, marginTop: 12 }]}>Loading…</Text>
      </View>
    );
  }

  if (!row) {
    return (
      <ScrollView style={[styles.screen, { backgroundColor: c.screen }]} contentContainerStyle={{ paddingBottom: bottomScrollInset + 24 }}>
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

  return (
    <>
      <ScrollView style={[styles.screen, { backgroundColor: c.screen }]} contentContainerStyle={{ paddingBottom: bottomScrollInset + 24 }}>
        {createdSubtitle ? (
          <Text style={[styles.symptomDetailLoggedAt, { color: c.textMuted }]}>{createdSubtitle}</Text>
        ) : null}

        <SymptomReviewCard title="Basic Information">
        <SymptomReviewGrid>
          <SymptomReviewField label="Start Date" value={timelineStart} />
          <SymptomReviewField label="Status" value={isOngoing ? "Ongoing" : "Ended"} />
          {!isOngoing && timelineEnd ? (
            <SymptomReviewField label="End Date" value={formatUkDate(timelineEnd)} />
          ) : null}
          <SymptomReviewField label="Severity" value={formatSymptomScoreDisplay(severityRaw)} />
          <SymptomReviewField label="Stress Level" value={formatSymptomScoreDisplay(stressRaw)} />
        </SymptomReviewGrid>
      </SymptomReviewCard>

      <SymptomReviewCard title="Bathroom Frequency">
        <SymptomReviewGrid>
          <SymptomReviewField
            label="Frequency"
            value={normalBathroom ? `${normalBathroom} times/day` : "Not set"}
          />
          {bathroomChanged ? (
            <SymptomReviewField
              label="Frequency Changed"
              value={bathroomChanged === "yes" ? "Yes" : "No"}
            />
          ) : null}
        </SymptomReviewGrid>
        {bathroomChanged === "yes" && bathroomChangeDetails ? (
          <SymptomReviewSubsection label="Change Description" value={bathroomChangeDetails} />
        ) : null}
      </SymptomReviewCard>

      {showLifestyleCard ? (
        <SymptomReviewCard title="Lifestyle">
          <SymptomReviewGrid>
            {isFirstTimeLifestyle && (smoker === true || smoker === false) ? (
              <SymptomReviewField label="Smoker" value={smoker === true ? "Yes" : "No"} />
            ) : null}
            {isFirstTimeLifestyle && smoker === true && smokingHabits ? (
              <SymptomReviewField label="Smoking Habits" value={smokingHabits} />
            ) : null}
            {!isFirstTimeLifestyle && typeof smokedOnDay === "boolean" ? (
              <SymptomReviewField label="Smoked" value={smokedReviewValue} />
            ) : null}
            {isFirstTimeLifestyle && smoker === true && smokedAmount ? (
              <SymptomReviewField label="Smoked" value={smokedAmount} />
            ) : null}
            {isFirstTimeLifestyle && (alcohol === true || alcohol === false) ? (
              <SymptomReviewField label="Alcohol" value={alcohol === true ? "Yes" : "No"} />
            ) : null}
            {isFirstTimeLifestyle && alcohol === true && averageAlcohol ? (
              <SymptomReviewField
                label="Alcohol Habits (on average)"
                value={`${averageAlcohol} units/week`}
              />
            ) : null}
            {!isFirstTimeLifestyle && typeof drankOnDay === "boolean" ? (
              <SymptomReviewField label="Alcohol Units Consumed" value={alcoholUnitsReviewValue} />
            ) : null}
            {isFirstTimeLifestyle && alcohol === true && alcoholUnits ? (
              <SymptomReviewField label="Alcohol Units Consumed" value={`${alcoholUnits} units`} />
            ) : null}
          </SymptomReviewGrid>
        </SymptomReviewCard>
      ) : null}

      {mealDetailEntries.length > 0 ? (
        <SymptomReviewCard title="Meals">
          {mealDetailEntries.map((entry, index) => (
            <SymptomReviewMealBlock
              key={entry.label}
              label={entry.label}
              items={entry.items}
              showDivider={index < mealDetailEntries.length - 1}
            />
          ))}
        </SymptomReviewCard>
      ) : null}

        {notesText ? (
          <SymptomReviewCard title="Notes">
            <SymptomReviewNotesBody>{notesText}</SymptomReviewNotesBody>
          </SymptomReviewCard>
        ) : null}
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
  const bottomScrollInset = useBottomTabScrollInset();
  const [rows, setRows] = useState<RecentLogListRow[]>([]);
  const load = useCallback(async () => {
    const { data } = await supabase
      .from(TABLES.LOG_MEDICATIONS)
      .select("id,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100);
    setRows((data ?? []) as RecentLogListRow[]);
  }, [user.id]);
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );
  return (
    <ScrollView style={[styles.screen, { backgroundColor: c.screen }]} contentContainerStyle={{ paddingBottom: bottomScrollInset }}>
      <Card title="Medication logs">
        <Text
          style={{
            marginBottom: 12,
            fontSize: 14,
            fontFamily: "Inter_400Regular",
            lineHeight: 22,
            color: c.textMuted,
          }}
        >
          These logs include prescribed medications you missed, and any NSAIDs and antibiotics you took during a specific period.
        </Text>
        <View style={styles.detailFieldsStack}>
          {rows.length === 0 ? (
            <Text style={[styles.muted, { color: c.textMuted }]}>No medication tracking logs yet.</Text>
          ) : (
            <View style={[styles.activityListWrap, { backgroundColor: c.surfaceSubtle }]}>
              {rows.map((row, index) => (
                <Pressable
                  key={String(row.id)}
                  accessibilityRole="button"
                  onPress={() => navigation.navigate("MedicationLogDetail", { id: String(row.id) })}
                  style={[
                    styles.recentLogsRow,
                    index !== rows.length - 1 ? [styles.activityNoteRowDivider, { borderBottomColor: c.cardBorder }] : null,
                  ]}
                >
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={[styles.recentLogsRowDate, { color: c.textSecondary }]}>{formatUkDate(row.created_at)}</Text>
                  </View>
                  <Text style={[styles.recentLogsRowTime, { color: c.textMuted }]}>{formatRecentLogTime(row.created_at)}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </Card>
      <PrimaryButton title="Track medications" onPress={() => navigation.navigate("MedicationTrackingWizard")} />
    </ScrollView>
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
  useEffect(() => {
    load();
  }, [load]);

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
  const createdDate = createdIso ? new Date(createdIso) : null;
  const createdSubtitle =
    createdDate && !Number.isNaN(createdDate.getTime())
      ? `${createdDate.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short", year: "numeric" })} at ${createdDate.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}`
      : "";

  const missedItems = parseMedicationLogList(row?.missed_medications_list, false);
  const nsaidItems = parseMedicationLogList(row?.nsaid_list, true);
  const antibioticItems = parseMedicationLogList(row?.antibiotic_list, true);

  const renderListSection = (
    title: string,
    items: MedicationLogDetailItem[],
    showDosage: boolean,
  ) => {
    if (!items.length) return null;
    return (
      <SymptomReviewCard title={title}>
        {items.map((item, index) => (
          <View
            key={`${item.medication}-${index}`}
            style={
              index < items.length - 1
                ? {
                    borderBottomWidth: StyleSheet.hairlineWidth,
                    borderBottomColor: c.cardBorder,
                    paddingBottom: 14,
                    marginBottom: 14,
                  }
                : undefined
            }
          >
            <SymptomReviewGrid>
              <SymptomReviewField label="Medication" value={item.medication} />
              {showDosage ? (
                <SymptomReviewField label="Dosage" value={item.dosage || "N/A"} />
              ) : null}
              <SymptomReviewField
                label="Date"
                value={item.date ? formatUkDate(item.date) : "N/A"}
              />
              <SymptomReviewField label="Time of Day" value={item.timeOfDay || "N/A"} />
            </SymptomReviewGrid>
          </View>
        ))}
      </SymptomReviewCard>
    );
  };

  if (loading) {
    return (
      <View style={[styles.screen, styles.centered, { backgroundColor: c.screen, paddingBottom: bottomScrollInset }]}>
        <ActivityIndicator color={c.primary} />
        <Text style={[styles.muted, { color: c.textMuted, marginTop: 12 }]}>Loading…</Text>
      </View>
    );
  }

  if (!row) {
    return (
      <ScrollView style={[styles.screen, { backgroundColor: c.screen }]} contentContainerStyle={{ paddingBottom: bottomScrollInset + 24 }}>
        <Text style={[styles.muted, { color: c.textMuted }]}>Could not load this entry.</Text>
      </ScrollView>
    );
  }

  return (
    <>
      <ScrollView style={[styles.screen, { backgroundColor: c.screen }]} contentContainerStyle={{ paddingBottom: bottomScrollInset + 24 }}>
        {createdSubtitle ? (
          <Text style={[styles.symptomDetailLoggedAt, { color: c.textMuted }]}>{createdSubtitle}</Text>
        ) : null}

        <SymptomReviewCard title="Overview">
          <SymptomReviewGrid>
            <SymptomReviewField label="Missed medications" value={String(missedItems.length)} />
            <SymptomReviewField label="NSAIDs" value={String(nsaidItems.length)} />
            <SymptomReviewField label="Antibiotics" value={String(antibioticItems.length)} />
          </SymptomReviewGrid>
        </SymptomReviewCard>

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

function MedicationsScreen({ user }: { user: SessionUser }) {
  const c = useFlareColors();
  const bottomScrollInset = useBottomTabScrollInset();
  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [timeOfDay, setTimeOfDay] = useState("07:00");
  const [meds, setMeds] = useState<Medication[]>([]);

  const load = async () => {
    const { data } = await supabase.from(TABLES.MEDICATIONS).select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setMeds((data ?? []) as Medication[]);
  };
  useEffect(() => { load(); }, [user.id]);

  const addMedication = async () => {
    if (!name.trim()) {
      Alert.alert("Medication name required", "Enter a medication name first.");
      return;
    }
    const payload = { user_id: user.id, name, dosage: dosage ? `${dosage}mg` : "", time_of_day: timeOfDay, reminders_enabled: true };
    const { error } = await supabase.from(TABLES.MEDICATIONS).insert([payload]);
    if (error) return Alert.alert("Could not save medication", error.message);
    setName("");
    setDosage("");
    await load();
    try {
      if (Notifications) {
        const permission = await Notifications.getPermissionsAsync();
        if (permission.status === "granted") {
          const { scheduledCount } = await rescheduleMedicationNotificationsForUser(user.id);
          Alert.alert("Medication saved", `Reminders updated. Scheduled reminders: ${scheduledCount}`);
          return;
        }
      }
    } catch (e: any) {
      Alert.alert("Medication saved", `Could not auto-update reminders: ${e?.message || "Unknown error"}`);
      return;
    }
    Alert.alert("Medication saved", "Enable notifications in Settings to schedule alerts.");
  };

  const logTaken = async (med: Medication) => {
    const { error } = await supabase.from(TABLES.LOG_MEDICATIONS).insert([{
      id: `medication-tracking-${Date.now()}`,
      user_id: user.id,
      name: med.name,
      missed_medications_list: [],
      nsaid_list: [],
      antibiotic_list: [],
      created_at: new Date().toISOString(),
    }]);
    if (error) return Alert.alert("Could not mark taken", error.message);
    Alert.alert("Saved", `${med.name} marked in medication tracking.`);
  };

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: c.screen }]}
      contentContainerStyle={{ paddingBottom: bottomScrollInset }}
    >
      <Card title="Add Medication">
        <LabeledInput label="Medication name" value={name} onChangeText={setName} placeholder="Medication name" />
        <LabeledInput label="Dosage (mg)" value={dosage} onChangeText={setDosage} placeholder="Dosage (mg)" keyboardType="number-pad" />
        <LabeledInput label="Reminder time (24h)" value={timeOfDay} onChangeText={setTimeOfDay} placeholder="HH:mm" />
        <PrimaryButton title="Save medication" onPress={addMedication} />
      </Card>
      <Card title="Current Medications">
        {meds.map((m) => (
          <View key={m.id} style={styles.row}>
            <Text style={[styles.text, { color: c.textMuted }]}>
              {m.name} {m.dosage ?? ""}
            </Text>
            <SecondaryButton title="Mark taken" onPress={() => logTaken(m)} />
          </View>
        ))}
      </Card>
    </ScrollView>
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
  const bottomScrollInset = useBottomTabScrollInset();
  const [glasses, setGlasses] = useState(() => dashboardSnapshotByUserId[user.id]?.todaySummary.hydration ?? 0);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const today = new Date().toISOString().split("T")[0];

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

  useEffect(() => {
    load();
  }, [load]);

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
        contentContainerStyle={{ paddingBottom: bottomScrollInset + 24 }}
      >
        <Card title="" compactBody>
          <View style={styles.hydrationCardHeader}>
            <View style={styles.weatherIconWrap}>
              <MaterialCommunityIcons name="cup-water" size={28} color={c.primary} accessibilityIgnoresInvertColors />
            </View>
            <Text
              style={[styles.cardTitle, styles.hydrationCardHeaderTitle, { color: c.text }]}
              {...(Platform.OS === "android" ? ({ includeFontPadding: false } as const) : null)}
            >
              Daily intake
            </Text>
          </View>
          <View style={styles.hydrationCountRow}>
            <View style={styles.hydrationCountBlock}>
              <View style={styles.hydrationCountLine}>
                <Text style={[styles.hydrationCountValue, { color: c.text }]}>{glasses}</Text>
                <Text style={[styles.hydrationCountSuffix, { color: c.textSecondary }]}>
                  / {HYDRATION_TARGET} glasses
                </Text>
              </View>
              {glasses > 0 ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Reset today's hydration count"
                  onPress={() => setResetConfirmOpen(true)}
                  hitSlop={8}
                  style={({ pressed }) => [styles.hydrationResetLink, pressed && { opacity: 0.7 }]}
                >
                  <Text style={[styles.hydrationResetText, { color: c.textSecondary }]}>Reset</Text>
                </Pressable>
              ) : (
                <View style={styles.hydrationResetPlaceholder} />
              )}
            </View>
            <View style={styles.hydrationStepperRow}>
              <HydrationStepperButton
                icon="minus"
                variant="secondary"
                disabled={glasses === 0}
                onPress={() => persistGlasses(glasses - 1)}
              />
              <HydrationStepperButton
                icon="plus"
                variant="primary"
                disabled={glasses >= HYDRATION_TARGET}
                onPress={() => persistGlasses(glasses + 1)}
              />
            </View>
          </View>

          <View style={styles.hydrationProgressRow}>
            {Array.from({ length: HYDRATION_TARGET }, (_, index) => {
              const filled = index < glasses;
              return (
                <View
                  key={index}
                  style={[
                    styles.hydrationProgressDot,
                    filled
                      ? { backgroundColor: c.primary, borderColor: c.primary }
                      : { backgroundColor: c.surfaceSubtle, borderColor: c.cardBorder },
                  ]}
                />
              );
            })}
          </View>

          {glasses >= HYDRATION_TARGET ? (
            <Text style={[styles.hydrationGoalReached, { color: c.primary }]}>Daily goal reached</Text>
          ) : null}
        </Card>

        <Card title="" style={styles.hydrationInfoCard} compactBody>
          <Text style={[styles.text, styles.hydrationInfoBody, { color: c.textMuted }]}>
            Track your daily water intake to hit your goal each day. Your target is {HYDRATION_TARGET} glasses per day
            (roughly 250ml each).
          </Text>
          <View style={[styles.hydrationTipBox, { backgroundColor: c.surfaceSubtle }]}>
            <View style={styles.hydrationTipHeader}>
              <Ionicons name="bulb-outline" size={18} color={c.primary} accessibilityIgnoresInvertColors />
              <Text style={[styles.hydrationTipTitle, { color: c.text }]}>Important</Text>
            </View>
            <Text style={[styles.hydrationTipBody, { color: c.textMuted }]}>
              Most guidelines recommend around 1.5–2 litres (about 6–8 glasses) of water per day for adults.
            </Text>
          </View>
        </Card>
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

function WeightScreen({ user }: { user: SessionUser }) {
  const c = useFlareColors();
  const bottomScrollInset = useBottomTabScrollInset();
  const [valueKg, setValueKg] = useState("");
  const [notes, setNotes] = useState("");
  const [rows, setRows] = useState<any[]>([]);

  const load = async () => {
    const { data } = await supabase.from(TABLES.TRACK_WEIGHT).select("*").eq("user_id", user.id).order("date", { ascending: false }).limit(30);
    setRows(data ?? []);
  };
  useEffect(() => { load(); }, [user.id]);

  const add = async () => {
    const payload = { user_id: user.id, date: new Date().toISOString().split("T")[0], value_kg: Number(valueKg), notes: notes || null };
    const { error } = await supabase.from(TABLES.TRACK_WEIGHT).insert([payload]);
    if (error) return Alert.alert("Could not save weight", error.message);
    setValueKg("");
    setNotes("");
    await load();
  };

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: c.screen }]}
      contentContainerStyle={{ paddingBottom: bottomScrollInset }}
    >
      <Card title="Log Weight">
        <LabeledInput label="Weight (kg)" value={valueKg} onChangeText={setValueKg} placeholder="Weight (kg)" keyboardType="decimal-pad" />
        <LabeledInput label="Notes" value={notes} onChangeText={setNotes} placeholder="Notes" />
        <PrimaryButton title="Save weight" onPress={add} />
      </Card>
      <Card title="Recent Weight">
        {rows.map((r) => (
          <Text key={r.id} style={[styles.text, { color: c.textMuted }]}>
            {formatUkDate(r.date)} - {r.value_kg}kg
          </Text>
        ))}
      </Card>
    </ScrollView>
  );
}

function BowelScreen({ user }: { user: SessionUser }) {
  const c = useFlareColors();
  const bottomScrollInset = useBottomTabScrollInset();
  const [bristol, setBristol] = useState("4");
  const [notes, setNotes] = useState("");
  const [rows, setRows] = useState<any[]>([]);

  const load = async () => {
    const { data } = await supabase.from(TABLES.BOWEL_MOVEMENTS).select("*").eq("user_id", user.id).order("occurred_at", { ascending: false }).limit(30);
    setRows(data ?? []);
  };
  useEffect(() => { load(); }, [user.id]);

  const add = async () => {
    const payload = { user_id: user.id, occurred_at: new Date().toISOString(), bristol_type: Number(bristol), blood: null, strain: null, urgency: null, notes: notes || null, updated_at: new Date().toISOString() };
    const { error } = await supabase.from(TABLES.BOWEL_MOVEMENTS).insert([payload]);
    if (error) return Alert.alert("Could not save bowel movement", error.message);
    setNotes("");
    await load();
  };

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: c.screen }]}
      contentContainerStyle={{ paddingBottom: bottomScrollInset }}
    >
      <Card title="Log Bowel Movement">
        <LabeledInput label="Bristol type (1-7)" value={bristol} onChangeText={setBristol} placeholder="Bristol type (1-7)" keyboardType="number-pad" />
        <LabeledInput label="Notes" value={notes} onChangeText={setNotes} placeholder="Notes" />
        <PrimaryButton title="Save bowel log" onPress={add} />
      </Card>
      <Card title="Recent Entries">
        {rows.map((row) => (
          <Text key={row.id} style={[styles.text, { color: c.textMuted }]}>
            {formatUkDate(row.occurred_at)} - type {row.bristol_type}
          </Text>
        ))}
      </Card>
    </ScrollView>
  );
}

function AppointmentsScreen({ user }: { user: SessionUser }) {
  const c = useFlareColors();
  const bottomScrollInset = useBottomTabScrollInset();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState("09:00");
  const [reminderMinutesBefore, setReminderMinutesBefore] = useState("60");
  const [type, setType] = useState("");
  const [notes, setNotes] = useState("");
  const [rows, setRows] = useState<Appointment[]>([]);

  const load = async () => {
    const { data } = await supabase.from(TABLES.APPOINTMENTS).select("*").eq("user_id", user.id).order("date", { ascending: false });
    setRows((data ?? []) as Appointment[]);
  };
  useEffect(() => { load(); }, [user.id]);

  const add = async () => {
    const lead = Number(reminderMinutesBefore);
    const payload = {
      user_id: user.id,
      date,
      time,
      type: type || null,
      notes: notes || null,
      reminder_minutes_before: Number.isFinite(lead) && lead >= 0 ? lead : 60,
    };
    const { error } = await supabase.from(TABLES.APPOINTMENTS).insert([payload]);
    if (error) return Alert.alert("Could not save appointment", error.message);
    setReminderMinutesBefore("60");
    setType("");
    setNotes("");
    await load();
    try {
      if (Notifications) {
        const permission = await Notifications.getPermissionsAsync();
        if (permission.status === "granted") {
          const { scheduledCount } = await rescheduleAppointmentNotificationsForUser(user.id);
          Alert.alert("Appointment saved", `Appointment reminders updated: ${scheduledCount}`);
          return;
        }
      }
    } catch (e: any) {
      Alert.alert("Appointment saved", `Could not auto-update reminders: ${e?.message || "Unknown error"}`);
      return;
    }
    Alert.alert("Appointment saved", "Enable notifications in Settings to schedule alerts.");
  };

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: c.screen }]}
      contentContainerStyle={{ paddingBottom: bottomScrollInset }}
    >
      <Card title="Add Appointment">
        <LabeledInput label="Appointment date" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" />
        <LabeledInput label="Appointment time (24h)" value={time} onChangeText={setTime} placeholder="HH:mm" />
        <LabeledInput
          label="Reminder minutes before"
          value={reminderMinutesBefore}
          onChangeText={setReminderMinutesBefore}
          placeholder="60"
          keyboardType="number-pad"
        />
        <LabeledInput label="Appointment type" value={type} onChangeText={setType} placeholder="Type" />
        <LabeledInput label="Notes" value={notes} onChangeText={setNotes} placeholder="Notes" />
        <PrimaryButton title="Save appointment" onPress={add} />
      </Card>
      <Card title="Upcoming & Past">
        {rows.map((row) => (
          <Text key={row.id} style={[styles.text, { color: c.textMuted }]}>
            {formatUkDate(row.date)} {row.time ?? ""} - {row.type ?? "Appointment"}
          </Text>
        ))}
      </Card>
    </ScrollView>
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

function NotificationsScreen({ user }: { user: SessionUser }) {
  const c = useFlareColors();
  const bottomScrollInset = useBottomTabScrollInset();
  const [token, setToken] = useState<string>("");
  const [scheduled, setScheduled] = useState(0);
  const [lastError, setLastError] = useState("");

  const register = async () => {
    setLastError("");
    if (!Notifications || !Device) {
      Alert.alert("Not supported in Expo Go", "Use a development build to test push notifications.");
      return;
    }
    if (!Device.isDevice) {
      Alert.alert("Device required", "Use a physical device for push notifications.");
      return;
    }
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== "granted") {
      Alert.alert("Permission denied", "Notification permission is required.");
      return;
    }
    try {
      const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
      const tokenResult = projectId
        ? await Notifications.getExpoPushTokenAsync({ projectId })
        : await Notifications.getExpoPushTokenAsync();
      const pushToken = tokenResult.data;
      setToken(pushToken);
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      const base = process.env.EXPO_PUBLIC_WEB_API_BASE_URL;
      if (accessToken && base) {
        await fetch(`${base}/api/push/subscribe`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            expo_push_token: pushToken,
            user_agent: `expo-${Platform.OS}`,
          }),
        });
      }

      const meds = await rescheduleMedicationNotificationsForUser(user.id);
      const appts = await rescheduleAppointmentNotificationsForUser(user.id);
      setScheduled(meds.scheduledCount + appts.scheduledCount);
      await AsyncStorage.setItem("flarecare.pushToken", pushToken);
    } catch (error: any) {
      const message =
        error?.message ||
        error?.toString?.() ||
        (typeof error === "string" ? error : "Unknown error");
      console.error("PUSH_SETUP_ERROR", error);
      console.error("PUSH_SETUP_ERROR_MESSAGE", message);
      setLastError(message);
      Alert.alert("Notification setup failed", message);
    }
  };

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: c.screen }]}
      contentContainerStyle={{ flexGrow: 1, paddingBottom: bottomScrollInset }}
    >
      <Card title="Push Reminders">
        <Text style={[styles.text, { color: c.textMuted }]}>Register push permissions and schedule medication reminders.</Text>
        <PrimaryButton title="Enable notifications" onPress={register} />
        <Text style={[styles.text, { color: c.textMuted }]}>Token: {token ? `${token.slice(0, 24)}...` : "not registered"}</Text>
        <Text style={[styles.text, { color: c.textMuted }]}>Scheduled reminders: {scheduled}</Text>
        {lastError ? <Text style={flareFieldErrorStyle(c, "wizard")}>Error: {lastError}</Text> : null}
        {Platform.OS === "ios" ? <Text style={[styles.muted, { color: c.textMuted }]}>iOS requires real device + APNs entitlements.</Text> : null}
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
    <ScrollView
      style={[styles.screen, { backgroundColor: c.screen }]}
      contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) + 48 + bottomScrollInset }}
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
    </ScrollView>
  );
}

function AboutScreen() {
  const c = useFlareColors();
  const bottomScrollInset = useBottomTabScrollInset();
  const version = Constants.expoConfig?.version ?? Constants.nativeApplicationVersion ?? "—";
  const nativeBuild = Constants.nativeBuildVersion;

  const aboutSupportEmail = () => {
    Linking.openURL("mailto:support@flarecare.app").catch(() => {});
  };

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: c.screen }]}
      contentContainerStyle={{ paddingBottom: 28 + bottomScrollInset }}
    >
      <View style={styles.aboutHero}>
        <Text style={[styles.aboutTagline, { color: c.textMuted }]}>
          Day-to-day support for Crohn&apos;s disease and ulcerative colitis (IBD)
        </Text>
      </View>

      <Text style={[styles.dashboardSectionTitleLeft, { color: c.text }]}>What is FlareCare?</Text>
      <Text style={[styles.text, styles.aboutBody, { color: c.textMuted }]}>
        FlareCare is a mobile companion for IBD self-management. You can record symptoms, medications, hydration, bowel
        movements, weight, and appointments; receive medication reminders; review summaries on your dashboard; prepare
        appointment briefs; and export reports to share with your clinician—all in one place on your phone.
      </Text>
      <Text style={[styles.text, styles.aboutBody, { color: c.textMuted }]}>
        It is aimed at people living with Crohn&apos;s disease or ulcerative colitis. The product was developed by Simon
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
    </ScrollView>
  );
}

const ACCOUNT_OPTION_ROUTES = [
  { label: "Information", route: "AccountInfo" as const },
  { label: "Security", route: "AccountSecurity" as const },
  { label: "Legal", route: "AccountLegal" as const },
  { label: "Help", route: "AccountHelp" as const },
];

function AccountOptionRow({
  label,
  onPress,
  labelColor = "text",
  labelMedium,
  labelSize = 15,
  chevronSize = 18,
  rowStyle,
}: {
  label: string;
  onPress: () => void;
  labelColor?: "text" | "textMuted" | "textSecondary" | "primary";
  labelMedium?: boolean;
  labelSize?: number;
  chevronSize?: number;
  rowStyle?: StyleProp<ViewStyle>;
}) {
  const c = useFlareColors();
  const labelTint =
    labelColor === "primary"
      ? c.primary
      : labelColor === "textMuted"
        ? c.textMuted
        : labelColor === "textSecondary"
          ? c.textSecondary
          : c.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={10}
      style={[styles.accountOptionNavRow, rowStyle]}
    >
      <Text
        style={[
          styles.accountSettingsNavLabel,
          labelMedium ? styles.accountSettingsNavLabelMedium : null,
          { color: labelTint, fontSize: labelSize },
        ]}
      >
        {label}
      </Text>
      <Ionicons name="chevron-forward" size={chevronSize} color={c.textMuted} />
    </Pressable>
  );
}

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
          <Ionicons name="chevron-forward" size={18} color={c.textMuted} accessibilityIgnoresInvertColors />
        </Pressable>
      </Card>
      <Card title="" style={styles.accountPaddedCard} compactBody>
        <View style={styles.accountInfoFields}>
          <View>
            <Text style={[styles.accountInfoFieldLabel, { color: c.textMuted }]}>Account created</Text>
            <Text style={[styles.accountInfoFieldValue, { color: c.text }]}>
              {user.accountCreatedAt ? formatUkDate(user.accountCreatedAt) : "Not available"}
            </Text>
          </View>
          <View>
            <Text style={[styles.accountInfoFieldLabel, { color: c.textMuted }]}>Sign-in method</Text>
            <Text style={[styles.accountInfoFieldValue, { color: c.text }]}>
              {user.signInMethodLabel ?? "Not available"}
            </Text>
          </View>
          <View>
            <Text style={[styles.accountInfoFieldLabel, { color: c.textMuted }]}>Account ID</Text>
            <Text style={[styles.accountInfoFieldValue, { color: c.text }]} selectable>
              {user.id}
            </Text>
          </View>
        </View>
      </Card>
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
      contentContainerStyle={{ paddingBottom: bottomScrollInset + 24 }}
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
      <Card title="" style={styles.accountPaddedCard} compactBody>
        <View style={styles.accountInfoFields}>
          <View>
            <Text style={[styles.accountInfoFieldLabel, { color: c.textMuted }]}>Full name</Text>
            <Text style={[styles.accountInfoFieldValue, { color: c.text }]}>{displayName}</Text>
          </View>
          <View>
            <Text style={[styles.accountInfoFieldLabel, { color: c.textMuted }]}>Email</Text>
            <Text style={[styles.accountInfoFieldValue, { color: c.text }]}>{user.email || "Not available"}</Text>
          </View>
        </View>
      </Card>
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
      <Card title="" style={styles.accountOptionsListCard} compactBody>
        <AccountOptionRow
          label="Privacy Policy"
          labelColor="text"
          labelSize={15}
          onPress={() => navigation.navigate("LegalDocument", { document: "privacy" })}
        />
        <AccountOptionRow
          label="Terms of Use"
          labelColor="text"
          labelSize={15}
          onPress={() => navigation.navigate("LegalDocument", { document: "terms" })}
        />
      </Card>
    </ScrollView>
  );
}

function LegalDocumentScreen() {
  const route = useRoute<any>();
  const c = useFlareColors();
  const insets = useSafeAreaInsets();
  const bottomScrollInset = useBottomTabScrollInset();
  const kind: LegalDocumentKind = route.params?.document === "terms" ? "terms" : "privacy";

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: c.screen }]}
      contentContainerStyle={{
        paddingHorizontal: SCREEN_EDGE_PADDING,
        paddingBottom: Math.max(insets.bottom, 16) + bottomScrollInset + 24,
      }}
    >
      <LegalDocumentView kind={kind} />
    </ScrollView>
  );
}

function AccountHelpScreen() {
  const navigation = useNavigation<any>();
  const c = useFlareColors();
  const bottomScrollInset = useBottomTabScrollInset();

  const openSupportEmail = () => {
    Linking.openURL("mailto:support@flarecare.app").catch(() => {});
  };

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: c.screen }]}
      contentContainerStyle={{ paddingBottom: bottomScrollInset + 24 }}
    >
      <Card title="" style={styles.accountOptionsListCard} compactBody>
        <AccountOptionRow label="About FlareCare" labelColor="text" labelSize={15} onPress={() => navigation.navigate("About")} />
        <AccountOptionRow label="Contact support" labelColor="text" labelSize={15} onPress={openSupportEmail} />
      </Card>
    </ScrollView>
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
      <Text style={[styles.dashboardSectionTitleLeft, { color: c.text }]}>Notifications</Text>
      <Card title="" style={styles.accountOptionsListCard} compactBody>
        <AccountOptionRow
          label="Push notifications and reminders"
          labelColor="textSecondary"
          onPress={() => navigation.navigate("Reminders")}
        />
      </Card>
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
      <Text style={[styles.accountMenuSectionTitle, { color: c.textMuted }]}>My account</Text>
      <Card title="" style={styles.accountOptionsListCard} compactBody>
        {ACCOUNT_OPTION_ROUTES.map((item) => (
          <AccountOptionRow
            key={item.route}
            label={item.label}
            labelColor="text"
            labelSize={15}
            onPress={() => navigation.navigate(item.route)}
          />
        ))}
      </Card>
      <Text style={[styles.accountMenuSectionTitle, { color: c.textMuted }]}>Delete account</Text>
      <Card title="" style={styles.accountPaddedCard} compactBody>
        <Text style={[styles.muted, { color: c.textMuted, lineHeight: 20 }]}>
          Permanently delete your account and all associated data. This cannot be undone.
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Delete account"
          onPress={() => setDeleteAccountConfirmOpen(true)}
          style={({ pressed }) => [
            styles.accountDeleteInCard,
            { backgroundColor: c.surfaceSubtle },
            pressed && { opacity: 0.7 },
          ]}
        >
          <Text style={[styles.accountSignOutFooterText, { color: c.destructiveFill }]}>Delete account</Text>
        </Pressable>
      </Card>
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

  if (!BOTTOM_BAR_VISIBLE_ROUTES.has(routeName)) {
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
      {item("Account", ({ active }) => <Ionicons name={active ? "person-circle" : "person-circle-outline"} size={23} color={active ? colors.primary : colors.textMuted} />, "Account")}
    </View>
  );
}

function AppTabs({
  user,
  onLogout,
  prepareSignOut,
  finishSignOut,
  restoreAfterAbortedSignOut,
}: {
  user: SessionUser;
  onLogout: (reason?: SignOutReason) => void | Promise<void>;
  prepareSignOut: (reason: SignOutReason) => void;
  finishSignOut: () => Promise<void>;
  restoreAfterAbortedSignOut: () => Promise<void>;
}) {
  const { nav, colors } = useFlareTheme();
  const navigationRef = useNavigationContainerRef<Record<string, object | undefined>>();
  const [focusRouteName, setFocusRouteName] = useState("Dashboard");
  const [dashboardHomePillActive, setDashboardHomePillActive] = useState(false);
  const resetDashboardHomeRef = useRef<(() => void) | null>(null);
  const resetDashboardHome = useCallback(() => {
    resetDashboardHomeRef.current?.();
  }, []);

  const syncFocusRoute = useCallback(() => {
    const name = navigationRef.getCurrentRoute()?.name;
    if (name) setFocusRouteName(name);
  }, [navigationRef]);

  const headerOptions = ({ navigation, route }: { navigation: any; route: { name: string; params?: { document?: string } } }) => {
    const isDashboard = route.name === "Dashboard";
    const isAbout = route.name === "About";
    const isIbd = route.name === "Ibd";
    const isAccount = route.name === "Account";
    const isReminders = route.name === "Reminders";
    const titleForRoute: Record<string, string> = {
      SymptomHistory: "Symptom History",
      SymptomDetail: "Symptom Details",
      MedicationTrackingHistory: "Tracking History",
      MedicationLogDetail: "Tracking log",
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
    };
    const legalDocumentTitle =
      route.name === "LegalDocument"
        ? route.params?.document === "terms"
          ? "Terms of Use"
          : "Privacy Policy"
        : null;
    const isSymptomLogWizard = route.name === "SymptomLogWizard";
    const isMedicationTrackingWizard = route.name === "MedicationTrackingWizard";

    const headerHidesOverflowMenu =
      route.name === "Settings" ||
      route.name === "SymptomLogWizard" ||
      route.name === "MedicationTrackingWizard" ||
      route.name === "Meds" ||
      route.name === "Reports" ||
      route.name === "Weight" ||
      route.name === "Appointments" ||
      route.name === "Hydration" ||
      route.name === "Bowel" ||
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
          ? "About"
          : isIbd
            ? "What is IBD?"
            : isAccount
              ? "Account"
              : isReminders
                ? "Reminders"
                : isSymptomLogWizard || isMedicationTrackingWizard
                  ? ""
                  : legalDocumentTitle ?? titleForRoute[route.name] ?? "",
      headerTitleAlign: "center" as const,
      headerLargeTitleShown: false,
      headerLargeTitleShadowVisible: false,
      headerStyle: { backgroundColor: colors.screen },
      headerTitleStyle: {
        fontFamily: "Inter_700Bold",
        fontSize: 16,
        color: colors.text,
      },
      headerTintColor: colors.primary,
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
                <Ionicons name="chevron-back" size={24} color={colors.primary} />
              </Pressable>
            )
          : undefined,
      headerRight: headerRightContent ? () => headerRightContent : undefined,
    } as const;
  };

  return (
    <NavigationContainer ref={navigationRef} theme={nav} onReady={syncFocusRoute} onStateChange={syncFocusRoute}>
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
            <AppStack.Screen name="Bowel">{() => <BowelScreen user={user} />}</AppStack.Screen>
            <AppStack.Screen name="Appointments">{() => <AppointmentsScreen user={user} />}</AppStack.Screen>
            <AppStack.Screen name="Reports">{() => <ReportsScreen user={user} />}</AppStack.Screen>
            <AppStack.Screen name="Meds">{() => <MedicationsScreen user={user} />}</AppStack.Screen>
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
        <MainBottomTabBar
          routeName={focusRouteName}
          navigationRef={navigationRef}
          suppressDashboardActive={focusRouteName === "Dashboard" && dashboardHomePillActive}
          onResetDashboardHome={resetDashboardHome}
        />
      </View>
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

function AppRoot() {
  const { appearanceHydrated } = useFlareTheme();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [signOutNotice, setSignOutNotice] = useState<SignOutReason | null>(null);
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

  const content = useMemo(() => {
    if (!fontsLoaded || loading || showSplash || !appearanceHydrated) {
      return <SplashScreen />;
    }
    if (signOutNotice) {
      return <SignedOutScreen reason={signOutNotice} onContinue={() => setSignOutNotice(null)} />;
    }
    if (user && profileNeedsSetup(user)) {
      return <ProfileSetupScreen user={user} onComplete={(next) => setUser(next)} />;
    }
    if (user) {
      return (
        <AppTabs
          user={user}
          onLogout={completeSignOut}
          prepareSignOut={prepareSignOut}
          finishSignOut={finishSignOut}
          restoreAfterAbortedSignOut={restoreAfterAbortedSignOut}
        />
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
    signOutNotice,
    authBusy,
    completeSignOut,
    prepareSignOut,
    finishSignOut,
    restoreAfterAbortedSignOut,
  ]);

  const profileSetupActive = Boolean(user && profileNeedsSetup(user));
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
  authCardPlain: { flex: 1 },
  authMethodPanel: { flex: 1, justifyContent: "center" },
  authMethodActions: { marginTop: 18, gap: 8 },
  authLegalRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginTop: 14, marginBottom: 4 },
  authLegalCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  authLegalText: { flex: 1, fontSize: 12, lineHeight: 17, fontFamily: "Inter_400Regular" },
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
  authSecureNoteText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  authPromptTitle: { textAlign: "center", fontSize: 19, fontFamily: "Inter_500Medium" },
  authPromptSub: { textAlign: "center", fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 4 },
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
  signedOutScreen: { flex: 1, justifyContent: "center", alignItems: "center" },
  signedOutCard: { width: "100%", maxWidth: 360, alignItems: "center", gap: 12 },
  signedOutTitle: { fontSize: 22, fontFamily: "Inter_700Bold", textAlign: "center", marginTop: 8 },
  signedOutMessage: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 320,
  },
  signedOutActions: { width: "100%", marginTop: 28 },
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
  homePillOptionRow: { paddingVertical: 8 },
  todaySummaryRows: { gap: 8 },
  homeNavPillsSection: { marginTop: 10 },
  homePillBodySection: { marginTop: 16 },
  dashboardSectionTitleAfterPills: { marginTop: 0 },
  homeNavPillsRow: { flexDirection: "row", gap: 8, paddingVertical: 2 },
  homeNavPill: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  homeNavPillLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  dashboardSectionTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    marginBottom: 12,
    marginTop: 10,
    textAlign: "center",
  },
  dashboardSectionTitleLeft: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    marginBottom: 12,
    marginTop: 10,
    textAlign: "left",
  },
  text: { fontSize: 14, fontFamily: "Inter_400Regular" },
  muted: { fontSize: 13, fontFamily: "Inter_400Regular" },
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
  accountMenuSectionTitle: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    marginBottom: 12,
    marginTop: 10,
    textAlign: "left",
  },
  /** My account / Help link lists. */
  accountOptionsListCard: { paddingHorizontal: 20, paddingVertical: 12 },
  accountOptionNavRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
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
  accountEmailLine: { fontSize: 14, fontFamily: "Inter_400Regular", marginTop: 2 },
  accountMemberSince: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 6 },
  accountNavRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  accountSettingsNavLabel: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular", paddingRight: 10 },
  accountSettingsNavLabelMedium: { fontFamily: "Inter_500Medium" },
  accountInfoFields: { gap: 14 },
  accountInfoFieldLabel: { fontSize: 14, fontFamily: "Inter_400Regular", marginBottom: 4 },
  accountInfoFieldValue: { fontSize: 14, fontFamily: "Inter_400Regular" },
  accountScrollContent: { flexGrow: 1 },
  /** My account list on Account tab — no extra card gap before logout. */
  accountOptionsListCardLast: { marginBottom: 0 },
  accountSignOutFooter: { alignSelf: "stretch", alignItems: "center", marginTop: 20, paddingVertical: 16 },
  accountDeleteInCard: {
    alignSelf: "stretch",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
    paddingVertical: 12,
    borderRadius: 10,
  },
  accountSignOutFooterText: { fontSize: 16, fontFamily: "Inter_700Bold", textAlign: "center" },
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
  aboutHero: { alignItems: "center", paddingHorizontal: 16 },
  aboutLogoSlot: { marginBottom: 12 },
  /** Light About: circular primary well behind mark. */
  aboutLogoMarkWell: { padding: 6, borderRadius: 9999, overflow: "hidden", alignSelf: "center" },
  aboutLogo: { width: 80, height: 80 },
  aboutAppName: { fontFamily: "Inter_700Bold", fontSize: 18, marginBottom: 6, textAlign: "center" },
  aboutTagline: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 12,
    paddingBottom: 20,
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
  hydrationCardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  hydrationCardHeaderTitle: { flex: 1, marginBottom: 0, alignSelf: "center", lineHeight: 42 },
  hydrationCountRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 16,
  },
  hydrationCountBlock: { flex: 1, minWidth: 0 },
  hydrationCountLine: { flexDirection: "row", alignItems: "baseline", flexWrap: "wrap" },
  hydrationCountValue: { fontSize: 36, fontFamily: "Inter_800ExtraBold" },
  hydrationCountSuffix: { fontSize: 18, fontFamily: "Inter_400Regular", marginLeft: 4 },
  hydrationResetLink: { alignSelf: "flex-start", marginTop: 8 },
  hydrationResetText: { fontSize: 14, fontFamily: "Inter_400Regular", textDecorationLine: "underline" },
  hydrationResetPlaceholder: { height: 22, marginTop: 8 },
  hydrationStepperRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  hydrationStepperBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  hydrationProgressRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
    marginTop: 20,
  },
  hydrationProgressDot: {
    flex: 1,
    height: 8,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  hydrationGoalReached: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    marginTop: 12,
    textAlign: "center",
  },
  hydrationInfoCard: { marginTop: 4 },
  hydrationInfoBody: { lineHeight: 21, marginBottom: 14 },
  hydrationTipBox: { borderRadius: 10, padding: 14 },
  hydrationTipHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  hydrationTipTitle: { fontSize: 14, fontFamily: "Inter_700Bold" },
  hydrationTipBody: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },
  /** Keeps stacked detail rows out of `cardBody` gap (which would add space between every field). */
  detailFieldsStack: { alignSelf: "stretch" },
});
