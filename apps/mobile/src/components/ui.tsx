import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { theme } from "../theme";

export function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

export function Card({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {subtitle ? <Text style={styles.cardSubtitle}>{subtitle}</Text> : null}
      <View style={styles.cardBody}>{children}</View>
    </View>
  );
}

export function Badge({
  tone,
  label,
}: {
  tone: "pass" | "fail";
  label: string;
}) {
  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor:
            tone === "pass" ? theme.color.pass : theme.color.fail,
        },
      ]}
    >
      <Text style={styles.badgeText}>{label}</Text>
    </View>
  );
}

export function Note({ children }: { children: ReactNode }) {
  return <Text style={styles.note}>{children}</Text>;
}

export const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: theme.space.xs + 2,
  },
  rowLabel: {
    color: theme.color.textMuted,
    flexBasis: "38%",
    flexGrow: 0,
    flexShrink: 0,
    fontSize: 14,
  },
  rowValue: {
    color: theme.color.text,
    flex: 1,
    flexShrink: 1,
    fontSize: 14,
    fontVariant: ["tabular-nums"],
    marginLeft: theme.space.md,
    textAlign: "right",
  },
  card: {
    backgroundColor: theme.color.surface,
    borderRadius: theme.radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.color.border,
    padding: theme.space.md,
    marginTop: theme.space.md,
  },
  cardTitle: { color: theme.color.text, fontSize: 17, fontWeight: "600" },
  cardSubtitle: {
    color: theme.color.textMuted,
    fontSize: 12,
    marginTop: theme.space.xs,
  },
  cardBody: { marginTop: theme.space.sm },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: theme.space.sm + 2,
    paddingVertical: theme.space.xs,
    borderRadius: theme.radius.sm,
    marginBottom: theme.space.sm,
  },
  badgeText: {
    color: theme.color.background,
    fontWeight: "700",
    fontSize: 12,
    letterSpacing: 0.5,
  },
  note: {
    color: theme.color.textMuted,
    fontSize: 12,
    marginTop: theme.space.sm,
    lineHeight: 17,
  },
});
