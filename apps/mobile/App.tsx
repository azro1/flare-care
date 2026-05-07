import "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import * as WebBrowser from "expo-web-browser";
import Constants from "expo-constants";
import { makeRedirectUri } from "expo-auth-session";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import React, { useCallback, useEffect, useMemo, useState } from "react";
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
  Platform,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  useWindowDimensions,
  View,
  ViewStyle,
} from "react-native";
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { FlareThemeProvider, useFlareColors, useFlareTheme } from "./theme";

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

const cleanEnv = (value?: string) => (value || "").trim().replace(/^['"]|['"]$/g, "");
const supabaseUrl = cleanEnv(process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL);
const supabaseAnonKey = cleanEnv(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY");
}

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});

const TABLES = {
  LOG_SYMPTOMS: "log_symptoms",
  MEDICATIONS: "medications",
  LOG_MEDICATIONS: "log_medications",
  TRACK_WEIGHT: "track_weight",
  DAILY_HYDRATION: "daily_hydration",
  BOWEL_MOVEMENTS: "bowel_movements",
  APPOINTMENTS: "appointments",
  MEDICATION_TAKEN: "medication_taken",
} as const;

type SessionUser = { id: string; email?: string | null; displayName?: string | null };
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
}: {
  title: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** No filled panel — sits on screen background (e.g. login). */
  plain?: boolean;
}) {
  const c = useFlareColors();
  return (
    <View style={[styles.card, style, plain ? { backgroundColor: "transparent", marginBottom: 0 } : { backgroundColor: c.card }]}>
      {title ? <Text style={[styles.cardTitle, { color: c.text }]}>{title}</Text> : null}
      {children}
    </View>
  );
}

function SplashScreen() {
  const c = useFlareColors();
  return (
    <SafeAreaView style={[styles.splashScreen, { backgroundColor: c.screen }]}>
      <View style={styles.splashCenter}>
        <Text style={[styles.splashBrand, { color: c.text }]}>FlareCare</Text>
        <Text style={[styles.splashTagline, { color: c.textMuted }]}>Track. Learn. Feel better.</Text>
      </View>
      <ActivityIndicator color={c.primary} />
    </SafeAreaView>
  );
}

function LabeledInput({ label, error, style, ...props }: { label: string; error?: string } & TextInputProps) {
  const c = useFlareColors();
  return (
    <View style={styles.fieldBlock}>
      <Text style={[styles.label, { color: c.textSecondary }]}>{label}</Text>
      <TextInput
        style={[styles.input, { backgroundColor: c.inputBg, borderColor: c.inputBorder, color: c.text }, style]}
        placeholderTextColor={c.textMuted}
        {...props}
      />
      {error ? <Text style={[styles.fieldError, { color: c.danger }]}>{error}</Text> : null}
    </View>
  );
}

function PrimaryButton({
  title,
  onPress,
  disabled,
  fitContent,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  /** Width follows label + padding instead of stretching full row. */
  fitContent?: boolean;
}) {
  const c = useFlareColors();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.button,
        fitContent ? { alignSelf: "flex-start" } : null,
        { backgroundColor: disabled ? c.primaryDisabledBg : c.primary },
      ]}
    >
      <Text style={[styles.buttonText, { color: c.white }]}>{title}</Text>
    </Pressable>
  );
}

