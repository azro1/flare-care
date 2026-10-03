import { useFocusEffect, useNavigation } from "@react-navigation/native";
import React, { useCallback, useLayoutEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScrollView } from "../lib/scrollViews";
import { InfoHintButton } from "../components/InfoHintButton";
import { ScreenHeader } from "../components/MidnightLagoonScreenHeader";
import { Card } from "../components/MidnightLagoonCard";
import { TrendsLoggingGraph } from "../components/TrendsLoggingGraph";
import { bottomTabBarScrollInset } from "../lib/layoutConstants";
import { SPACING } from "../designTokens";
import { useFlareColors } from "../theme";

type SessionUser = { id: string };

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
          message="Trends displays your FlareCare activity. Each bar represents one day, with the height indicating the number of entries logged."
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
    <View style={[styles.screen, { backgroundColor: c.screen }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomTabBarScrollInset(insets.bottom) }]}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader title="Trends" subtitle="Your FlareCare activity" />
        <Card>
          <TrendsLoggingGraph userId={user.id} active={focused} />
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: SPACING.screen,
    paddingTop: SPACING.lg,
  },
});
