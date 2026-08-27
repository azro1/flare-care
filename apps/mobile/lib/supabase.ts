import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const cleanEnv = (value?: string) => (value || "").trim().replace(/^['"]|['"]$/g, "");
const supabaseUrl = cleanEnv(process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL);
const supabaseAnonKey = cleanEnv(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});

/**
 * Clear the persisted Supabase session locally WITHOUT calling the server logout endpoint.
 * `supabase.auth.signOut()` (even with `scope: "local"`) revokes the current refresh token on the
 * server, which would break biometric quick-login. This just removes the cached auth tokens from
 * device storage so the next cold start shows the sign-in landing, while leaving the refresh token
 * valid for a one-touch biometric restore.
 */
export async function clearLocalSupabaseSession(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const authKeys = keys.filter((k) => k.startsWith("sb-") && k.includes("-auth-token"));
    if (authKeys.length) {
      await AsyncStorage.multiRemove(authKeys);
    }
  } catch {
    // non-fatal
  }
}

export const TABLES = {
  LOG_SYMPTOMS: "log_symptoms",
  MEDICATIONS: "medications",
  LOG_MEDICATIONS: "log_medications",
  TRACK_WEIGHT: "track_weight",
  TRACK_OUTPUT: "track_output",
  DAILY_HYDRATION: "daily_hydration",
  BOWEL_MOVEMENTS: "bowel_movements",
  APPOINTMENTS: "appointments",
  MEDICATION_TAKEN: "is_medication_taken",
  USER_PREFERENCES: "user_preferences",
  DAILY_WELLBEING: "daily_wellbeing",
  MEDICAL_SUPPLIES: "medical_supplies",
  MEDICAL_SUPPLY_KITS: "medical_supply_kits",
} as const;