function SecondaryButton({
  title,
  onPress,
  disabled,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const c = useFlareColors();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.buttonSecondary,
        { backgroundColor: c.secondaryBtnBg, borderWidth: 1, borderColor: c.secondaryBtnBorder },
        disabled ? { opacity: 0.55 } : null,
      ]}
    >
      <Text style={[styles.buttonSecondaryText, { color: c.secondaryBtnText }]}>{title}</Text>
    </Pressable>
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
  const [activeAuthAction, setActiveAuthAction] = useState<"email" | "code" | "google" | null>(null);
  const [step, setStep] = useState<"email" | "code">("email");
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

  const sendMagicLink = async ({ email }: { email: string }) => {
    setActiveAuthAction("email");
    const redirectTo = makeRedirectUri({ path: "auth/callback" });
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo } });
    setActiveAuthAction(null);
    if (error) {
      Alert.alert("Sign in failed", error.message);
      return;
    }
    setStep("code");
    Alert.alert("Check your email", "Enter the 6-digit code we sent.");
  };

  const verifyOtpCode = async ({ otpCode }: { otpCode: string }) => {
    const email = getEmailValues("email");
    if (!email) {
      Alert.alert("Missing email", "Please enter your email first.");
      setStep("email");
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
      Alert.alert("Code verification failed", error.message);
      return;
    }
    const user = data.user;
    if (user) {
      onSignedIn({
        id: user.id,
        email: user.email,
        displayName: (user.user_metadata?.full_name as string | undefined) || (user.user_metadata?.name as string | undefined) || null,
      });
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
          onSignedIn({
            id: sessionUser.id,
            email: sessionUser.email,
            displayName:
              (sessionUser.user_metadata?.full_name as string | undefined) ||
              (sessionUser.user_metadata?.name as string | undefined) ||
              null,
          });
        } else {
          Alert.alert("Google sign in incomplete", "No session returned. Please try again.");
        }
      } finally {
        onAuthBusy?.(false);
      }
    }
    setActiveAuthAction(null);
  };

  return (
    <SafeAreaView style={[styles.screen, styles.authScreenRoot, { backgroundColor: cAuth.screen }]}>
      <View style={styles.authBrandBlock}>
        <Text style={[styles.splashBrand, { color: cAuth.text }]}>FlareCare</Text>
        <Text style={[styles.splashTagline, { color: cAuth.textMuted }]}>Track. Learn. Feel better.</Text>
      </View>
      <Card title="" plain>
        {step === "email" ? (
          <>
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
                />
              )}
            />
            <PrimaryButton
              title={activeAuthAction === "email" ? "Loading..." : "Continue"}
              onPress={handleEmailSubmit(sendMagicLink)}
              disabled={activeAuthAction !== null}
            />
            <SecondaryButton
              title={activeAuthAction === "google" ? "Loading..." : "Continue with Google"}
              onPress={signInGoogle}
              disabled={activeAuthAction !== null}
            />
          </>
        ) : (
          <>
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
                />
              )}
            />
            <PrimaryButton
              title={activeAuthAction === "code" ? "Loading..." : "Verify code"}
              onPress={handleCodeSubmit(verifyOtpCode)}
              disabled={activeAuthAction !== null}
            />
            <SecondaryButton
              title="Use different email"
              onPress={() => {
                resetCode({ otpCode: "" });
                setStep("email");
              }}
            />
          </>
        )}
      </Card>
    </SafeAreaView>
  );
}

/** Icons inside dashboard home tiles (Daily Check-in + More). */
const HOME_TILE_ICON_SIZE = 34;

/** Show bottom shortcuts on dashboard + primary tab destinations; hide on Symptoms, Hydration, etc. */
const BOTTOM_BAR_VISIBLE_ROUTES = new Set(["Dashboard", "Meds", "Reminders", "Account", "About"]);

/** Padding uses this screen’s route—not the globally focused route—so the exiting page doesn’t jump during transitions. */
function useBottomTabScrollInset() {
  const route = useRoute();
  const insets = useSafeAreaInsets();
  return BOTTOM_BAR_VISIBLE_ROUTES.has(route.name) ? Math.max(insets.bottom, 8) + 36 : 0;
}

/** Matches `styles.screen` edge padding (used to size Daily Check-in row). */
const SCREEN_EDGE_PADDING = 12;
/** Space between sibling home tiles: Daily Check-in `marginRight` + More grid `gap`. */
const HOME_TILE_GAP = 16;

type ActivityRow = { key: string; title: string; ts: number; icon: "symptom" | "medication" | "bowel" | "weight" };
type DashboardSnapshot = {
  todaySummary: { symptoms: number; medsTaken: number; medsTotal: number; hydration: number };
  checkInBadges: { symptoms: number; missedMeds: number; hydration: number; bowel: number };
  recentActivity: ActivityRow[];
  weatherMeta: { city: string; temp: number | null; desc: string; icon?: string | null } | null;
  weather: string;
  newsItems: Array<{ title: string; source: string; publishedAt?: string; link?: string; imageUrl?: string | null }>;
  newsError: string | null;
};

const dashboardSnapshotByUserId: Record<string, DashboardSnapshot> = {};

