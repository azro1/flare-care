import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useFlareColors } from "../theme";

const bs = StyleSheet.create({
  btn: { borderRadius: 10, minHeight: 42, alignItems: "center", justifyContent: "center", paddingHorizontal: 12, marginTop: 6 },
  btnText: { fontFamily: "Inter_700Bold", fontSize: 14, color: "#fff" },
  sec: { borderRadius: 10, minHeight: 42, alignItems: "center", justifyContent: "center", paddingHorizontal: 12, marginTop: 6, borderWidth: 1 },
  secInner: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  secText: { fontFamily: "Inter_700Bold", fontSize: 14 },
});

export function WizardPrimaryButton({
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
      style={[bs.btn, { backgroundColor: disabled ? c.primaryDisabledBg : c.primary }, disabled ? { opacity: 0.55 } : null]}
    >
      <Text style={bs.btnText}>{title}</Text>
    </Pressable>
  );
}

export function WizardSecondaryButton({ title, onPress }: { title: string; onPress: () => void }) {
  const c = useFlareColors();
  return (
    <Pressable onPress={onPress} style={[bs.sec, { backgroundColor: c.secondaryBtnBg, borderColor: c.secondaryBtnBorder }]}>
      <View style={bs.secInner}>
        <Text style={[bs.secText, { color: c.secondaryBtnText }]}>{title}</Text>
      </View>
    </Pressable>
  );
}
