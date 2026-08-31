import React from "react";
import {
  Bell,
  BellOff,
  BookOpen,
  Calendar,
  ChartLine,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  CircleCheck,
  CircleMinus,
  Info,
  Circle,
  CircleUser,
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudMoon,
  CloudRain,
  CloudSun,
  CupSoda,
  Droplet,
  EllipsisVertical,
  Eye,
  EyeOff,
  FileText,
  Fingerprint,
  HandHeart,
  Hash,
  HeartPulse,
  House,
  List,
  Lock,
  Mail,
  Moon,
  Newspaper,
  Package,
  Pill,
  Plus,
  Scale,
  Send,
  Share2,
  Snowflake,
  SquarePen,
  Sun,
  Thermometer,
  Toilet,
  Trash2,
  Utensils,
  User,
  X,
  Clock,
  type LucideIcon,
} from "lucide-react-native";

/** Shared stroke for every Lucide glyph — keep outline weight identical. */
export const FLARE_LUCIDE_STROKE = 2;

/** Bottom tab bar icon size (matches prior Ion/MCI size). */
export const FLARE_TAB_LUCIDE_SIZE = 23;

/**
 * Feature icons — Lucide outline only.
 * Spike: dashboard Check-in / My health / My tools / My care tiles.
 */
export const FLARE_FEATURE_LUCIDE = {
  symptoms: Thermometer,
  trackMeds: ChartLine,
  wellbeing: HeartPulse,
  meds: Pill,
  hydration: CupSoda,
  bowel: Toilet,
  weight: Scale,
  supplies: Package,
  appointments: Calendar,
  reports: FileText,
  /** Fluid / measurement output log (Tools). */
  output: Droplet,
  /** Food & Drink intake diary (Tools). */
  intake: Utensils,
} as const;

export type FlareFeatureLucideKey = keyof typeof FLARE_FEATURE_LUCIDE;

/** Bottom nav — Lucide outline only (active = primary color, not a filled glyph). */
export const FLARE_TAB_LUCIDE = {
  home: House,
  logs: List,
  account: CircleUser,
  delete: Trash2,
} as const;

/** Header / chrome glyphs. */
export const FLARE_CHROME_LUCIDE = {
  overflow: EllipsisVertical,
  close: X,
  removeRow: CircleMinus,
  back: ChevronLeft,
  forward: ChevronRight,
  down: ChevronDown,
  up: ChevronUp,
  calendar: Calendar,
  time: Clock,
  dose: Hash,
  book: BookOpen,
  check: Check,
  checkDone: CheckCheck,
  checkCircle: CircleCheck,
  circle: Circle,
  edit: SquarePen,
  delete: Trash2,
  add: Plus,
  info: Info,
  lock: Lock,
  newspaper: Newspaper,
  notifications: Bell,
  notificationsOff: BellOff,
  person: User,
  brandMark: HandHeart,
  eye: Eye,
  eyeOff: EyeOff,
  fingerprint: Fingerprint,
  send: Send,
  share: Share2,
  mail: Mail,
} as const;

/**
 * Greeting-card weather — OWM `/img/wn/{id}@2x.png` → Lucide.
 */
export const FLARE_WEATHER_LUCIDE = {
  clearDay: Sun,
  clearNight: Moon,
  partlyCloudyDay: CloudSun,
  partlyCloudyNight: CloudMoon,
  cloudy: Cloud,
  drizzle: CloudDrizzle,
  rain: CloudRain,
  thunder: CloudLightning,
  snow: Snowflake,
  fog: CloudFog,
} as const;

export type FlareWeatherLucideKey = keyof typeof FLARE_WEATHER_LUCIDE;

/** OWM icon id (e.g. `02d`) → Lucide weather glyph. */
export function owmIconIdToLucide(iconId: string | null | undefined): LucideIcon {
  if (!iconId || iconId.length < 2) return FLARE_WEATHER_LUCIDE.partlyCloudyDay;
  const code = iconId.slice(0, 2);
  const night = iconId.endsWith("n");
  switch (code) {
    case "01":
      return night ? FLARE_WEATHER_LUCIDE.clearNight : FLARE_WEATHER_LUCIDE.clearDay;
    case "02":
      return night ? FLARE_WEATHER_LUCIDE.partlyCloudyNight : FLARE_WEATHER_LUCIDE.partlyCloudyDay;
    case "03":
    case "04":
      return FLARE_WEATHER_LUCIDE.cloudy;
    case "09":
      return FLARE_WEATHER_LUCIDE.drizzle;
    case "10":
      return FLARE_WEATHER_LUCIDE.rain;
    case "11":
      return FLARE_WEATHER_LUCIDE.thunder;
    case "13":
      return FLARE_WEATHER_LUCIDE.snow;
    case "50":
      return FLARE_WEATHER_LUCIDE.fog;
    default:
      return FLARE_WEATHER_LUCIDE.partlyCloudyDay;
  }
}

export function FlareLucideIcon({
  icon: Icon,
  size,
  color,
  strokeWidth = FLARE_LUCIDE_STROKE,
  ...props
}: {
  icon: LucideIcon;
  size: number;
  color: string;
  strokeWidth?: number;
} & Omit<React.ComponentProps<LucideIcon>, "size" | "color" | "strokeWidth">) {
  return <Icon size={size} color={color} strokeWidth={strokeWidth} {...props} />;
}