function DashboardGridTile({
  width,
  label,
  icon,
  onPress,
  badgeValue,
  variant,
  isLastInScrollRow,
}: {
  width: number;
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
  /** Optional count badge (Daily Check-in only). */
  badgeValue?: number;
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
      {badgeValue !== undefined ? <Text style={[styles.homeDashboardTileBadge, { color: c.text }]}>{badgeValue}</Text> : null}
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
  const [newsItems, setNewsItems] = useState<
    Array<{ title: string; source: string; publishedAt?: string; link?: string; imageUrl?: string | null }>
  >(() => snapshotSeed?.newsItems ?? []);
  const [newsLoading, setNewsLoading] = useState(() => {
    const s = dashboardSnapshotByUserId[user.id];
    if (!s) return true;
    return !(s.newsItems.length > 0 || s.newsError);
  });
  const [newsError, setNewsError] = useState<string | null>(() => snapshotSeed?.newsError ?? null);
  const [todaySummary, setTodaySummary] = useState<{ symptoms: number; medsTaken: number; medsTotal: number; hydration: number }>(
    () => snapshotSeed?.todaySummary ?? { symptoms: 0, medsTaken: 0, medsTotal: 0, hydration: 0 },
  );
  const [recentActivity, setRecentActivity] = useState<ActivityRow[]>(() => snapshotSeed?.recentActivity ?? []);
  /** Counts shown on Daily Check-in tiles (top-left). */
  const [checkInBadges, setCheckInBadges] = useState<{ symptoms: number; missedMeds: number; hydration: number; bowel: number }>(
    () => snapshotSeed?.checkInBadges ?? { symptoms: 0, missedMeds: 0, hydration: 0, bowel: 0 },
  );
  const hydrationTarget = 6;
  const dailyCheckinCards = [
    { key: "symptoms" as const, label: "Symptoms", icon: "pulse", family: "ion", goTo: "Symptoms", value: checkInBadges.symptoms },
    { key: "missed-meds" as const, label: "Missed Medications", icon: "pill", family: "mci", goTo: "Meds", value: checkInBadges.missedMeds },
    { key: "hydration" as const, label: "Hydration", icon: "water", family: "mci", goTo: "Hydration", value: checkInBadges.hydration },
    { key: "bowel" as const, label: "Bowel Movements", icon: "stomach", family: "mci", goTo: "Bowel", value: checkInBadges.bowel },
  ];
  const moreLinkCards = [
    { key: "meds", label: "My Meds", screen: "Meds" as const, icon: "pill", family: "mci" as const },
    { key: "reports", label: "Reports", screen: "Reports" as const, icon: "document-text-outline", family: "ion" as const },
    { key: "weight", label: "My Weight", screen: "Weight" as const, icon: "scale-bathroom", family: "mci" as const },
    { key: "appointments", label: "Appointments", screen: "Appointments" as const, icon: "calendar-outline", family: "ion" as const },
  ];
  const firstName = (user.displayName || user.email?.split("@")[0] || "there").split(" ")[0];
  const todayLabel = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
  const formatRelativeTime = (timestamp: number) => {
    const diffMinutes = Math.floor((Date.now() - timestamp) / (1000 * 60));
    if (diffMinutes < 1) return "Just now";
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return new Date(timestamp).toLocaleDateString();
  };
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      const seedSnap = dashboardSnapshotByUserId[user.id];
      const snap: DashboardSnapshot = {
        todaySummary: seedSnap?.todaySummary ?? { symptoms: 0, medsTaken: 0, medsTotal: 0, hydration: 0 },
        checkInBadges: seedSnap?.checkInBadges ?? { symptoms: 0, missedMeds: 0, hydration: 0, bowel: 0 },
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
            missedMedsCountRes,
            bowelTodayCountRes,
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
            supabase.from(TABLES.LOG_MEDICATIONS).select("*", { count: "exact", head: true }).eq("user_id", user.id),
            supabase
              .from(TABLES.BOWEL_MOVEMENTS)
              .select("*", { count: "exact", head: true })
              .eq("user_id", user.id)
              .gte("occurred_at", `${today}T00:00:00`),
          ]);

          snap.todaySummary = {
            symptoms: todaySymptomsRes.data?.length ?? 0,
            medsTaken: takenMedsRes.data?.length ?? 0,
            medsTotal: medicationsRes.data?.length ?? 0,
            hydration: todayHydrationRes.data?.glasses ?? 0,
          };

          snap.checkInBadges = {
            symptoms: todaySymptomsRes.data?.length ?? 0,
            missedMeds: missedMedsCountRes.count ?? 0,
            hydration: todayHydrationRes.data?.glasses ?? 0,
            bowel: bowelTodayCountRes.count ?? 0,
          };

          const activityRows: ActivityRow[] = [];

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

          const fourHoursAgo = Date.now() - 4 * 60 * 60 * 1000;
          snap.recentActivity = activityRows
            .filter((row) => row.ts >= fourHoursAgo)
            .sort((a, b) => b.ts - a.ts)
            .slice(0, 4);

          if (cancelled) return;
          setTodaySummary(snap.todaySummary);
          setCheckInBadges(snap.checkInBadges);
          setRecentActivity(snap.recentActivity);
        } catch {
          snap.todaySummary = { symptoms: 0, medsTaken: 0, medsTotal: 0, hydration: 0 };
          snap.checkInBadges = { symptoms: 0, missedMeds: 0, hydration: 0, bowel: 0 };
          snap.recentActivity = [];
          if (cancelled) return;
          setTodaySummary(snap.todaySummary);
          setCheckInBadges(snap.checkInBadges);
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
            snap.newsItems = (Array.isArray(json?.items) ? json.items : [])
              .map((item: any) => ({
                title: String(item?.headline || item?.title || "Untitled"),
                source: String(item?.source || item?.sourceName || "Source"),
                publishedAt: item?.pubDate || item?.publishedAt || item?.date || undefined,
                link: item?.link || item?.url || undefined,
                imageUrl: item?.imageUrl || item?.image || item?.thumbnail || null,
              }))
              .slice(0, 6);
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

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: c.screen }]}
      contentContainerStyle={{ paddingBottom: bottomScrollInset }}
    >
      <Card title="" style={!weatherMeta ? styles.dashboardWeatherPlaceholder : undefined}>
        {weatherMeta ? (
          <>
            <View style={styles.weatherIntroWrap}>
              <Text style={[styles.weatherGreeting, { color: c.text }]}>Hi, {firstName}</Text>
              <Text style={[styles.weatherDate, { color: c.textMuted }]}>{todayLabel}</Text>
            </View>
            <View style={styles.weatherHero}>
              <View style={styles.weatherIconWrap}>
                {weatherMeta.icon ? (
                  <Image
                    source={{ uri: `https://openweathermap.org/img/wn/${weatherMeta.icon}@2x.png` }}
                    style={styles.weatherApiIcon}
                    resizeMode="contain"
                  />
                ) : (
                  <Ionicons name="partly-sunny" size={24} color={c.primary} />
                )}
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
          </>
        ) : (
          <Text style={[styles.text, { color: c.text }]}>{weather}</Text>
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
              badgeValue={item.value}
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
      <Text style={[styles.dashboardSectionTitleLeft, { color: c.text }]}>Today's Summary</Text>
      <Card title="" style={styles.todaySummaryCard}>
        <View style={styles.summaryWebRow}>
          <View style={styles.summaryWebLeft}>
            <Text style={[styles.summaryWebLabel, { color: c.text }]}>Symptoms Logged</Text>
          </View>
          <Text style={[styles.summaryWebValue, { color: c.text }]}>{todaySummary.symptoms}</Text>
        </View>
        <View style={styles.summaryWebRow}>
          <View style={styles.summaryWebLeft}>
            <Text style={[styles.summaryWebLabel, { color: c.text }]}>Medications Taken</Text>
          </View>
          <Text style={[styles.summaryWebValue, { color: c.text }]}>
            {todaySummary.medsTaken}/{todaySummary.medsTotal}
          </Text>
        </View>
        <View style={styles.summaryWebRow}>
          <View style={styles.summaryWebLeft}>
            <Text style={[styles.summaryWebLabel, { color: c.text }]}>Hydration</Text>
          </View>
          <Text style={[styles.summaryWebValue, { color: c.text }]}>
            {todaySummary.hydration}/{hydrationTarget}
          </Text>
        </View>
      </Card>
      <Text style={[styles.dashboardSectionTitle, { color: c.text }]}>Recent Activity</Text>
      <Card title="">
        {recentActivity.length ? (
          <View style={[styles.activityListWrap, { backgroundColor: c.surfaceSubtle }]}>
            {recentActivity.map((item, index) => (
              <View
                key={item.key}
                style={[
                  styles.activityNoteRow,
                  index !== recentActivity.length - 1 ? [styles.activityNoteRowDivider, { borderBottomColor: c.cardBorder }] : null,
                ]}
              >
                <Text style={[styles.activityNoteTitle, { color: c.text }]} numberOfLines={3}>
                  {item.title}
                </Text>
                <Text style={[styles.activityNoteWhen, { color: c.textMuted }]}>{formatRelativeTime(item.ts)}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={[styles.muted, { color: c.textMuted }]}>No recent activity yet.</Text>
        )}
      </Card>
      <Text style={[styles.dashboardSectionTitleLeft, { color: c.text }]}>Latest News</Text>
      <Card title="">
        {newsLoading ? (
          <Text style={[styles.muted, { color: c.textMuted }]}>Getting latest news...</Text>
        ) : newsError ? (
          <Text style={[styles.muted, { color: c.textMuted }]}>{newsError}</Text>
        ) : newsItems.length === 0 ? (
          <Text style={[styles.muted, { color: c.textMuted }]}>No news available right now.</Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.newsRail}>
            {newsItems.slice(0, 6).map((item, index) => (
              <Pressable
                key={`${item.title}-${index}`}
                style={[styles.newsCard, { backgroundColor: c.newsCardBg }, index === newsItems.slice(0, 6).length - 1 ? styles.newsCardLast : null]}
                onPress={() => {
                  if (item.link) {
                    Linking.openURL(item.link);
                  }
                }}
              >
                <View style={[styles.newsCardImage, { backgroundColor: c.newsImageBg }]}>
                  <NewsThumbnail imageUrl={item.imageUrl} />
                </View>
                <View style={styles.newsCardBody}>
                  <Text style={[styles.newsTitle, { color: c.text }]} numberOfLines={2}>
                    {item.title}
                  </Text>
                  <Text style={[styles.newsMeta, { color: c.textMuted }]} numberOfLines={1}>
                    {item.source}
                    {item.publishedAt ? ` • ${new Date(item.publishedAt).toLocaleDateString(undefined, { day: "numeric", month: "short" })}` : ""}
                  </Text>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        )}
      </Card>
      <View style={styles.moreSection}>
        <Text style={[styles.dashboardSectionTitleLeft, { color: c.text }]}>More</Text>
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
    </ScrollView>
  );
}

function SymptomsScreen({ user }: { user: SessionUser }) {
  const c = useFlareColors();
  const bottomScrollInset = useBottomTabScrollInset();
  const [severity, setSeverity] = useState("5");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<any[]>([]);

  const load = async () => {
    const { data } = await supabase.from(TABLES.LOG_SYMPTOMS).select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(30);
    setItems(data ?? []);
  };
  useEffect(() => { load(); }, [user.id]);

  const save = async () => {
    const now = new Date();
    const date = now.toISOString().split("T")[0];
    const payload = {
      id: Date.now().toString(),
      user_id: user.id,
      symptom_start_date: date,
      is_ongoing: true,
      symptom_end_date: null,
      severity: Number(severity),
      stress_level: null,
      normal_bathroom_frequency: null,
      bathroom_frequency_changed: null,
      bathroom_frequency_change_details: null,
      smoked_on_symptom_day: false,
      drank_on_symptom_day: false,
      notes: notes || null,
      created_at: now.toISOString(),
    };
    const { error } = await supabase.from(TABLES.LOG_SYMPTOMS).insert([payload]);
    if (error) return Alert.alert("Could not save symptom", error.message);
    setNotes("");
    await load();
  };

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: c.screen }]}
      contentContainerStyle={{ paddingBottom: bottomScrollInset }}
    >
      <Card title="Log Symptom">
        <LabeledInput label="Severity (1-10)" value={severity} onChangeText={setSeverity} keyboardType="number-pad" placeholder="Severity 1-10" />
        <LabeledInput label="Notes" value={notes} onChangeText={setNotes} placeholder="Notes" multiline />
        <PrimaryButton title="Save symptom" onPress={save} />
      </Card>
      <Card title="Recent Symptoms">
        {items.map((entry) => (
          <Text key={entry.id} style={[styles.text, { color: c.text }]}>
            {entry.created_at?.slice(0, 10)} - severity {entry.severity}
          </Text>
        ))}
      </Card>
    </ScrollView>
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
    Alert.alert("Medication saved", "Enable notifications in Reminders to schedule alerts.");
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
            <Text style={[styles.text, { color: c.text }]}>
              {m.name} {m.dosage ?? ""}
            </Text>
            <SecondaryButton title="Mark taken" onPress={() => logTaken(m)} />
          </View>
        ))}
      </Card>
    </ScrollView>
  );
}

