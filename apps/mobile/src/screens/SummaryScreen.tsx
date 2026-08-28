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

import { defaultSimulationInput } from "@hydrocycle/contracts";
import { DEFAULT_INPUTS, makeSimulationFixture } from "@hydrocycle/view-model";

import { getHealth, postSimulation, type ApiSimulationResult } from "../api";
import { API_BASE_URL } from "../config";
import {
  ABSENT,
  formatNumber,
  formatText,
  formatWithUnit,
  humanizeFailureCode,
} from "../format";
import { theme } from "../theme";

type ServiceState =
  | { kind: "checking" }
  | { kind: "online" }
  | { kind: "offline"; reason: string };

const localFixture = makeSimulationFixture("literature", DEFAULT_INPUTS);

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function Card({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {subtitle ? <Text style={styles.cardSubtitle}>{subtitle}</Text> : null}
      <View style={styles.cardBody}>{children}</View>
    </View>
  );
}

/**
 * Gate status. Invariant 1: a failed gate means no proposed reactive cycle —
 * the screen says so rather than falling back to the motored trace as if it
 * were the proposal.
 */
function GateCard({ result }: { result: ApiSimulationResult }) {
  const gate = result.gate;
  const passed = gate.passed === true;
  const failures = Array.isArray(gate.failures) ? gate.failures : [];

  return (
    <Card title="Feasibility gate">
      <View
        style={[
          styles.badge,
          { backgroundColor: passed ? theme.color.pass : theme.color.fail },
        ]}
      >
        <Text style={styles.badgeText}>{passed ? "PASSED" : "FAILED"}</Text>
      </View>

      <Row
        label="H2 available"
        value={formatWithUnit(gate.hydrogen_available?.value, "mg/cycle", 3)}
      />
      <Row
        label="H2 required"
        value={formatWithUnit(gate.hydrogen_required?.value, "mg/cycle", 3)}
      />
      <Row
        label="Mass margin"
        value={formatWithUnit(
          gate.hydrogen_mass_margin_mg_per_cycle,
          "mg/cycle",
          3,
        )}
      />

      {failures.length > 0 ? (
        <View style={styles.failureList}>
          {failures.map((code) => (
            <Text key={String(code)} style={styles.failureItem}>
              • {humanizeFailureCode(String(code))}
            </Text>
          ))}
        </View>
      ) : null}

      <Text style={styles.note}>
        {result.proposed_cycle
          ? "Proposed reactive cycle available."
          : "No proposed reactive cycle — motored baseline only."}
      </Text>
    </Card>
  );
}

/** Invariant 2: measured total H2 replaces the derived estimate, never adds. */
function LoadingCard({ result }: { result: ApiSimulationResult }) {
  const loading = result.loading;
  const mode = String(loading.mode ?? "");
  return (
    <Card
      title="Hydrogen loading"
      subtitle={
        mode === "measured_total"
          ? "Measured total replaces the derived estimate"
          : "Derived from dissolved + bubble-contained"
      }
    >
      <Row label="Mode" value={formatText(mode)} />
      <Row
        label="Dissolved"
        value={formatWithUnit(loading.dissolved_h2_mg_l?.value, "mg/L", 3)}
      />
      <Row
        label="Bubble-contained"
        value={formatWithUnit(
          loading.bubble_contained_h2_mg_l?.value,
          "mg/L",
          3,
        )}
      />
      <Row
        label="Total"
        value={formatWithUnit(loading.total_h2_mg_l?.value, "mg/L", 3)}
      />
    </Card>
  );
}

/** Invariant 6: every persisted result carries its reproducibility metadata. */
function ReproducibilityCard({ result }: { result: ApiSimulationResult }) {
  const meta = result.reproducibility;
  return (
    <Card title="Reproducibility">
      <Row label="Schema" value={formatText(meta.schema_version)} />
      <Row label="Model" value={formatText(meta.model_version)} />
      <Row label="Solver" value={formatText(meta.solver_version)} />
      <Row label="Python" value={formatText(meta.python_version)} />
      <Row
        label="Cantera"
        value={
          meta.cantera_available
            ? formatText(meta.cantera_version)
            : `${ABSENT} (unavailable)`
        }
      />
      <Row label="Mechanism" value={formatText(meta.mechanism)} />
      <Row label="Seed" value={formatNumber(meta.random_seed, 0)} />
    </Card>
  );
}

