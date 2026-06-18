import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { FLARE_FONT_FAMILY, FLARE_FONT_SIZE } from "../lib/layoutConstants";
import { useFlareColors } from "../theme";

export function DashboardWelcomeCard({ onDismiss }: { onDismiss: () => void }) {
  const c = useFlareColors();

  return (
    <View style={[styles.card, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
      <View style={styles.row}>
        <Text style={[styles.body, { color: c.textMuted }]}>
          Welcome to FlareCare. To get started, check out the Daily Check-in section below. Here you can log your
          first symptom.
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss welcome message"
          onPress={onDismiss}
          hitSlop={12}
          style={styles.close}
        >
          <Ionicons name="close" size={22} color={c.textMuted} accessibilityIgnoresInvertColors />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
      },
      android: { elevation: 6 },
    }),
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 4,
  },
  body: {
    flex: 1,
    fontSize: FLARE_FONT_SIZE.navTitle,
    lineHeight: 22,
    letterSpacing: 0.3,
    fontFamily: FLARE_FONT_FAMILY.semibold,
  },
  close: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -4,
    marginRight: -6,
  },
});