function HydrationScreen({ user }: { user: SessionUser }) {
  const c = useFlareColors();
  const bottomScrollInset = useBottomTabScrollInset();
  const [glasses, setGlasses] = useState(0);
  const today = new Date().toISOString().split("T")[0];

  const load = async () => {
    const { data } = await supabase.from(TABLES.DAILY_HYDRATION).select("glasses").eq("user_id", user.id).eq("date", today).maybeSingle();
    setGlasses(data?.glasses ?? 0);
  };
  useEffect(() => { load(); }, [user.id]);

  const setValue = async (next: number) => {
    const clamped = Math.max(0, Math.min(6, next));
    const { error } = await supabase.from(TABLES.DAILY_HYDRATION).upsert({ user_id: user.id, date: today, glasses: clamped, updated_at: new Date().toISOString() }, { onConflict: "user_id,date" });
    if (error) return Alert.alert("Could not update hydration", error.message);
    setGlasses(clamped);
  };

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: c.screen }]}
      contentContainerStyle={{ flexGrow: 1, paddingBottom: bottomScrollInset }}
    >
      <Card title="Hydration Goal (6)">
        <Text style={[styles.bigText, { color: c.primary }]}>{glasses} / 6</Text>
        <View style={styles.row}>
          <SecondaryButton title="-1" onPress={() => setValue(glasses - 1)} />
          <SecondaryButton title="+1" onPress={() => setValue(glasses + 1)} />
          <SecondaryButton title="Reset" onPress={() => setValue(0)} />
        </View>
      </Card>
    </ScrollView>
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
          <Text key={r.id} style={[styles.text, { color: c.text }]}>
            {r.date} - {r.value_kg}kg
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
          <Text key={row.id} style={[styles.text, { color: c.text }]}>
            {row.occurred_at?.slice(0, 10)} - type {row.bristol_type}
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
    Alert.alert("Appointment saved", "Enable notifications in Reminders to schedule alerts.");
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
          <Text key={row.id} style={[styles.text, { color: c.text }]}>
            {row.date} {row.time ?? ""} - {row.type ?? "Appointment"}
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
    const text = [
      `Symptoms: ${symptoms.data?.length ?? 0}`,
      `Medication tracking logs: ${meds.data?.length ?? 0}`,
      `Hydration days: ${hydration.data?.length ?? 0}`,
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
        <Text style={[styles.text, { color: c.text }]}>Register push permissions and schedule medication reminders.</Text>
        <PrimaryButton title="Enable notifications" onPress={register} />
        <Text style={[styles.text, { color: c.text }]}>Token: {token ? `${token.slice(0, 24)}...` : "not registered"}</Text>
        <Text style={[styles.text, { color: c.text }]}>Scheduled reminders: {scheduled}</Text>
        {lastError ? <Text style={[styles.errorText, { color: c.danger }]}>Error: {lastError}</Text> : null}
        {Platform.OS === "ios" ? <Text style={[styles.muted, { color: c.textMuted }]}>iOS requires real device + APNs entitlements.</Text> : null}
      </Card>
    </ScrollView>
  );
}

