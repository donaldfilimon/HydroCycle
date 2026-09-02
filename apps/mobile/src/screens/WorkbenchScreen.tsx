import {
  DEFAULT_INPUTS,
  makeSimulationFixture,
  mapApiTestRun,
  mapApiSimulationResult,
  mayContributeMeasurementEvidence,
  proposedCycleForDisplay,
  simulationChartSeries,
  simulationRequest,
} from "@hydrocycle/view-model";
import type { TestRunView, WorkbenchInputs } from "@hydrocycle/view-model";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { getTestRun, postSimulation } from "../api";
import { Badge, Card, Note, Row } from "../components/ui";
import { TraceChart } from "../components/TraceChart";
import {
  formatWithUnit,
  humanizeFailureCode,
  visibleFailureCodes,
} from "../format";
import type { SimulationSession } from "../session";
import { theme } from "../theme";

/**
 * The numeric inputs exposed on mobile. This is deliberately a subset of the
 * web workbench: the full form has 25 fields, which is not a small-screen
 * experience. Every field omitted here keeps its `DEFAULT_INPUTS` value, and
 * the request is built by the same shared `simulationRequest` mapper the web
 * app uses, so the two clients cannot drift in how evidence basis is assigned.
 */
const FIELDS = [
  { key: "waterTemperatureC", label: "Water temperature", unit: "°C" },
  { key: "systemPressureBar", label: "System pressure", unit: "bar" },
  { key: "carrierVolumeMlPerCycle", label: "Carrier volume", unit: "mL/cyc" },
  { key: "retentionFraction", label: "Retention fraction", unit: "" },
  { key: "displacementL", label: "Displacement", unit: "L" },
  { key: "compressionRatio", label: "Compression ratio", unit: "" },
  { key: "speedRpm", label: "Speed", unit: "rpm" },
  { key: "equivalenceRatio", label: "Equivalence ratio", unit: "" },
] as const satisfies readonly {
  key: keyof WorkbenchInputs;
  label: string;
  unit: string;
}[];

type FieldKey = (typeof FIELDS)[number]["key"];

function chartSeriesForResult(
  result: NonNullable<SimulationSession>["result"],
  inputs: WorkbenchInputs,
) {
  try {
    return simulationChartSeries(
      mapApiSimulationResult(
        makeSimulationFixture(inputs.fixture, inputs),
        result,
      ),
    );
  } catch {
    return null;
  }
}

interface WorkbenchScreenProps {
  selectedRun: TestRunView | null;
  session: SimulationSession | null;
  onSessionChange: (session: SimulationSession | null) => void;
  onSimulationLinked: (run: TestRunView) => void;
}

