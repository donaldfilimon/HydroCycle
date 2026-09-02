import type { TestRunStatus, TestRunView } from "@hydrocycle/view-model";

export type ScalarKey =
  | "totalH2MgL"
  | "retainedH2MgL"
  | "releasedH2MgL"
  | "unaccountedH2MgL"
  | "temperatureC"
  | "pressureKpa"
  | "elapsedS"
  | "bubbleDiameterNm"
  | "numberPerMl";

export const SCALAR_FIELDS: readonly {
  key: ScalarKey;
  label: string;
  unit: string;
}[] = [
  { key: "totalH2MgL", label: "Total H2", unit: "mg/L" },
  { key: "retainedH2MgL", label: "Retained H2", unit: "mg/L" },
  { key: "releasedH2MgL", label: "Released H2", unit: "mg/L" },
  { key: "unaccountedH2MgL", label: "Unaccounted H2", unit: "mg/L" },
  { key: "temperatureC", label: "Temperature", unit: "°C" },
  { key: "pressureKpa", label: "Pressure", unit: "kPa" },
  { key: "elapsedS", label: "Elapsed", unit: "s" },
  { key: "bubbleDiameterNm", label: "Bubble diameter", unit: "nm" },
  { key: "numberPerMl", label: "Bubble number", unit: "1/mL" },
];

export const TEXT_FIELDS = [
  { key: "name", label: "Name" },
  { key: "operator", label: "Operator" },
  { key: "sampleId", label: "Sample" },
  { key: "method", label: "Method" },
  { key: "calibrationReference", label: "Calibration reference" },
  { key: "reviewNotes", label: "Notes" },
] as const;

export type TextFieldKey = (typeof TEXT_FIELDS)[number]["key"];

export interface EditorDraft {
  name: string;
  operator: string;
  sampleId: string;
  method: string;
  calibrationReference: string;
  reviewNotes: string;
  values: Record<ScalarKey, string>;
  uncertainties: Record<ScalarKey, string>;
}

function inputText(value: string | number | null): string {
  return value === null ? "" : String(value);
}

export function draftFor(run: TestRunView): EditorDraft {
  return {
    name: run.name,
    operator: inputText(run.operator),
    sampleId: inputText(run.sampleId),
    method: inputText(run.method),
    calibrationReference: inputText(run.calibrationReference),
    reviewNotes: inputText(run.reviewNotes),
    values: Object.fromEntries(
      SCALAR_FIELDS.map(({ key }) => [key, inputText(run[key])]),
    ) as Record<ScalarKey, string>,
    uncertainties: Object.fromEntries(
      SCALAR_FIELDS.map(({ key }) => [
        key,
        inputText(run.standardUncertainty[key]),
      ]),
    ) as Record<ScalarKey, string>,
  };
}

export function nullableFiniteNumber(text: string): number | null {
  if (!text.trim()) return null;
  const value = Number(text);
  if (!Number.isFinite(value)) {
    throw new Error(`Invalid numeric value: ${text}`);
  }
  return value;
}

function nullableText(text: string): string | null {
  const value = text.trim();
  return value ? value : null;
}

function parseScalars(
  draft: EditorDraft,
  collection: "values" | "uncertainties",
): Record<ScalarKey, number | null> {
  return Object.fromEntries(
    SCALAR_FIELDS.map(({ key, label }) => {
      try {
        return [key, nullableFiniteNumber(draft[collection][key])];
      } catch {
        const suffix = collection === "values" ? "" : " standard uncertainty";
        throw new Error(`${label}${suffix} must be a finite number or blank.`);
      }
    }),
  ) as Record<ScalarKey, number | null>;
}

export function editedRunFor(
  run: TestRunView,
  draft: EditorDraft,
  status: TestRunStatus,
): TestRunView {
  if (!draft.name.trim()) throw new Error("Name is required.");
  const values = parseScalars(draft, "values");
  const uncertainties = parseScalars(draft, "uncertainties");
  for (const { key, label } of SCALAR_FIELDS) {
    if (values[key] === null && uncertainties[key] !== null) {
      throw new Error(
        `${label} standard uncertainty requires a measurement value.`,
      );
    }
  }
  const method = nullableText(draft.method);
  return {
    ...run,
    ...values,
    name: draft.name.trim(),
    operator: nullableText(draft.operator),
    sampleId: nullableText(draft.sampleId),
    method,
    calibrationReference: nullableText(draft.calibrationReference),
    reviewNotes: nullableText(draft.reviewNotes),
    status,
    provenance: { ...run.provenance, method },
    standardUncertainty: {
      ...run.standardUncertainty,
      ...uncertainties,
    },
  };
}