function AboutScreen() {
  const c = useFlareColors();
  const bottomScrollInset = useBottomTabScrollInset();
  const displayName = Constants.expoConfig?.name ?? "Flare Care Mobile";
  const version = Constants.expoConfig?.version ?? Constants.nativeApplicationVersion ?? "—";
  const nativeBuild = Constants.nativeBuildVersion;

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: c.screen }]}
      contentContainerStyle={{ paddingBottom: 28 + bottomScrollInset }}
    >
      <View style={styles.aboutHero}>
        <Image source={require("./assets/flarecare-logo.png")} style={styles.aboutLogo} resizeMode="contain" />
        <Text style={[styles.aboutAppName, { color: c.text }]}>{displayName}</Text>
        <Text style={[styles.muted, { color: c.textMuted }]}>Version {version}</Text>
        {nativeBuild && nativeBuild !== version ? (
          <Text style={[styles.muted, { color: c.textMuted, marginTop: 4 }]}>Build {nativeBuild}</Text>
        ) : null}
      </View>
      <Card title="What FlareCare does">
        <Text style={[styles.text, { color: c.text }]}>
          FlareCare helps you log symptoms, medications, hydration, bowel movements, weight, and appointments—and keep tabs
          on reminders—so day-to-day patterns are easier to see. This app does not diagnose or replace care from your
          clinician.
        </Text>
      </Card>
    </ScrollView>
  );
}

