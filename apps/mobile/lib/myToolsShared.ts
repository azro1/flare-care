/**
 * My tools hub — shared door list for the home entry card and Tools screen.
 */
import type { LucideIcon } from "lucide-react-native";
import { FLARE_FEATURE_LUCIDE } from "./flareLucideIcons";

export type MyToolDoor = {
  id: string;
  label: string;
  screen: string;
  icon: LucideIcon;
};

export const MY_TOOL_DOORS: MyToolDoor[] = [
  {
    id: "weight",
    label: "My Weight",
    screen: "Weight",
    icon: FLARE_FEATURE_LUCIDE.weight,
  },
  {
    id: "output",
    label: "Fluid Output",
    screen: "Output",
    icon: FLARE_FEATURE_LUCIDE.output,
  },
  {
    id: "intake",
    label: "Food & Drink",
    screen: "Intake",
    icon: FLARE_FEATURE_LUCIDE.intake,
  },
  {
    id: "out-about",
    label: "Out & About",
    screen: "OutAbout",
    icon: FLARE_FEATURE_LUCIDE.outAbout,
  },
];
