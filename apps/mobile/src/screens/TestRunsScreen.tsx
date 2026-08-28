import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { getTestRuns, type ApiTestRunDocument } from "../api";
import { Card, Note, Row } from "../components/ui";
import { formatText } from "../format";
import { theme } from "../theme";

/**
 * Mirrors the web client's StatusIcon mapping so the two clients agree on what
 * a run's state looks like. The enum is `draft | needs_review | valid |
 * invalid` (contracts: TestRunStatus) — there is no "reviewed" state, and
 * collapsing `valid` and `invalid` into one muted tone hides the distinction
 * that matters most when reviewing evidence.
 */
export function statusTone(status: string): string {
  if (status === "valid") return theme.color.pass;
  if (status === "invalid") return theme.color.fail;
  return theme.color.warn;
}

function formatTimestamp(value: string | null | undefined): string {
  if (!value) return formatText(value);
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? formatText(value)
    : parsed.toISOString().replace("T", " ").slice(0, 16);
}

export default function TestRunsScreen() {
  const [runs, setRuns] = useState<ApiTestRunDocument[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      setRuns(await getTestRuns());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      setRuns(null);
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Demo/synthetic runs are excluded from the measurement count, matching the
  // web client — a bundled fixture is not evidence of a measurement.
  const measured = (runs ?? []).filter((run) => !run.is_demo_synthetic);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={busy} onRefresh={() => void load()} />
      }
    >
      <Text style={styles.title}>Test Runs</Text>
      <Text style={styles.subtitle}>
        {runs
          ? `${measured.length} measured · ${runs.length - measured.length} synthetic`
          : "Loading persisted runs…"}
      </Text>

      {busy && !runs ? (
        <ActivityIndicator color={theme.color.accent} style={styles.spinner} />
      ) : null}

      {error ? (
        <Card title="Cannot reach the model service">
          <Text style={styles.errorText}>{error}</Text>
          <Note>
            Start it with `bun run dev` on the host. This app is
            simulator/emulator only.
          </Note>
        </Card>
      ) : null}

      {runs && runs.length === 0 ? (
        <Card title="No persisted runs">
          <Note>
            Runs created on the web client appear here. Nulls stay null — an
            empty list is not a zero measurement.
          </Note>
        </Card>
      ) : null}

      {(runs ?? []).map((run) => (
        <Card key={run.id} title={formatText(run.name)}>
          <View style={styles.statusLine}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: statusTone(String(run.status)) },
              ]}
            />
            <Text style={styles.statusText}>
              {formatText(String(run.status))}
              {run.is_demo_synthetic ? " · synthetic demo" : ""}
            </Text>
          </View>
          <Row label="Operator" value={formatText(run.operator)} />
          <Row label="Sample" value={formatText(run.sample_id)} />
          <Row label="Created" value={formatTimestamp(run.created_at)} />
          <Row
            label="Simulations"
            value={String((run.simulation_ids ?? []).length)}
          />
        </Card>
      ))}

      <Note>
        Read-only on mobile: creating, editing, importing, and deleting runs
        stay on the web client.
      </Note>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.color.background },
  content: { padding: theme.space.md, paddingBottom: theme.space.xl },
  title: { color: theme.color.text, fontSize: 28, fontWeight: "700" },
  subtitle: {
    color: theme.color.textMuted,
    fontSize: 13,
    marginTop: theme.space.xs,
  },
  statusLine: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: theme.space.xs,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: theme.space.sm,
  },
  statusText: { color: theme.color.textMuted, fontSize: 12 },
  spinner: { marginTop: theme.space.lg },
  errorText: { color: theme.color.fail, fontSize: 12 },
});
