/**
 * One-time post-login intro for new accounts — benefit / feature introduction, not a tutorial.
 * Shown once after sign-up (and profile setup), before the dashboard.
 *
 * Keep this lean: highest-value benefits only, not a full feature tour.
 * Copy is still provisional while more product areas land.
 *
 * Welcome uses the same icon band, then a title + supporting line.
 * Benefit slides use icon + one body text block.
 */
import type { LucideIcon } from "lucide-react-native";
import { FLARE_CHROME_LUCIDE, FLARE_FEATURE_LUCIDE } from "./flareLucideIcons";

export type NewUserIntroSlide = {
  text: string;
  /** Welcome only — bold title above the supporting line in `text`. */
  headline?: string;
  icon?: LucideIcon;
  /** Nudge icon in the media slot when a glyph’s ink sits high/low in its box. */
  iconOpticalOffsetY?: number;
};

export const NEW_USER_INTRO_SLIDES: NewUserIntroSlide[] = [
  {
    icon: FLARE_CHROME_LUCIDE.brandMark,
    headline: "Welcome to FlareCare",
    text: "Your IBD health companion",
  },
  {
    icon: FLARE_FEATURE_LUCIDE.symptoms,
    text: "Record symptoms and track medication adherence to keep your clinical team informed",
  },
  {
    icon: FLARE_FEATURE_LUCIDE.wellbeing,
    iconOpticalOffsetY: 3,
    text: "Check in on your wellbeing so mood, energy and sleep sit alongside your IBD",
  },
  {
    icon: FLARE_FEATURE_LUCIDE.appointments,
    text: "Keep appointments and medications organised, and set reminders so you get notified",
  },
  {
    icon: FLARE_FEATURE_LUCIDE.reports,
    text: "Build reports and summaries from your records to share with your care team",
  },
];