function AccountScreen({ user, onLogout }: { user: SessionUser; onLogout: () => void }) {
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
      contentContainerStyle={{ paddingBottom: bottomScrollInset }}
    >
      <Text style={[styles.dashboardSectionTitleLeft, { color: c.text }]}>Account</Text>
      <Card title="">
        <Text style={[styles.text, { color: c.text }]}>Signed in as</Text>
        <Text style={[styles.accountEmail, { color: c.text }]}>{user.email || "Unknown user"}</Text>
        <PrimaryButton title="Logout" onPress={onLogout} fitContent />
      </Card>
      <Text style={[styles.dashboardSectionTitleLeft, { color: c.text }]}>Reminders</Text>
      <Card title="">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Push reminders"
          onPress={() => navigation.navigate("Reminders")}
          style={styles.moreNavRow}
        >
          <Text style={[styles.moreNavRowLabel, { color: c.text }]}>
            Push notifications and medication reminders
          </Text>
          <Ionicons name="chevron-forward" size={18} color={c.textMuted} />
        </Pressable>
      </Card>
      <Text style={[styles.dashboardSectionTitleLeft, { color: c.text }]}>Appearance</Text>
      <Card title="">
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
                style={[
                  styles.appearanceChip,
                  { backgroundColor: selected ? c.primary : c.appearanceChipInactiveBg },
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
      <Text style={[styles.dashboardSectionTitleLeft, { color: c.text }]}>About</Text>
      <Card title="">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="About FlareCare"
          onPress={() => navigation.navigate("About")}
          style={styles.moreNavRow}
        >
          <Text style={[styles.moreNavRowLabel, { color: c.text }]}>About FlareCare</Text>
          <Ionicons name="chevron-forward" size={18} color={c.textMuted} />
        </Pressable>
      </Card>
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

  if (!BOTTOM_BAR_VISIBLE_ROUTES.has(routeName)) {
    return null;
  }

  const go = (target: "Dashboard" | "Reminders" | "Account" | "About") => {
    navigationRef?.navigate(target as never);
  };

  const item = (
    target: "Dashboard" | "Reminders" | "Account" | "About",
    icon: ({ active }: { active: boolean }) => React.ReactNode,
    label: string,
  ) => {
    const active = routeName === target;
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
        ({ active }) => <Ionicons name={active ? "notifications" : "notifications-outline"} size={23} color={active ? colors.primary : colors.textMuted} />,
        "Reminders",
      )}
      {item("Account", ({ active }) => <Ionicons name={active ? "person-circle" : "person-circle-outline"} size={23} color={active ? colors.primary : colors.textMuted} />, "Account")}
      {item(
        "About",
        ({ active }) => (
          <Ionicons name={active ? "information-circle" : "information-circle-outline"} size={23} color={active ? colors.primary : colors.textMuted} />
        ),
        "About",
      )}
    </View>
  );
}