function changed<T>(left: T, right: T): boolean {
  return !Object.is(left, right);
}

function localOrLatest<K extends keyof TestRunView>(
  key: K,
  original: TestRunView,
  edited: TestRunView,
  latest: TestRunView,
): TestRunView[K] {
  return changed(original[key], edited[key]) ? edited[key] : latest[key];
}

function uncertaintyOrLatest(
  key: ScalarKey,
  original: TestRunView,
  edited: TestRunView,
  latest: TestRunView,
): number | null {
  return changed(
    original.standardUncertainty[key],
    edited.standardUncertainty[key],
  )
    ? edited.standardUncertainty[key]
    : latest.standardUncertainty[key];
}

export function mergeTestRunEdit(
  original: TestRunView,
  edited: TestRunView,
  latest: TestRunView,
): TestRunView {
  const conflicts: string[] = [];
  for (const { key, label } of TEXT_FIELDS) {
    if (
      changed(original[key], edited[key]) &&
      changed(original[key], latest[key]) &&
      changed(edited[key], latest[key])
    ) {
      conflicts.push(label);
    }
  }
  for (const { key, label } of SCALAR_FIELDS) {
    if (
      changed(original[key], edited[key]) &&
      changed(original[key], latest[key]) &&
      changed(edited[key], latest[key])
    ) {
      conflicts.push(`${label} value`);
    }
    if (
      changed(
        original.standardUncertainty[key],
        edited.standardUncertainty[key],
      ) &&
      changed(
        original.standardUncertainty[key],
        latest.standardUncertainty[key],
      ) &&
      changed(edited.standardUncertainty[key], latest.standardUncertainty[key])
    ) {
      conflicts.push(`${label} uncertainty`);
    }
  }
  if (
    changed(original.status, edited.status) &&
    changed(original.status, latest.status) &&
    changed(edited.status, latest.status)
  ) {
    conflicts.push("Status");
  }
  if (conflicts.length > 0) {
    throw new Error(
      `Test Run changed on the server in: ${conflicts.join(", ")}. Your edits remain unsaved; cancel them to load the latest revision.`,
    );
  }

  const method = localOrLatest("method", original, edited, latest);
  return {
    ...latest,
    name: localOrLatest("name", original, edited, latest),
    operator: localOrLatest("operator", original, edited, latest),
    sampleId: localOrLatest("sampleId", original, edited, latest),
    method,
    calibrationReference: localOrLatest(
      "calibrationReference",
      original,
      edited,
      latest,
    ),
    reviewNotes: localOrLatest("reviewNotes", original, edited, latest),
    status: localOrLatest("status", original, edited, latest),
    totalH2MgL: localOrLatest("totalH2MgL", original, edited, latest),
    retainedH2MgL: localOrLatest("retainedH2MgL", original, edited, latest),
    releasedH2MgL: localOrLatest("releasedH2MgL", original, edited, latest),
    unaccountedH2MgL: localOrLatest(
      "unaccountedH2MgL",
      original,
      edited,
      latest,
    ),
    temperatureC: localOrLatest("temperatureC", original, edited, latest),
    pressureKpa: localOrLatest("pressureKpa", original, edited, latest),
    elapsedS: localOrLatest("elapsedS", original, edited, latest),
    bubbleDiameterNm: localOrLatest(
      "bubbleDiameterNm",
      original,
      edited,
      latest,
    ),
    numberPerMl: localOrLatest("numberPerMl", original, edited, latest),
    provenance: { ...latest.provenance, method },
    standardUncertainty: {
      ...latest.standardUncertainty,
      totalH2MgL: uncertaintyOrLatest("totalH2MgL", original, edited, latest),
      retainedH2MgL: uncertaintyOrLatest(
        "retainedH2MgL",
        original,
        edited,
        latest,
      ),
      releasedH2MgL: uncertaintyOrLatest(
        "releasedH2MgL",
        original,
        edited,
        latest,
      ),
      unaccountedH2MgL: uncertaintyOrLatest(
        "unaccountedH2MgL",
        original,
        edited,
        latest,
      ),
      temperatureC: uncertaintyOrLatest(
        "temperatureC",
        original,
        edited,
        latest,
      ),
      pressureKpa: uncertaintyOrLatest("pressureKpa", original, edited, latest),
      elapsedS: uncertaintyOrLatest("elapsedS", original, edited, latest),
      bubbleDiameterNm: uncertaintyOrLatest(
        "bubbleDiameterNm",
        original,
        edited,
        latest,
      ),
      numberPerMl: uncertaintyOrLatest("numberPerMl", original, edited, latest),
    },
  };
}
