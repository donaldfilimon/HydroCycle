export type HydroCycleWebMode = "local" | "hosted";

export interface DataSourceCapabilities {
  persistence: "durable" | "session";
  rawFileImport: boolean;
  export: boolean;
  mutation: boolean;
  simulation: boolean;
  advisory: "local-ollama" | "guided-fixture";
  disabledReason: string | null;
}

export interface HydroCycleRuntimeConfig {
  mode: HydroCycleWebMode;
  basePath: string;
  capabilities: DataSourceCapabilities;
}

export function runtimeConfigFromEnvironment(): HydroCycleRuntimeConfig {
  const mode: HydroCycleWebMode =
    process.env.HYDROCYCLE_WEB_MODE === "hosted" ? "hosted" : "local";
  const pages = process.env.HYDROCYCLE_DEPLOY_TARGET === "pages";
  return {
    mode,
    basePath: pages ? "/HydroCycle" : "",
    capabilities:
      mode === "local"
        ? {
            persistence: "durable",
            rawFileImport: true,
            export: true,
            mutation: true,
            simulation: true,
            advisory: "local-ollama",
            disabledReason: null,
          }
        : {
            persistence: "session",
            rawFileImport: false,
            export: true,
            mutation: true,
            simulation: true,
            advisory: "guided-fixture",
            disabledReason:
              "Raw file import requires the local validated model service.",
          },
  };
}
