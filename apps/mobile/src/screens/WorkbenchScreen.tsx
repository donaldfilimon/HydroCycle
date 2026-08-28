import { DEFAULT_INPUTS, simulationRequest } from "@hydrocycle/view-model";
import type { WorkbenchInputs } from "@hydrocycle/view-model";
import { useCallback, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { postSimulation, type ApiSimulationResult } from "../api";
import { Badge, Card, Note, Row } from "../components/ui";
import { TraceChart } from "../components/TraceChart";
import {
  formatWithUnit,
  humanizeFailureCode,
  visibleFailureCodes,
} from "../format";
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

export default function WorkbenchScreen() {
  const [inputs, setInputs] = useState<WorkbenchInputs>(DEFAULT_INPUTS);
  const [draft, setDraft] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      FIELDS.map((field) => [field.key, String(DEFAULT_INPUTS[field.key])]),
    ),
  );
  const [result, setResult] = useState<ApiSimulationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const commit = useCallback((key: FieldKey, text: string) => {
    setDraft((previous) => ({ ...previous, [key]: text }));
    const parsed = Number(text);
    // An unparseable entry leaves the committed input untouched rather than
    // silently becoming 0 — invariant 3 applies to what we send, not just to
    // what we display.
    if (text.trim() !== "" && Number.isFinite(parsed)) {
      setInputs((previous) => ({ ...previous, [key]: parsed }));
    }
  }, []);

  const run = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      setResult(await postSimulation(simulationRequest(inputs)));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      setResult(null);
    } finally {
      setBusy(false);
    }
  }, [inputs]);

  const reset = useCallback(() => {
    setInputs(DEFAULT_INPUTS);
    setDraft(
      Object.fromEntries(
        FIELDS.map((field) => [field.key, String(DEFAULT_INPUTS[field.key])]),
      ),
    );
    setResult(null);
    setError(null);
  }, []);

  const gate = result?.gate;

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

      <Card title="Inputs" subtitle="Unlisted parameters keep their defaults">
        {FIELDS.map((field) => (
          <View key={field.key} style={styles.field}>
            <Text style={styles.fieldLabel}>
              {field.label}
              {field.unit ? ` (${field.unit})` : ""}
            </Text>
            <TextInput
              style={styles.input}
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
        <Card title="Simulation failed">
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
            {result?.proposed_cycle
              ? "Proposed reactive cycle available."
              : "No proposed reactive cycle — motored baseline only."}
          </Note>
        </Card>
      ) : null}

      {result ? (
        <Card
          title="Homogeneous cycle traces"
          subtitle="Scalar 0D state versus crank angle — not CFD"
        >
          <TraceChart
            title="Motored baseline pressure"
            x={result.motored_baseline.crank_angle_deg}
            values={result.motored_baseline.pressure_pa.map(
              (pressure) => pressure / 100_000,
            )}
            unit="bar"
          />
          <TraceChart
            title="Motored baseline temperature"
            x={result.motored_baseline.crank_angle_deg}
            values={result.motored_baseline.temperature_k}
            unit="K"
            color={theme.color.warn}
          />
          {result.proposed_cycle ? (
            <>
              <TraceChart
                title="Proposed cycle pressure"
                x={result.proposed_cycle.crank_angle_deg}
                values={result.proposed_cycle.pressure_pa.map(
                  (pressure) => pressure / 100_000,
                )}
                unit="bar"
                color={theme.color.pass}
              />
              <TraceChart
                title="Proposed cycle temperature"
                x={result.proposed_cycle.crank_angle_deg}
                values={result.proposed_cycle.temperature_k}
                unit="K"
                color={theme.color.pass}
              />
            </>
          ) : null}
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
