import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  mapApiTestRun,
  testRunPayload,
  type TestRunView,
} from "@hydrocycle/view-model";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";

import {
  createTestRun,
  deleteTestRun,
  downloadTestRunExport,
  getTestRuns,
  importTestRunFile,
} from "../api";
import TestRunDetail from "../components/TestRunDetail";
import TestRunEditor from "../components/TestRunEditor";
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

interface ScreenError {
  title: string;
  message: string;
}

function messageFor(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause);
}

async function removePickerCacheCopy(uri: string): Promise<void> {
  const cacheDirectory = FileSystem.cacheDirectory;
  if (!cacheDirectory || !uri.startsWith(cacheDirectory)) return;
  await FileSystem.deleteAsync(uri, { idempotent: true }).catch(
    () => undefined,
  );
}

interface TestRunsScreenProps {
  selectedRun: TestRunView | null;
  onSelectedRunChange: (run: TestRunView | null) => void;
  onDirtyChange?: (dirty: boolean) => void;
  onBusyChange?: (busy: boolean) => void;
}

export default function TestRunsScreen({
  selectedRun,
  onSelectedRunChange,
  onDirtyChange = () => undefined,
  onBusyChange = () => undefined,
}: TestRunsScreenProps) {
  const [runs, setRuns] = useState<TestRunView[] | null>(null);
  const [error, setError] = useState<ScreenError | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [operation, setOperation] = useState<string | null>(null);
  const [editorDirty, setEditorDirty] = useState(false);
  const [editorSaving, setEditorSaving] = useState(false);
  const loadGenerationRef = useRef(0);
  const loadControllerRef = useRef<AbortController | null>(null);
  const selectedRunIdRef = useRef(selectedRun?.id ?? null);
  selectedRunIdRef.current = selectedRun?.id ?? null;

  const load = useCallback(
    async (signal?: AbortSignal) => {
      const generation = ++loadGenerationRef.current;
      setLoading(true);
      setError(null);
      try {
        const next = (await getTestRuns(signal)).map(mapApiTestRun);
        if (signal?.aborted || generation !== loadGenerationRef.current) return;
        setRuns(next);
        const selectedRunId = selectedRunIdRef.current;
        if (selectedRunId) {
          onSelectedRunChange(
            next.find((run) => run.id === selectedRunId) ?? null,
          );
        }
      } catch (cause) {
        if (signal?.aborted || generation !== loadGenerationRef.current) return;
        setError({
          title: "Cannot load Test Runs",
          message: messageFor(cause),
        });
        setRuns(null);
      } finally {
        if (generation === loadGenerationRef.current) setLoading(false);
      }
    },
    [onSelectedRunChange],
  );

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
      const view = mapApiTestRun(created);
      setRuns((previous) => [view, ...(previous ?? [])]);
      onSelectedRunChange(view);
    } catch (cause) {
      setError({
        title: "Cannot create draft",
        message: messageFor(cause),
      });
    } finally {
      setCreating(false);
    }
  }, [onSelectedRunChange]);

  const startLoad = useCallback(() => {
    loadControllerRef.current?.abort();
    const controller = new AbortController();
    loadControllerRef.current = controller;
    void load(controller.signal);
  }, [load]);

  const invalidateLoad = useCallback(() => {
    loadControllerRef.current?.abort();
    loadControllerRef.current = null;
    loadGenerationRef.current += 1;
    setLoading(false);
  }, []);

  useEffect(() => {
    startLoad();
    return () => loadControllerRef.current?.abort();
  }, [startLoad]);

  useEffect(() => {
    const busy = creating || editorSaving || operation !== null;
    onBusyChange(busy);
  }, [creating, editorSaving, onBusyChange, operation]);

  useEffect(() => () => onBusyChange(false), [onBusyChange]);

  const setDirty = useCallback(
    (dirty: boolean) => {
      if (dirty) invalidateLoad();
      setEditorDirty(dirty);
      onDirtyChange(dirty);
    },
    [invalidateLoad, onDirtyChange],
  );

  const setSaving = useCallback(
    (saving: boolean) => {
      if (saving) invalidateLoad();
      setEditorSaving(saving);
      onBusyChange(saving || creating || operation !== null);
    },
    [creating, invalidateLoad, onBusyChange, operation],
  );

  const selectRun = useCallback(
    (run: TestRunView) => {
      if (loading || creating || editorSaving || operation !== null) {
        Alert.alert(
          "Test Run operation in progress",
          "Wait for the server-authoritative response before changing selection.",
        );
        return;
      }
      if (!editorDirty || selectedRun?.id === run.id) {
        onSelectedRunChange(run);
        return;
      }
      Alert.alert("Discard Test Run edits?", "Unsaved changes will be lost.", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Discard",
          style: "destructive",
          onPress: () => {
            setDirty(false);
            onSelectedRunChange(run);
          },
        },
      ]);
    },
    [
      creating,
      editorDirty,
      editorSaving,
      loading,
      onSelectedRunChange,
      operation,
      selectedRun?.id,
      setDirty,
    ],
  );

  const acceptSavedRun = useCallback(
    (saved: TestRunView) => {
      setRuns(
        (current) =>
          current?.map((run) => (run.id === saved.id ? saved : run)) ?? [saved],
      );
      onSelectedRunChange(saved);
    },
    [onSelectedRunChange],
  );

  const duplicateSelected = useCallback(async () => {
    if (!selectedRun || editorDirty) return;
    invalidateLoad();
    setOperation("Duplicating run…");
    setError(null);
    try {
      const duplicate: TestRunView = {
        ...selectedRun,
        id: `mobile-copy-${Date.now()}`,
        name: `${selectedRun.name} copy`,
        status: "draft",
        timestamp: new Date().toISOString(),
        persisted: false,
        attachmentHashes: [],
        simulationIds: [],
        comparisons: { items: [] },
        testRunEvidence: [],
        provenance: {
          ...selectedRun.provenance,
          source: "HydroCycle mobile duplicate",
          source_test_run_id: selectedRun.id,
          import_sha256: null,
          is_demo_synthetic: false,
        },
      };
      const persisted = mapApiTestRun(
        await createTestRun(testRunPayload(duplicate)),
      );
      setRuns((current) => [persisted, ...(current ?? [])]);
      onSelectedRunChange(persisted);
    } catch (cause) {
      setError({
        title: "Cannot duplicate Test Run",
        message: messageFor(cause),
      });
    } finally {
      setOperation(null);
    }
  }, [editorDirty, invalidateLoad, onSelectedRunChange, selectedRun]);

  const importFile = useCallback(async () => {
    if (editorDirty) return;
    setError(null);
    let result: DocumentPicker.DocumentPickerResult;
    try {
      result = await DocumentPicker.getDocumentAsync({
        type: ["application/json", "text/csv", "text/comma-separated-values"],
        copyToCacheDirectory: true,
        multiple: false,
      });
    } catch (cause) {
      setError({
        title: "Cannot open local file",
        message: messageFor(cause),
      });
      return;
    }
    if (result.canceled) return;
    const file = result.assets[0];
    if (!file) {
      setError({
        title: "Cannot open local file",
        message: "The document picker did not return a readable file.",
      });
      return;
    }
    const csv = file.name.toLowerCase().endsWith(".csv");
    if (csv && (!selectedRun?.persisted || !selectedRun.calibrationReference)) {
      setError({
        title: "Cannot import local file",
        message:
          "CSV import requires a selected persisted run with a saved calibration reference.",
      });
      await removePickerCacheCopy(file.uri);
      return;
    }
    setOperation("Validating and importing…");
    invalidateLoad();
    try {
      const response = await importTestRunFile(file, {
        ...(csv ? { testRunId: selectedRun?.id } : {}),
        ...(csv
          ? {
              calibrationReference:
                selectedRun?.calibrationReference ?? undefined,
            }
          : {}),
      });
      const persisted = mapApiTestRun(response.test_run);
      setRuns((current) => [
        persisted,
        ...(current ?? []).filter((run) => run.id !== persisted.id),
      ]);
      onSelectedRunChange(persisted);
    } catch (cause) {
      setError({
        title: "Cannot import local file",
        message: messageFor(cause),
      });
    } finally {
      setOperation(null);
      await removePickerCacheCopy(file.uri);
    }
  }, [editorDirty, invalidateLoad, onSelectedRunChange, selectedRun]);

  const exportSelected = useCallback(async () => {
    if (!selectedRun?.persisted || editorDirty) return;
    invalidateLoad();
    setOperation("Preparing canonical export…");
    setError(null);
    let uri: string | null = null;
    try {
      if (!(await Sharing.isAvailableAsync())) {
        throw new Error("Native file sharing is unavailable.");
      }
      uri = await downloadTestRunExport(selectedRun.id);
      await Sharing.shareAsync(uri, {
        mimeType: "application/json",
        UTI: "public.json",
        dialogTitle: `Export ${selectedRun.name}`,
      });
    } catch (cause) {
      setError({
        title: "Cannot export Test Run",
        message: messageFor(cause),
      });
    } finally {
      setOperation(null);
      if (uri) {
        await FileSystem.deleteAsync(uri, { idempotent: true }).catch(
          () => undefined,
        );
      }
    }
  }, [editorDirty, invalidateLoad, selectedRun]);

  const confirmDeleteSelected = useCallback(() => {
    if (!selectedRun?.persisted || editorDirty) return;
    Alert.alert(
      `Delete “${selectedRun.name}”?`,
      "This permanently removes the local Test Run, its database references, and HydroCycle-owned attachment copies. Source files outside HydroCycle are never deleted.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Test Run",
          style: "destructive",
          onPress: () => {
            invalidateLoad();
            setOperation("Deleting run…");
            setError(null);
            void deleteTestRun(selectedRun.id)
              .then((result) => {
                setRuns((current) =>
                  (current ?? []).filter((run) => run.id !== result.testRunId),
                );
                if (selectedRunIdRef.current === result.testRunId) {
                  onSelectedRunChange(null);
                }
                if (result.ownedAttachmentCleanupFailures > 0) {
                  setError({
                    title: "Deletion completed with cleanup errors",
                    message: `Run deleted, but ${result.ownedAttachmentCleanupFailures} locally owned attachment could not be removed.`,
                  });
                }
              })
              .catch((cause: unknown) =>
                setError({
                  title: "Cannot delete Test Run",
                  message: messageFor(cause),
                }),
              )
              .finally(() => setOperation(null));
          },
        },
      ],
    );
  }, [editorDirty, invalidateLoad, onSelectedRunChange, selectedRun]);

  // Demo/synthetic runs are excluded from the measurement count, matching the
  // web client — a bundled fixture is not evidence of a measurement.
  const measured = (runs ?? []).filter(
    (run) => !run.synthetic && run.measurementDatasetCount > 0,
  );
  const syntheticCount = (runs ?? []).filter((run) => run.synthetic).length;
  const unmeasuredCount =
    (runs?.length ?? 0) - measured.length - syntheticCount;
  const busy =
    loading || creating || operation !== null || editorDirty || editorSaving;
  const selectionLocked =
    loading || creating || operation !== null || editorSaving;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={loading}
          enabled={
            !creating && !editorDirty && !editorSaving && operation === null
          }
          onRefresh={() => {
            if (
              !creating &&
              !editorDirty &&
              !editorSaving &&
              operation === null
            ) {
              startLoad();
            }
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

      <View style={styles.operationRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityHint="Choose a canonical local HydroCycle JSON or CSV file"
          style={[styles.operationButton, busy && styles.createButtonDisabled]}
          disabled={busy}
          onPress={() => void importFile()}
        >
          <Text style={styles.operationText}>Import</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          style={[styles.operationButton, busy && styles.createButtonDisabled]}
          disabled={busy || !selectedRun?.persisted || selectedRun.synthetic}
          onPress={() => void exportSelected()}
        >
          <Text style={styles.operationText}>Export</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          style={[styles.operationButton, busy && styles.createButtonDisabled]}
          disabled={busy || !selectedRun?.persisted || selectedRun.synthetic}
          onPress={() => void duplicateSelected()}
        >
          <Text style={styles.operationText}>Duplicate</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Delete selected Test Run"
          accessibilityHint="Opens a confirmation before deleting local persisted data"
          style={[styles.deleteButton, busy && styles.createButtonDisabled]}
          disabled={busy || !selectedRun?.persisted || selectedRun.synthetic}
          onPress={confirmDeleteSelected}
        >
          <Text style={styles.deleteText}>Delete</Text>
        </Pressable>
      </View>
      {operation ? (
        <Text accessibilityLiveRegion="polite" style={styles.operationStatus}>
          {operation}
        </Text>
      ) : null}

      {loading && !runs ? (
        <ActivityIndicator color={theme.color.accent} style={styles.spinner} />
      ) : null}

      {error ? (
        <Card title={error.title}>
          <Text accessibilityLiveRegion="polite" style={styles.errorText}>
            {error.message}
          </Text>
          {error.title === "Cannot load Test Runs" ? (
            <Note>
              Start it with `bun run dev` on the host. This app is
              simulator/emulator only.
            </Note>
          ) : null}
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
              {run.synthetic ? " · synthetic demo" : ""}
            </Text>
          </View>
          <Row label="Sample" value={formatText(run.sampleId)} />
          <Row label="Updated" value={formatTimestamp(run.timestamp)} />
          <Pressable
            accessibilityRole="radio"
            accessibilityLabel={`Select ${run.name}`}
            accessibilityState={{
              selected: selectedRun?.id === run.id,
              disabled: selectionLocked,
            }}
            disabled={selectionLocked}
            style={[
              styles.selectButton,
              selectionLocked && styles.createButtonDisabled,
            ]}
            onPress={() => selectRun(run)}
          >
            <Text style={styles.selectButtonText}>
              {selectedRun?.id === run.id ? "Selected" : "Select run"}
            </Text>
          </Pressable>
        </Card>
      ))}

      {selectedRun ? <TestRunDetail run={selectedRun} /> : null}
      {selectedRun?.persisted && !selectedRun.synthetic ? (
        <TestRunEditor
          key={`${selectedRun.id}:${selectedRun.timestamp}`}
          run={selectedRun}
          onSaved={acceptSavedRun}
          onDirtyChange={setDirty}
          onSavingChange={setSaving}
        />
      ) : null}

      <Note>
        Files stay local. Imports are limited to 2 MiB and validated by the
        model service. CSV series attach to the selected run and require a saved
        calibration reference; canonical JSON creates a new run.
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
  operationRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.space.sm,
    marginTop: theme.space.sm,
  },
  operationButton: {
    borderColor: theme.color.border,
    borderRadius: theme.radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: theme.space.sm,
    paddingVertical: theme.space.xs,
  },
  operationText: { color: theme.color.accent, fontWeight: "600" },
  deleteButton: {
    borderColor: theme.color.fail,
    borderRadius: theme.radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: theme.space.sm,
    paddingVertical: theme.space.xs,
  },
  deleteText: { color: theme.color.fail, fontWeight: "600" },
  operationStatus: {
    color: theme.color.textMuted,
    fontSize: 12,
    marginTop: theme.space.sm,
  },
  selectButton: {
    alignSelf: "flex-start",
    borderColor: theme.color.border,
    borderRadius: theme.radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: theme.space.sm,
    paddingHorizontal: theme.space.sm,
    paddingVertical: theme.space.xs,
  },
  selectButtonText: { color: theme.color.accent, fontWeight: "600" },
});
