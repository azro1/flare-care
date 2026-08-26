/**
 * One-time post-login intro for new accounts — benefit / feature introduction, not a tutorial.
 * Shown once after sign-up (and profile setup), before the dashboard.
 *
 * Keep this lean: highest-value benefits only, not a full feature tour.
 * Layout: icon → title → one short supporting line (clean onboarding stack).
 */
import type { LucideIcon } from "lucide-react-native";
import { FLARE_CHROME_LUCIDE, FLARE_FEATURE_LUCIDE } from "./flareLucideIcons";

export type NewUserIntroSlide = {
  /** Primary title shown under the icon. */
  title: string;
  /** Short supporting line under the title. */
  text: string;
  icon: LucideIcon;
  /** Nudge icon in the media slot when a glyph’s ink sits high/low in its box. */
  iconOpticalOffsetY?: number;
};

export const NEW_USER_INTRO_SLIDES: NewUserIntroSlide[] = [
  {
    icon: FLARE_CHROME_LUCIDE.brandMark,
    title: "Welcome to",
    text: "Your IBD health companion — built to make managing IBD easier.",
  },
  {
    icon: FLARE_FEATURE_LUCIDE.symptoms,
    title: "Track what matters",
    text: "Keep track of changes in your health as they happen.",
  },
  {
    icon: FLARE_FEATURE_LUCIDE.wellbeing,
    iconOpticalOffsetY: 3,
    title: "Check in on yourself",
    text: "Capture how you're coping day to day — beyond your IBD symptoms.",
  },
  {
    icon: FLARE_FEATURE_LUCIDE.appointments,
    title: "Stay organised",
    text: "Keep on top of the things that matter to your care.",
  },
  {
    icon: FLARE_FEATURE_LUCIDE.reports,
    title: "Share with your team",
    text: "Turn your logs into detailed reports you can share with clinicians.",
  },
];
