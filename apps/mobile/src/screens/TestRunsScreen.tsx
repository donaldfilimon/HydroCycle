import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { createTestRun, getTestRuns, type ApiTestRunDocument } from "../api";
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

export function hasRecordedMeasurements(run: ApiTestRunDocument): boolean {
  return Object.values(run.measurements).some((value) =>
    Array.isArray(value)
      ? value.length > 0
      : value !== null && value !== undefined,
  );
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
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRuns(await getTestRuns());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      setRuns(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const createDraft = useCallback(async () => {
    setCreating(true);
    setError(null);
    try {
      const created = await createTestRun({
        name: `Mobile draft ${new Date().toISOString().slice(0, 16).replace("T", " ")}`,
        status: "draft",
        is_demo_synthetic: false,
        notes:
          "Created on mobile; add reviewed measurements before validation.",
      });
      setRuns((previous) => [created, ...(previous ?? [])]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setCreating(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Demo/synthetic runs are excluded from the measurement count, matching the
  // web client — a bundled fixture is not evidence of a measurement.
  const measured = (runs ?? []).filter(
    (run) => !run.is_demo_synthetic && hasRecordedMeasurements(run),
  );
  const syntheticCount = (runs ?? []).filter(
    (run) => run.is_demo_synthetic,
  ).length;
  const unmeasuredCount =
    (runs?.length ?? 0) - measured.length - syntheticCount;
  const busy = loading || creating;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={loading}
          onRefresh={() => {
            if (!creating) void load();
          }}
        />
      }
    >
      <Text style={styles.title}>Test Runs</Text>
      <Text style={styles.subtitle}>
        {runs
          ? `${measured.length} measured · ${unmeasuredCount} unmeasured · ${syntheticCount} synthetic`
          : "Loading persisted runs…"}
      </Text>

      <Pressable
        accessibilityRole="button"
        style={[styles.createButton, busy && styles.createButtonDisabled]}
        onPress={() => void createDraft()}
        disabled={busy}
      >
        <Text style={styles.createButtonText}>Create draft</Text>
      </Pressable>

      {loading && !runs ? (
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
        Mobile creates empty drafts only. Editing, validation, importing, and
        deletion stay on the web client until their review and confirmation
        flows are implemented here.
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
  createButton: {
    alignSelf: "flex-start",
    backgroundColor: theme.color.accent,
    borderRadius: theme.radius.md,
    marginTop: theme.space.md,
    paddingHorizontal: theme.space.md,
    paddingVertical: theme.space.sm + 2,
  },
  createButtonDisabled: { opacity: 0.6 },
  createButtonText: { color: theme.color.background, fontWeight: "700" },
});