function AppTabs({ user, onLogout }: { user: SessionUser; onLogout: () => void }) {
  const { nav, colors } = useFlareTheme();
  const navigationRef = useNavigationContainerRef<Record<string, object | undefined>>();
  const [focusRouteName, setFocusRouteName] = useState("Dashboard");

  const syncFocusRoute = useCallback(() => {
    const name = navigationRef.getCurrentRoute()?.name;
    if (name) setFocusRouteName(name);
  }, [navigationRef]);

  const headerOptions = ({ navigation, route }: { navigation: any; route: { name: string } }) => {
    const isDashboard = route.name === "Dashboard";
    const isAbout = route.name === "About";

    return {
      headerTitle: isDashboard ? "FlareCare" : isAbout ? "About" : "",
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
      headerLeft:
        !isDashboard
          ? () => (
              <Pressable
                onPress={() => navigation.navigate("Dashboard")}
                style={styles.headerBackButton}
              >
                <Text style={[styles.headerBackText, { color: colors.primary }]}>Back</Text>
              </Pressable>
            )
          : undefined,
      headerRight: () => (
        <Pressable
          onPress={() => navigation.navigate("Account")}
          style={[styles.headerIconButton, { backgroundColor: colors.card }]}
        >
          <Ionicons name="person" size={18} color={colors.primary} />
        </Pressable>
      ),
    } as const;
  };

  return (
    <NavigationContainer ref={navigationRef} theme={nav} onReady={syncFocusRoute} onStateChange={syncFocusRoute}>
      <View style={{ flex: 1, backgroundColor: colors.screen }}>
        <View style={{ flex: 1 }}>
          <AppStack.Navigator initialRouteName="Dashboard" screenOptions={headerOptions as any}>
            <AppStack.Screen name="Dashboard">{() => <DashboardScreen key={user.id} user={user} />}</AppStack.Screen>
            <AppStack.Screen name="Symptoms">{() => <SymptomsScreen user={user} />}</AppStack.Screen>
            <AppStack.Screen name="Hydration">{() => <HydrationScreen user={user} />}</AppStack.Screen>
            <AppStack.Screen name="Weight">{() => <WeightScreen user={user} />}</AppStack.Screen>
            <AppStack.Screen name="Bowel">{() => <BowelScreen user={user} />}</AppStack.Screen>
            <AppStack.Screen name="Appointments">{() => <AppointmentsScreen user={user} />}</AppStack.Screen>
            <AppStack.Screen name="Reports">{() => <ReportsScreen user={user} />}</AppStack.Screen>
            <AppStack.Screen name="Meds">{() => <MedicationsScreen user={user} />}</AppStack.Screen>
            <AppStack.Screen name="Reminders">{() => <NotificationsScreen user={user} />}</AppStack.Screen>
            <AppStack.Screen name="Account">{() => <AccountScreen user={user} onLogout={onLogout} />}</AppStack.Screen>
            <AppStack.Screen name="About">{() => <AboutScreen />}</AppStack.Screen>
          </AppStack.Navigator>
        </View>
        <MainBottomTabBar routeName={focusRouteName} navigationRef={navigationRef} />
      </View>
    </NavigationContainer>
  );
}

export default function App() {
  const [user, setUser] = useState<SessionUser | null>(null);
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
          ? {
              id: sessionUser.id,
              email: sessionUser.email,
              displayName:
                (sessionUser.user_metadata?.full_name as string | undefined) ||
                (sessionUser.user_metadata?.name as string | undefined) ||
                null,
            }
          : null,
      );
      setLoading(false);
    };
    bootstrap();

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      const next = session?.user;
      setUser(
        next
          ? {
              id: next.id,
              email: next.email,
              displayName: (next.user_metadata?.full_name as string | undefined) || (next.user_metadata?.name as string | undefined) || null,
            }
          : null,
      );
      setLoading(false);
    });
    return () => {
      clearTimeout(splashTimer);
      data.subscription.unsubscribe();
    };
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const content = useMemo(() => {
    if (!fontsLoaded || loading || showSplash) {
      return <SplashScreen />;
    }
    if (user) {
      return <AppTabs user={user} onLogout={logout} />;
    }
    if (authBusy) {
      return <SplashScreen />;
    }
    return <AuthScreen onSignedIn={setUser} onAuthBusy={setAuthBusy} />;
  }, [fontsLoaded, loading, showSplash, user, authBusy]);

  return (
    <SafeAreaProvider>
      <FlareThemeProvider>
        {content}
        <ThemedStatusBar />
      </FlareThemeProvider>
    </SafeAreaProvider>
  );
}

