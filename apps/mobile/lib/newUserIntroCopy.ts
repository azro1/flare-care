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
import type { ComponentProps } from "react";
import type { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { APPOINTMENTS_FEATURE_ION_ICON } from "./appointmentShared";
import { WELLBEING_MCI_ICON } from "./wellbeingShared";

type IonName = ComponentProps<typeof Ionicons>["name"];
type MciName = ComponentProps<typeof MaterialCommunityIcons>["name"];

export type NewUserIntroSlide = {
  text: string;
  /** Welcome only — bold title above the supporting line in `text`. */
  headline?: string;
  icon?: { family: "ion"; name: IonName } | { family: "mci"; name: MciName };
  /** Nudge icon in the media slot when a glyph’s ink sits high/low in its box. */
  iconOpticalOffsetY?: number;
};

export const NEW_USER_INTRO_SLIDES: NewUserIntroSlide[] = [
  {
    icon: { family: "mci", name: "hand-heart" },
    headline: "Welcome to FlareCare",
    text: "Your IBD health companion",
  },
  {
    icon: { family: "mci", name: "thermometer" },
    text: "Record symptoms and track medication adherence to keep your clinical team informed",
  },
  {
    icon: { family: "mci", name: WELLBEING_MCI_ICON },
    /** `heart-pulse` ink sits high in the MCI box — closes the extra gap above the copy. */
    iconOpticalOffsetY: 3,
    text: "Check in on your wellbeing so mood, energy and sleep sit alongside your IBD",
  },
  {
    icon: { family: "ion", name: APPOINTMENTS_FEATURE_ION_ICON },
    text: "Keep appointments and medications organised, and set reminders so you get notified",
  },
  {
    icon: { family: "ion", name: "document-text-outline" },
    text: "Build reports and summaries from your records to share with your care team",
  },
];
