import { useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  mapApiTestRun,
  testRunPatchPayload,
  type TestRunStatus,
  type TestRunView,
} from "@hydrocycle/view-model";

import { getTestRun, patchTestRun } from "../api";
import {
  draftFor,
  editedRunFor,
  mergeTestRunEdit,
  SCALAR_FIELDS,
  TEXT_FIELDS,
  type ScalarKey,
  type TextFieldKey,
} from "../test-run-editor-model";
import { theme } from "../theme";
import { Card, Note } from "./ui";

interface TestRunEditorProps {
  run: TestRunView;
  onSaved: (run: TestRunView) => void;
  onDirtyChange: (dirty: boolean) => void;
  onSavingChange: (saving: boolean) => void;
}

export default function TestRunEditor({
  run,
  onSaved,
  onDirtyChange,
  onSavingChange,
}: TestRunEditorProps) {
  const [draft, setDraft] = useState(() => draftFor(run));
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const markDirty = () => {
    if (!dirty) {
      setDirty(true);
      onDirtyChange(true);
    }
    setError(null);
  };

  const updateText = (key: TextFieldKey, value: string) => {
    markDirty();
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const updateScalar = (
    collection: "values" | "uncertainties",
    key: ScalarKey,
    value: string,
  ) => {
    markDirty();
    setDraft((current) => ({
      ...current,
      [collection]: { ...current[collection], [key]: value },
    }));
  };

  const discard = () => {
    setDraft(draftFor(run));
    setError(null);
    setDirty(false);
    onDirtyChange(false);
  };

  const confirmDiscard = () => {
    if (!dirty) return;
    Alert.alert("Discard Test Run edits?", "Unsaved changes will be lost.", [
      { text: "Cancel", style: "cancel" },
      { text: "Discard", style: "destructive", onPress: discard },
    ]);
  };

  const save = async (status: TestRunStatus) => {
    setError(null);
    let edited: TestRunView;
    let started = false;
    try {
      edited = editedRunFor(run, draft, status);
      started = true;
      setSaving(true);
      onSavingChange(true);
      const latest = mapApiTestRun(await getTestRun(run.id));
      const merged = mergeTestRunEdit(run, edited, latest);
      const persisted = mapApiTestRun(
        await patchTestRun(run.id, testRunPatchPayload(merged)),
      );
      setDraft(draftFor(persisted));
      setDirty(false);
      onDirtyChange(false);
      onSaved(persisted);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setSaving(false);
      if (started) onSavingChange(false);
    }
  };

  return (
    <Card title="Edit selected run" subtitle={`Current status: ${run.status}`}>
      {TEXT_FIELDS.map(({ key, label }) => (
        <View key={key} style={styles.field}>
          <Text style={styles.label}>{label}</Text>
          <TextInput
            accessibilityLabel={label}
            style={[styles.input, key === "reviewNotes" && styles.notes]}
            value={draft[key]}
            onChangeText={(value) => updateText(key, value)}
            multiline={key === "reviewNotes"}
            placeholder={key === "name" ? "Required" : "Blank stores null"}
            placeholderTextColor={theme.color.textMuted}
          />
        </View>
      ))}

      {SCALAR_FIELDS.map(({ key, label, unit }) => (
        <View key={key} style={styles.scalarGroup}>
          <Text style={styles.scalarTitle}>
            {label} ({unit})
          </Text>
          <View style={styles.scalarRow}>
            <View style={styles.scalarField}>
              <Text style={styles.label}>Value</Text>
              <TextInput
                accessibilityLabel={`${label} value`}
                style={styles.input}
                value={draft.values[key]}
                onChangeText={(value) => updateScalar("values", key, value)}
                keyboardType="numbers-and-punctuation"
                inputMode="decimal"
                placeholder="null"
                placeholderTextColor={theme.color.textMuted}
              />
            </View>
            <View style={styles.scalarField}>
              <Text style={styles.label}>Standard uncertainty</Text>
              <TextInput
                accessibilityLabel={`${label} standard uncertainty`}
                style={styles.input}
                value={draft.uncertainties[key]}
                onChangeText={(value) =>
                  updateScalar("uncertainties", key, value)
                }
                keyboardType="numbers-and-punctuation"
                inputMode="decimal"
                placeholder="required when set"
                placeholderTextColor={theme.color.textMuted}
              />
            </View>
          </View>
        </View>
      ))}

      <View style={styles.derivedField}>
        <Text style={styles.scalarTitle}>
          Retention fraction (
          {run.sourceMeasurements?.retention_fraction ? "measured" : "derived"})
        </Text>
        <Text style={styles.derivedValue}>
          {run.retentionFraction === null
            ? "Not computable"
            : String(run.retentionFraction)}
        </Text>
        <Text style={styles.label}>
          {run.sourceMeasurements?.retention_fraction
            ? "Recorded independently with its original uncertainty and provenance."
            : "Computed from retained and total H2; not stored as an independent measurement."}
        </Text>
      </View>

      {error ? (
        <Text accessibilityLiveRegion="polite" style={styles.error}>
          {error}
        </Text>
      ) : null}
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          style={[styles.button, saving && styles.disabled]}
          disabled={saving}
          onPress={() => void save(run.status)}
        >
          <Text style={styles.buttonText}>{saving ? "Saving…" : "Save"}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          style={[styles.validateButton, saving && styles.disabled]}
          disabled={saving}
          onPress={() => void save("valid")}
        >
          <Text style={styles.validateText}>Validate as valid</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          style={styles.ghostButton}
          disabled={saving}
          onPress={confirmDiscard}
        >
          <Text style={styles.ghostText}>Cancel edits</Text>
        </Pressable>
      </View>
      <Note>
        Save preserves the current status. Validation is explicit and remains
        subject to server-side evidence checks.
      </Note>
    </Card>
  );
}

const styles = StyleSheet.create({
  field: { marginBottom: theme.space.sm },
  label: {
    color: theme.color.textMuted,
    fontSize: 12,
    marginBottom: theme.space.xs,
  },
  input: {
    backgroundColor: theme.color.surfaceRaised,
    borderColor: theme.color.border,
    borderRadius: theme.radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    color: theme.color.text,
    fontSize: 15,
    fontVariant: ["tabular-nums"],
    paddingHorizontal: theme.space.sm + 2,
    paddingVertical: theme.space.sm,
  },
  notes: { minHeight: 72, textAlignVertical: "top" },
  scalarGroup: {
    borderTopColor: theme.color.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: theme.space.sm,
    paddingTop: theme.space.sm,
  },
  scalarTitle: { color: theme.color.text, fontSize: 14, fontWeight: "600" },
  scalarRow: {
    flexDirection: "row",
    gap: theme.space.sm,
    marginTop: theme.space.sm,
  },
  scalarField: { flex: 1 },
  derivedField: {
    borderTopColor: theme.color.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: theme.space.sm,
    paddingTop: theme.space.sm,
  },
  derivedValue: {
    color: theme.color.text,
    fontSize: 15,
    fontVariant: ["tabular-nums"],
    marginBottom: theme.space.xs,
    marginTop: theme.space.xs,
  },
  error: { color: theme.color.fail, fontSize: 13, marginTop: theme.space.md },
  actions: { gap: theme.space.sm, marginTop: theme.space.md },
  button: {
    alignItems: "center",
    backgroundColor: theme.color.accent,
    borderRadius: theme.radius.md,
    paddingVertical: theme.space.md - 2,
  },
  buttonText: { color: theme.color.background, fontWeight: "700" },
  validateButton: {
    alignItems: "center",
    borderColor: theme.color.pass,
    borderRadius: theme.radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: theme.space.md - 2,
  },
  validateText: { color: theme.color.pass, fontWeight: "700" },
  ghostButton: {
    alignItems: "center",
    borderColor: theme.color.border,
    borderRadius: theme.radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: theme.space.md - 2,
  },
  ghostText: { color: theme.color.textMuted, fontWeight: "600" },
  disabled: { opacity: 0.6 },
});
