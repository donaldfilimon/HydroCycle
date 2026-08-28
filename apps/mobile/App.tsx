import type { Screen } from "@hydrocycle/view-model";
import { StatusBar } from "expo-status-bar";
import { type ReactNode, useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

import SummaryScreen from "./src/screens/SummaryScreen";
import TestRunsScreen from "./src/screens/TestRunsScreen";
import WorkbenchScreen from "./src/screens/WorkbenchScreen";
import { theme } from "./src/theme";

/**
 * The web app has no router — navigation is a `?view=` query param over three
 * screens. There is no URL to mirror here, so this keeps the same three-screen
 * model as plain state rather than pulling in expo-router for one tab bar.
 * `Screen` is the shared view-model type, so the two clients cannot disagree
 * about which screens exist.
 */
const TABS: { key: Screen; label: string }[] = [
  { key: "summary", label: "Summary" },
  { key: "workbench", label: "Workbench" },
  { key: "test-runs", label: "Test Runs" },
];

function ScreenPanel({
  active,
  children,
}: {
  active: boolean;
  children: ReactNode;
}) {
  return (
    <View
      style={[styles.screenPanel, !active && styles.screenPanelHidden]}
      accessibilityElementsHidden={!active}
      importantForAccessibility={active ? "auto" : "no-hide-descendants"}
    >
      {children}
    </View>
  );
}

export default function App() {
  const [screen, setScreen] = useState<Screen>("summary");
  const [visitedScreens, setVisitedScreens] = useState<ReadonlySet<Screen>>(
    () => new Set(["summary"]),
  );

  const selectScreen = useCallback((nextScreen: Screen) => {
    setVisitedScreens((previous) => {
      if (previous.has(nextScreen)) return previous;
      const next = new Set(previous);
      next.add(nextScreen);
      return next;
    });
    setScreen(nextScreen);
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <SafeAreaView style={styles.root} edges={["top", "left", "right"]}>
        <View style={styles.body}>
          {visitedScreens.has("summary") ? (
            <ScreenPanel active={screen === "summary"}>
              <SummaryScreen />
            </ScreenPanel>
          ) : null}
          {visitedScreens.has("workbench") ? (
            <ScreenPanel active={screen === "workbench"}>
              <WorkbenchScreen />
            </ScreenPanel>
          ) : null}
          {visitedScreens.has("test-runs") ? (
            <ScreenPanel active={screen === "test-runs"}>
              <TestRunsScreen />
            </ScreenPanel>
          ) : null}
        </View>

        <View style={styles.tabBar}>
          {TABS.map((tab) => {
            const active = tab.key === screen;
            return (
              <Pressable
                key={tab.key}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                accessibilityLabel={tab.label}
                style={styles.tab}
                onPress={() => selectScreen(tab.key)}
              >
                <Text style={[styles.tabText, active && styles.tabTextActive]}>
                  {tab.label}
                </Text>
                <View
                  style={[
                    styles.tabIndicator,
                    active && styles.tabIndicatorActive,
                  ]}
                />
              </Pressable>
            );
          })}
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.background },
  body: { flex: 1 },
  screenPanel: { flex: 1 },
  screenPanelHidden: { display: "none" },
  tabBar: {
    flexDirection: "row",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.color.border,
    backgroundColor: theme.color.surface,
    paddingBottom: theme.space.sm,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingTop: theme.space.sm + 2,
  },
  tabText: { color: theme.color.textMuted, fontSize: 13, fontWeight: "600" },
  tabTextActive: { color: theme.color.text },
  tabIndicator: {
    marginTop: theme.space.xs,
    height: 2,
    width: 26,
    borderRadius: 1,
    backgroundColor: "transparent",
  },
  tabIndicatorActive: { backgroundColor: theme.color.accent },
});
