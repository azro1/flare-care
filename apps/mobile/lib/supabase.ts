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

export const TABLES = {
  LOG_SYMPTOMS: "log_symptoms",
  MEDICATIONS: "medications",
  LOG_MEDICATIONS: "log_medications",
  TRACK_WEIGHT: "track_weight",
  DAILY_HYDRATION: "daily_hydration",
  BOWEL_MOVEMENTS: "bowel_movements",
  APPOINTMENTS: "appointments",
  MEDICATION_TAKEN: "is_medication_taken",
  USER_PREFERENCES: "user_preferences",
  DAILY_WELLBEING: "daily_wellbeing",
} as const;