export default function WorkbenchScreen({
  selectedRun,
  session,
  onSessionChange,
  onSimulationLinked,
}: WorkbenchScreenProps) {
  const result = session?.source === "workbench" ? session.result : null;
  const [inputs, setInputs] = useState<WorkbenchInputs>(DEFAULT_INPUTS);
  const [draft, setDraft] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      FIELDS.map((field) => [field.key, String(DEFAULT_INPUTS[field.key])]),
    ),
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const requestRef = useRef<AbortController | null>(null);
  const requestGenerationRef = useRef(0);
  const selectedRunIdRef = useRef(selectedRun?.id ?? null);
  selectedRunIdRef.current = selectedRun?.id ?? null;

  useEffect(() => () => requestRef.current?.abort(), []);

  const commit = useCallback(
    (key: FieldKey, text: string) => {
      if (busy) return;
      setDraft((previous) => ({ ...previous, [key]: text }));
      const parsed = Number(text);
      // An unparseable entry leaves the committed input untouched rather than
      // silently becoming 0 — invariant 3 applies to what we send, not just to
      // what we display.
      if (text.trim() !== "" && Number.isFinite(parsed)) {
        setInputs((previous) => ({ ...previous, [key]: parsed }));
      }
    },
    [busy],
  );

  const run = useCallback(async () => {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    const generation = ++requestGenerationRef.current;
    setBusy(true);
    setError(null);
    let simulationCompleted = false;
    try {
      const measurementRun = mayContributeMeasurementEvidence(
        inputs.fixture,
        selectedRun,
      )
        ? selectedRun
        : null;
      const linkedRun = selectedRun?.persisted ? selectedRun : null;
      const persistence = linkedRun ? { testRunId: linkedRun.id } : undefined;
      const next = await postSimulation(
        simulationRequest(inputs, measurementRun),
        persistence,
        controller.signal,
      );
      if (
        controller.signal.aborted ||
        generation !== requestGenerationRef.current
      ) {
        return;
      }
      onSessionChange({
        result: next,
        source: "workbench",
        linkedTestRunId: linkedRun?.id ?? null,
        inputs: { ...inputs },
      });
      simulationCompleted = true;
      if (linkedRun && selectedRunIdRef.current === linkedRun.id) {
        const refreshed = mapApiTestRun(
          await getTestRun(linkedRun.id, { signal: controller.signal }),
        );
        if (
          controller.signal.aborted ||
          generation !== requestGenerationRef.current ||
          selectedRunIdRef.current !== linkedRun.id
        ) {
          return;
        }
        onSimulationLinked(refreshed);
      }
    } catch (cause) {
      if (controller.signal.aborted) return;
      const message = cause instanceof Error ? cause.message : String(cause);
      setError(
        simulationCompleted
          ? `Simulation completed and was linked, but the Test Run revision could not be refreshed. Export, import, and delete remain blocked until the ledger is reloaded. ${message}`
          : message,
      );
    } finally {
      if (generation === requestGenerationRef.current) {
        requestRef.current = null;
        setBusy(false);
      }
    }
  }, [inputs, onSessionChange, onSimulationLinked, selectedRun]);

  const reset = useCallback(() => {
    setInputs(DEFAULT_INPUTS);
    setDraft(
      Object.fromEntries(
        FIELDS.map((field) => [field.key, String(DEFAULT_INPUTS[field.key])]),
      ),
    );
    if (session?.source === "workbench") onSessionChange(null);
    setError(null);
  }, [onSessionChange, session?.source]);

  const gate = result?.gate;
  const proposedCycle = result ? proposedCycleForDisplay(result) : null;
  const chartSeries = result
    ? chartSeriesForResult(result, session?.inputs ?? inputs)
    : null;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Workbench</Text>
      <Text style={styles.subtitle}>
        Single-zone 0D · the model service computes every result
      </Text>

      {session?.source === "canonical_fixture" ? (
        <Note>
          Summary currently holds the canonical fixture result. Run this
          Workbench to replace it with an evaluation of the inputs below.
        </Note>
      ) : null}

      <Card title="Selected Test Run">
        <Row label="Run" value={selectedRun?.name ?? "—"} />
        <Row
          label="Measurement evidence"
          value={
            mayContributeMeasurementEvidence(inputs.fixture, selectedRun)
              ? selectedRun?.status === "valid"
                ? "Eligible validated evidence"
                : "Unreviewed bubble diagnostic assumptions"
              : "Not used"
          }
        />
        <Note>
          {selectedRun?.persisted
            ? "The successful evaluation will be linked to this persisted run."
            : "Select a persisted run in Test Runs to link an evaluation."}
        </Note>
      </Card>

      <Card title="Inputs" subtitle="Unlisted parameters keep their defaults">
        {FIELDS.map((field) => (
          <View key={field.key} style={styles.field}>
            <Text style={styles.fieldLabel}>
              {field.label}
              {field.unit ? ` (${field.unit})` : ""}
            </Text>
            <TextInput
              style={styles.input}
              editable={!busy}
              value={draft[field.key] ?? ""}
              onChangeText={(text) => commit(field.key, text)}
              keyboardType="numbers-and-punctuation"
              inputMode="decimal"
              accessibilityLabel={field.label}
              placeholderTextColor={theme.color.textMuted}
            />
          </View>
        ))}
      </Card>

      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          style={[styles.button, busy && styles.buttonDisabled]}
          onPress={() => void run()}
          disabled={busy}
        >
          <Text style={styles.buttonText}>
            {busy ? "Running…" : "Run simulation"}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          style={styles.buttonGhost}
          onPress={reset}
          disabled={busy}
        >
          <Text style={styles.buttonGhostText}>Reset</Text>
        </Pressable>
      </View>

      {error ? (
        <Card
          title={
            error.startsWith("Simulation completed")
              ? "Test Run refresh failed"
              : "Simulation failed"
          }
        >
          <Text style={styles.errorText}>{error}</Text>
          <Note>
            The model service must be running on the host. This app is
            simulator/emulator only.
          </Note>
        </Card>
      ) : null}

      {gate ? (
        <Card title="Result">
          <Badge
            tone={gate.passed === true ? "pass" : "fail"}
            label={gate.passed === true ? "PASSED" : "FAILED"}
          />
          <Row
            label="H2 available"
            value={formatWithUnit(gate.hydrogen_available?.value, "mg/cyc", 3)}
          />
          <Row
            label="H2 required"
            value={formatWithUnit(gate.hydrogen_required?.value, "mg/cyc", 3)}
          />
          <Row
            label="Mass margin"
            value={formatWithUnit(
              gate.hydrogen_mass_margin_mg_per_cycle,
              "mg/cyc",
              3,
            )}
          />
          {/* A passing gate reports the "pass" sentinel in `failures`; render it
              and a PASSED badge grows a red "Pass" bullet underneath it. */}
          {visibleFailureCodes(gate.failures).map((code) => (
            <Text key={String(code)} style={styles.failureItem}>
              • {humanizeFailureCode(String(code))}
            </Text>
          ))}
          <Note>
            {proposedCycle
              ? "Proposed reactive cycle available."
              : "No proposed reactive cycle — motored baseline only."}
          </Note>
        </Card>
      ) : null}

      {chartSeries ? (
        <Card
          title="Decision-relevant cycle views"
          subtitle="Homogeneous single-zone 0D evidence — not spatial or CFD output"
        >
          <TraceChart
            title="Pressure comparison"
            description="Scalar pressure versus crank angle; shaded regions are reported 95% uncertainty, not spatial variation"
            series={chartSeries.pressure}
            xUnit="crank-angle degrees"
            yUnit="bar"
          />
          <TraceChart
            title="Temperature comparison"
            description="Scalar temperature versus crank angle; shaded regions are reported 95% uncertainty, not a temperature field"
            series={chartSeries.temperature}
            xUnit="crank-angle degrees"
            yUnit="K"
          />
          <Note>
            {chartSeries.pressure.some((series) =>
              series.points.some(
                (point) => point.low !== undefined && point.high !== undefined,
              ),
            )
              ? "Available 95% uncertainty intervals are shaded."
              : "Uncertainty bands are unavailable; none are inferred from scalar inputs."}
          </Note>
          <TraceChart
            title="Heat terms"
            series={chartSeries.heat}
            xUnit="crank-angle degrees"
            yUnit="J/degree"
          />
          <TraceChart
            title="Pressure-volume path"
            description="Homogeneous single-zone 0D thermodynamic loop; not a cylinder map or CFD field"
            series={chartSeries.pv}
            xUnit="cm³"
            yUnit="bar"
          />
        </Card>
      ) : null}

      {result && !chartSeries ? (
        <Card title="Cycle views unavailable">
          <Note>
            The response did not contain complete aligned cycle arrays. Missing
            values are not plotted as zero.
          </Note>
        </Card>
      ) : null}

      {chartSeries ? (
        <Card
          title="Sensitivity"
          subtitle="Normalized one-at-a-time influence — not a confidence score"
        >
          {chartSeries.sensitivities.length > 0 ? (
            chartSeries.sensitivities.map((series) => (
              <Row
                key={series.id}
                label={series.label}
                value={series.points[1]!.value.toFixed(2)}
              />
            ))
          ) : (
            <Note>
              Sensitivity data unavailable; zero influence is not assumed.
            </Note>
          )}
        </Card>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.color.background },
  content: { padding: theme.space.md, paddingBottom: theme.space.xl * 2 },
  title: { color: theme.color.text, fontSize: 28, fontWeight: "700" },
  subtitle: {
    color: theme.color.textMuted,
    fontSize: 13,
    marginTop: theme.space.xs,
  },
  field: { marginBottom: theme.space.sm },
  fieldLabel: {
    color: theme.color.textMuted,
    fontSize: 12,
    marginBottom: theme.space.xs,
  },
  input: {
    backgroundColor: theme.color.surfaceRaised,
    borderRadius: theme.radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.color.border,
    color: theme.color.text,
    paddingHorizontal: theme.space.sm + 2,
    paddingVertical: theme.space.sm,
    fontSize: 15,
    fontVariant: ["tabular-nums"],
  },
  actions: {
    flexDirection: "row",
    gap: theme.space.sm,
    marginTop: theme.space.md,
  },
  button: {
    flex: 1,
    backgroundColor: theme.color.accent,
    borderRadius: theme.radius.md,
    paddingVertical: theme.space.md - 2,
    alignItems: "center",
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: theme.color.background, fontWeight: "700" },
  buttonGhost: {
    borderRadius: theme.radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.color.border,
    paddingVertical: theme.space.md - 2,
    paddingHorizontal: theme.space.lg,
    alignItems: "center",
  },
  buttonGhostText: { color: theme.color.textMuted, fontWeight: "600" },
  failureItem: {
    color: theme.color.fail,
    fontSize: 13,
    marginTop: 2,
  },
  errorText: { color: theme.color.fail, fontSize: 12 },
});
