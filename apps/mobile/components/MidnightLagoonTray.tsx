import React from "react";
import { View, Text, Pressable, StyleSheet, ViewStyle, TextStyle } from "react-native";
import { useFlareColors } from "../theme";
import { SPACING, RADIUS, TYPOGRAPHY, DIMENSIONS, OPACITY } from "../designTokens";
import { FlareLucideIcon, FLARE_CHROME_LUCIDE } from "../lib/flareLucideIcons";
import { NAV_ROW_CHEVRON_SIZE } from "../lib/layoutConstants";
import type { LucideIcon } from "lucide-react-native";

type TrayProps = {
  children: React.ReactNode;
  style?: ViewStyle;
};

export function Tray({ children, style }: TrayProps) {
  const colors = useFlareColors();

  return (
    <View
      style={[
        styles.tray,
        { backgroundColor: colors.tray },
        style,
      ]}
    >
      {children}
    </View>
  );
}

type TrayRowProps = {
  icon?: LucideIcon;
  label: string;
  sublabel?: string;
  value?: string;
  valueColor?: string;
  showChevron?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
  disabled?: boolean;
  /** No filled tray background, so the row sits flat on its card. */
  plain?: boolean;
  /** No coloured square behind the icon. Lists use this. Pass false for a square, as on Security. */
  bareIcon?: boolean;
  /** Glyph colour. Defaults to the theme primary. The tile wash uses the same colour. */
  iconColor?: string;
  style?: ViewStyle;
};

export function TrayRow({
  icon,
  label,
  sublabel,
  value,
  valueColor,
  showChevron,
  onPress,
  onLongPress,
  disabled,
  plain,
  bareIcon = true,
  iconColor,
  style,
}: TrayRowProps) {
  const colors = useFlareColors();

  const content = (
    <View style={[styles.trayRow, { backgroundColor: plain ? "transparent" : colors.tray }, style]}>
      <View style={styles.trayRowLeft}>
        {icon && (
          <View
            style={[
              styles.iconTile,
              bareIcon
                ? null
                : {
                    backgroundColor:
                      (iconColor ?? colors.primary) +
                      Math.round(OPACITY.iconTile * 255).toString(16).padStart(2, "0"),
                  },
            ]}
          >
            <FlareLucideIcon icon={icon} size={18} color={iconColor ?? colors.primary} />
          </View>
        )}
        <View style={styles.trayRowLabels}>
          <Text
            style={[
              styles.trayRowLabel,
              { color: colors.text, fontFamily: TYPOGRAPHY.fontFamily.medium },
            ]}
          >
            {label}
          </Text>
          {sublabel && (
            <Text
              style={[
                styles.trayRowSublabel,
                { color: colors.textSecondary, fontFamily: TYPOGRAPHY.fontFamily.regular },
              ]}
            >
              {sublabel}
            </Text>
          )}
        </View>
      </View>
      {value || showChevron ? (
        <View style={styles.trayRowTrailing}>
          {value ? (
            <Text
              style={[
                styles.trayRowValue,
                {
                  color: valueColor || colors.textSecondary,
                  fontFamily: TYPOGRAPHY.fontFamily.regular,
                },
              ]}
            >
              {value}
            </Text>
          ) : null}
          {showChevron ? (
            <FlareLucideIcon icon={FLARE_CHROME_LUCIDE.forward} size={NAV_ROW_CHEVRON_SIZE} color={colors.text} />
          ) : null}
        </View>
      ) : null}
    </View>
  );

  if (onPress && !disabled) {
    return (
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
        accessibilityRole="button"
      >
        {content}
      </Pressable>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  tray: {
    borderRadius: RADIUS.tray,
    padding: SPACING.md,
    marginTop: SPACING.sm,
  },
  trayRow: {
    borderRadius: RADIUS.tray,
    paddingVertical: SPACING.card,
    paddingHorizontal: SPACING.card,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: SPACING.sm,
  },
  trayRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: SPACING.md,
  },
  iconTile: {
    width: DIMENSIONS.iconTile,
    height: DIMENSIONS.iconTile,
    borderRadius: RADIUS.iconTile,
    alignItems: "center",
    justifyContent: "center",
  },
  trayRowLabels: {
    flex: 1,
  },
  trayRowLabel: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  trayRowSublabel: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    marginTop: 2,
  },
  trayRowTrailing: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    marginLeft: SPACING.md,
    flexShrink: 1,
  },
  trayRowValue: {
    fontSize: TYPOGRAPHY.fontSize.md,
    flexShrink: 1,
  },
});
