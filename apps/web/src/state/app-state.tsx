"use client";

import {
  DEFAULT_INPUTS,
  makeSimulationFixture,
  type SimulationView,
  type TestRunView,
  type WorkbenchInputs,
} from "@hydrocycle/view-model";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
} from "react";

import {
  FixtureHydroCycleDataSource,
  LocalHydroCycleDataSource,
  type HydroCycleDataSource,
} from "../data";
import type { HydroCycleRuntimeConfig } from "../lib/runtime";

interface FrozenSubmission {
  inputs: WorkbenchInputs;
  result: SimulationView;
  submittedAt: string;
}

interface AppState {
  draft: WorkbenchInputs;
  frozen: FrozenSubmission | null;
  result: SimulationView;
  running: boolean;
  error: string | null;
  selectedRunId: string | null;
  comparison: [string | null, string | null];
  advisorContextKey: number;
}

type Action =
  | { type: "patch-draft"; patch: Partial<WorkbenchInputs> }
  | { type: "reset-draft" }
  | { type: "run-start" }
  | { type: "run-success"; inputs: WorkbenchInputs; result: SimulationView }
  | { type: "run-error"; message: string }
  | { type: "select-run"; id: string | null }
  | { type: "toggle-compare"; id: string }
  | { type: "reset-advisor" };

function initialState(): AppState {
  const result = makeSimulationFixture(DEFAULT_INPUTS.fixture, DEFAULT_INPUTS);
  return {
    draft: { ...DEFAULT_INPUTS },
    frozen: null,
    result,
    running: false,
    error: null,
    selectedRunId: null,
    comparison: [null, null],
    advisorContextKey: 0,
  };
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "patch-draft":
      return {
        ...state,
        draft: { ...state.draft, ...action.patch },
        error: null,
      };
    case "reset-draft":
      return {
        ...state,
        draft: { ...DEFAULT_INPUTS },
        error: null,
        advisorContextKey: state.advisorContextKey + 1,
      };
    case "run-start":
      return { ...state, running: true, error: null };
    case "run-success":
      return {
        ...state,
        running: false,
        result: action.result,
        frozen: {
          inputs: { ...action.inputs },
          result: action.result,
          submittedAt: new Date().toISOString(),
        },
        advisorContextKey: state.advisorContextKey + 1,
      };
    case "run-error":
      return { ...state, running: false, error: action.message };
    case "select-run":
      return {
        ...state,
        selectedRunId: action.id,
        advisorContextKey: state.advisorContextKey + 1,
      };
    case "toggle-compare": {
      const [base, candidate] = state.comparison;
      const comparison: [string | null, string | null] =
        base === action.id
          ? [candidate, null]
          : candidate === action.id
            ? [base, null]
            : base === null
              ? [action.id, candidate]
              : candidate === null
                ? [base, action.id]
                : [candidate, action.id];
      return {
        ...state,
        comparison,
        advisorContextKey: state.advisorContextKey + 1,
      };
    }
    case "reset-advisor":
      return { ...state, advisorContextKey: state.advisorContextKey + 1 };
  }
}

interface AppContextValue {
  runtime: HydroCycleRuntimeConfig;
  dataSource: HydroCycleDataSource;
  state: AppState;
  dispatch: Dispatch<Action>;
  runSimulation: (
    persistToTestRunId?: string,
    inputOverride?: WorkbenchInputs,
  ) => Promise<void>;
  cancelSimulation: () => void;
  isDraftStale: boolean;
  selectedRuns: (runs: TestRunView[]) => TestRunView[];
}

const AppContext = createContext<AppContextValue | null>(null);

function AppStateProvider({
  runtime,
  children,
}: {
  runtime: HydroCycleRuntimeConfig;
  children: ReactNode;
}) {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const dataSource = useMemo<HydroCycleDataSource>(
    () =>
      runtime.mode === "local"
        ? new LocalHydroCycleDataSource()
        : new FixtureHydroCycleDataSource(),
    [runtime.mode],
  );
  const controller = useRef<AbortController | null>(null);

  const runSimulation = useCallback(
    async (persistToTestRunId?: string, inputOverride?: WorkbenchInputs) => {
      controller.current?.abort();
      const active = new AbortController();
      controller.current = active;
      const submitted = { ...(inputOverride ?? state.draft) };
      dispatch({ type: "run-start" });
      try {
        const result = await dataSource.simulate(submitted, {
          signal: active.signal,
          persistToTestRunId,
        });
        if (!active.signal.aborted)
          dispatch({ type: "run-success", inputs: submitted, result });
      } catch (error) {
        if (!active.signal.aborted) {
          dispatch({
            type: "run-error",
            message:
              error instanceof Error ? error.message : "Simulation failed.",
          });
        }
      } finally {
        if (controller.current === active) controller.current = null;
      }
    },
    [dataSource, state.draft],
  );

  const isDraftStale = useMemo(
    () =>
      state.frozen !== null &&
      JSON.stringify(state.frozen.inputs) !== JSON.stringify(state.draft),
    [state.draft, state.frozen],
  );

  const value = useMemo<AppContextValue>(
    () => ({
      runtime,
      dataSource,
      state,
      dispatch,
      runSimulation,
      cancelSimulation: () => controller.current?.abort(),
      isDraftStale,
      selectedRuns: (runs) =>
        state.comparison
          .map((id) => runs.find((run) => run.id === id))
          .filter((run): run is TestRunView => Boolean(run)),
    }),
    [dataSource, isDraftStale, runSimulation, runtime, state],
  );
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function HydroCycleProviders({
  runtime,
  children,
}: {
  runtime: HydroCycleRuntimeConfig;
  children: ReactNode;
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { retry: 1, staleTime: 10_000 } },
      }),
  );
  return (
    <QueryClientProvider client={queryClient}>
      <AppStateProvider runtime={runtime}>{children}</AppStateProvider>
    </QueryClientProvider>
  );
}

export function useHydroCycle(): AppContextValue {
  const value = useContext(AppContext);
  if (!value)
    throw new Error("useHydroCycle must be used inside HydroCycleProviders.");
  return value;
}
