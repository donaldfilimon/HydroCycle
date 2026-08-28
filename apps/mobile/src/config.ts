import { Platform } from "react-native";

/**
 * Origin of the local HydroCycle model service.
 *
 * `AGENTS.md` hard invariant 7 binds the service to `127.0.0.1` with no
 * telemetry or cloud sync, and this app does not relax that. Both origins
 * below terminate on the host's loopback interface:
 *
 * - iOS Simulator shares the host network namespace, so `127.0.0.1` is the
 *   host directly.
 * - The Android emulator reserves `10.0.2.2` as its alias for host loopback.
 *
 * A physical device over Wi-Fi can reach neither, which is why V1 is
 * simulator/emulator only. Supporting a real device would require binding the
 * service beyond loopback — an explicit invariant change, not a config tweak.
 */
export const API_PORT = 8000;

export function resolveApiBaseUrl(
  platform: typeof Platform.OS = Platform.OS,
): string {
  const host = platform === "android" ? "10.0.2.2" : "127.0.0.1";
  return `http://${host}:${API_PORT}`;
}

export const API_BASE_URL = resolveApiBaseUrl();

/** Simulations run Cantera server-side and are not instant. */
export const SIMULATION_TIMEOUT_MS = 45_000;
export const HEALTH_TIMEOUT_MS = 3_000;
