import { useFocusEffect, useNavigation } from "@react-navigation/native";
import React, { useCallback, useLayoutEffect, useState } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { InfoHintButton } from "../components/InfoHintButton";
import { InstructionScreenShell } from "../components/InstructionScreenShell";
import { logHistoryCardStyles } from "../components/LogHistoryList";
import { TrendsLoggingGraph } from "../components/TrendsLoggingGraph";
import {
  CARD_SECTION_INNER_GAP,
  bottomTabBarScrollInset,
} from "../lib/layoutConstants";
import { useFlareColors } from "../theme";

type SessionUser = { id: string };

/**
 * Trends — how often the user has been logging in Flarecare (not a health score).
 * Bottom-tab root (app-wide). Distinct from Activity / Progress (Meds ↔ Hydration).
 */
export function TrendsScreen({ user }: { user: SessionUser }) {
  const c = useFlareColors();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [focused, setFocused] = useState(true);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitleAlign: "center",
      headerTitleContainerStyle: undefined,
      headerTitle: "Trends",
      headerRight: () => (
        <InfoHintButton
          title="Trends"
          message="See how often you’ve been logging in Flarecare. Each bar is one day. Taller means more entries that day — not a health score."
          accessibilityLabel="About Trends"
        />
      ),
    });
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );

  return (
    <InstructionScreenShell
      showInstruction={false}
      contentPaddingBottom={bottomTabBarScrollInset(insets.bottom) + CARD_SECTION_INNER_GAP}
      instruction={null}
    >
      <View style={[logHistoryCardStyles.trackerCard, { backgroundColor: c.card }]}>
        <TrendsLoggingGraph userId={user.id} active={focused} />
      </View>
    </InstructionScreenShell>
  );
}