function LocalFixtureCard() {
  return (
    <Card
      title="Deterministic local fixture"
      subtitle="Synthetic preview, not a measurement"
    >
      <View style={[styles.badge, { backgroundColor: theme.color.fail }]}>
        <Text style={styles.badgeText}>FAILED</Text>
      </View>
      <Row
        label="H2 available"
        value={formatWithUnit(
          localFixture.gate.hydrogenAvailableMg,
          "mg/cycle",
          3,
        )}
      />
      <Row
        label="H2 required"
        value={formatWithUnit(
          localFixture.gate.hydrogenRequiredMg,
          "mg/cycle",
          3,
        )}
      />
      <Text style={styles.note}>
        No proposed reactive cycle — motored baseline only. Live API values
        replace this preview when the local model service responds.
      </Text>
    </Card>
  );
}

export default function SummaryScreen() {
  const [service, setService] = useState<ServiceState>({ kind: "checking" });
  const [result, setResult] = useState<ApiSimulationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      await getHealth();
      setService({ kind: "online" });
      const next = await postSimulation(defaultSimulationInput);
      setResult(next);
    } catch (cause) {
      const reason = cause instanceof Error ? cause.message : String(cause);
      setService({ kind: "offline", reason });
      setError(reason);
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={busy} onRefresh={() => void load()} />
      }
    >
      <Text style={styles.title}>HydroCycle</Text>
      <Text style={styles.subtitle}>
        Evidence-gated hydrogen combustion · 0D single zone
      </Text>

      <View style={styles.statusStrip}>
        <View
          style={[
            styles.statusDot,
            {
              backgroundColor:
                service.kind === "online"
                  ? theme.color.pass
                  : service.kind === "checking"
                    ? theme.color.warn
                    : theme.color.fail,
            },
          ]}
        />
        <Text style={styles.statusText}>
          {service.kind === "online"
            ? `Model service online · ${API_BASE_URL}`
            : service.kind === "checking"
              ? "Contacting model service…"
              : `Model service unreachable · ${API_BASE_URL}`}
        </Text>
      </View>

      {service.kind === "offline" ? (
        <Card title="Cannot reach the model service">
          <Text style={styles.note}>
            Start it with `bun run dev` on the host. This app is
            simulator/emulator only: the service binds 127.0.0.1 and is not
            reachable from a physical device.
          </Text>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </Card>
      ) : null}

      {busy && !result ? (
        <ActivityIndicator color={theme.color.accent} style={styles.spinner} />
      ) : null}

      {!result ? <LocalFixtureCard /> : null}

      {result ? (
        <>
          <GateCard result={result} />
          <LoadingCard result={result} />
          <ReproducibilityCard result={result} />
        </>
      ) : null}

      <Pressable
        accessibilityRole="button"
        style={styles.button}
        onPress={() => void load()}
        disabled={busy}
      >
        <Text style={styles.buttonText}>
          {busy ? "Running…" : "Re-run simulation"}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.color.background },
  content: { padding: theme.space.md, paddingBottom: theme.space.xl },
  title: { color: theme.color.text, fontSize: 30, fontWeight: "700" },
  subtitle: {
    color: theme.color.textMuted,
    fontSize: 14,
    marginTop: theme.space.xs,
  },
  statusStrip: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: theme.space.md,
    marginBottom: theme.space.sm,
  },
  statusDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    marginRight: theme.space.sm,
  },
  statusText: { color: theme.color.textMuted, fontSize: 12, flexShrink: 1 },
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
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: theme.space.xs + 2,
  },
  rowLabel: { color: theme.color.textMuted, fontSize: 14, flexShrink: 1 },
  rowValue: {
    color: theme.color.text,
    fontSize: 14,
    fontVariant: ["tabular-nums"],
    marginLeft: theme.space.md,
  },
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
  failureList: { marginTop: theme.space.sm },
  failureItem: { color: theme.color.fail, fontSize: 13, marginTop: 2 },
  note: {
    color: theme.color.textMuted,
    fontSize: 12,
    marginTop: theme.space.sm,
    lineHeight: 17,
  },
  errorText: {
    color: theme.color.fail,
    fontSize: 11,
    marginTop: theme.space.sm,
  },
  spinner: { marginTop: theme.space.lg },
  button: {
    marginTop: theme.space.lg,
    backgroundColor: theme.color.accent,
    borderRadius: theme.radius.md,
    paddingVertical: theme.space.md - 2,
    alignItems: "center",
  },
  buttonText: { color: theme.color.background, fontWeight: "700" },
});