function ThemedStatusBar() {
  const { colors } = useFlareTheme();
  return <StatusBar style={colors.isDark ? "light" : "dark"} />;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f4f7fb", padding: SCREEN_EDGE_PADDING },
  authScreenRoot: { paddingTop: 56 },
  authBrandBlock: { alignItems: "center", gap: 8, marginBottom: 28 },
  splashScreen: {
    flex: 1,
    backgroundColor: "#f4f7fb",
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 40,
    gap: 20,
  },
  splashCenter: { alignItems: "center", gap: 8 },
  splashBrand: { fontSize: 34, fontFamily: "Inter_800ExtraBold", color: "#1f2a44" },
  splashTagline: { fontSize: 14, fontFamily: "Inter_400Regular", color: "#6a7690" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", gap: 10 },
  card: { backgroundColor: "white", borderRadius: 14, padding: 14, marginBottom: 12, gap: 8 },
  todaySummaryCard: { paddingHorizontal: 20 },
  dashboardSectionTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: "#1f2a44",
    marginBottom: 12,
    marginTop: 10,
    textAlign: "center",
  },
  dashboardSectionTitleLeft: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: "#1f2a44",
    marginBottom: 12,
    marginTop: 10,
    textAlign: "left",
  },
  cardTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: "#1f2a44", textAlign: "center" },
  fieldBlock: { gap: 6, marginBottom: 2 },
  label: { color: "#23314f", fontSize: 13, fontFamily: "Inter_500Medium", marginTop: 2 },
  text: { color: "#23314f", fontSize: 14, fontFamily: "Inter_400Regular" },
  muted: { color: "#6a7690", fontSize: 13, fontFamily: "Inter_400Regular" },
  errorText: { color: "#b3261e", fontSize: 13, fontFamily: "Inter_400Regular" },
  fieldError: { color: "#b3261e", fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  bigText: { fontSize: 30, fontFamily: "Inter_700Bold", color: "#112240", marginBottom: 8 },
  input: { borderWidth: 1, borderColor: "#d2d8e4", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 9, backgroundColor: "#fff" },
  button: {
    borderRadius: 10,
    minHeight: 42,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    marginTop: 6,
  },
  buttonText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 14 },
  buttonSecondary: {
    backgroundColor: "#e9efff",
    borderRadius: 10,
    minHeight: 42,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    marginTop: 6,
  },
  buttonSecondaryText: { fontFamily: "Inter_700Bold", fontSize: 14 },
  headerIconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  headerBackButton: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginLeft: 8,
  },
  headerBackText: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
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
  accountEmail: { color: "#23314f", fontSize: 14, fontFamily: "Inter_700Bold", marginBottom: 8 },
  appearanceRow: { flexDirection: "row", gap: 8, marginTop: 4 },
  appearanceChip: {
    minHeight: 42,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
  },
  appearanceChipText: { fontSize: 14, fontFamily: "Inter_700Bold" },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 8 },
  reportBox: {
    minHeight: 130,
    borderWidth: 1,
    borderColor: "#d2d8e4",
    borderRadius: 10,
    padding: 10,
    backgroundColor: "#fbfdff",
    color: "#203052",
  },
  dashboardWeatherPlaceholder: { minHeight: 148 },
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
  weatherApiIcon: { width: 40, height: 40 },
  weatherIcon: { fontSize: 24 },
  weatherLeft: { flex: 1, paddingRight: 8 },
  weatherCity: { fontSize: 15, fontFamily: "Inter_500Medium", color: "#23314f" },
  weatherGreeting: { fontSize: 24, fontFamily: "Inter_800ExtraBold", color: "#1f2a44", marginBottom: 2 },
  weatherDate: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#6a7690", marginBottom: 6 },
  weatherDesc: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#6a7690", textTransform: "capitalize" },
  weatherTempWrap: { flexDirection: "row", alignItems: "flex-start" },
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
  homeDashboardTileBadge: {
    position: "absolute",
    top: 15,
    left: 14,
    fontSize: 14,
    fontFamily: "Inter_800ExtraBold",
    lineHeight: 17,
    zIndex: 1,
  },
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
    paddingVertical: 8,
  },
  summaryWebLeft: { flexDirection: "row", alignItems: "center", flex: 1, paddingRight: 8 },
  summaryWebLabel: { fontSize: 14, fontFamily: "Inter_400Regular", color: "#23314f", flex: 1 },
  summaryWebValue: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#1f2a44" },
  activityListWrap: {
    backgroundColor: "#f8fbff",
    borderRadius: 10,
    overflow: "hidden",
  },
  activityNoteRow: { padding: 10 },
  activityNoteRowDivider: { borderBottomWidth: 1, borderBottomColor: "#e3e9f7" },
  aboutHero: { alignItems: "center", paddingVertical: 20, paddingHorizontal: 16 },
  aboutLogo: { width: 80, height: 80, marginBottom: 12 },
  aboutAppName: { fontFamily: "Inter_700Bold", fontSize: 18, marginBottom: 6, textAlign: "center" },
  moreNavRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  moreNavRowLabel: { fontSize: 14, fontFamily: "Inter_400Regular", flex: 1, paddingRight: 10 },
  activityNoteTitle: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#23314f", lineHeight: 18 },
  activityNoteWhen: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#6a7690", marginTop: 6 },
  newsRail: { paddingVertical: 2 },
  newsCard: {
    width: 236,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    overflow: "hidden",
    marginRight: 12,
  },
  newsCardLast: { marginRight: 0 },
  newsCardImage: {
    width: "100%",
    aspectRatio: 16 / 10,
    backgroundColor: "#f3f7ff",
    alignItems: "center",
    justifyContent: "center",
  },
  newsCardImageAsset: {
    width: "100%",
    height: "100%",
  },
  newsCardBody: { paddingHorizontal: 12, paddingVertical: 10 },
  newsTitle: { fontSize: 13, fontFamily: "Inter_700Bold", color: "#23314f", lineHeight: 18 },
  newsMeta: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#6a7690", marginTop: 6 },
});
