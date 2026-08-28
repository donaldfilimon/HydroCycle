import { API_PORT, resolveApiBaseUrl } from "../config";

/**
 * `AGENTS.md` hard invariant 7: the model service binds 127.0.0.1 with no
 * telemetry or cloud sync. Every origin this app can produce must therefore
 * terminate on host loopback. These tests fail loudly if someone later points
 * the app at a LAN address or a remote host to make a physical device work.
 */
describe("invariant 7: the API origin is always host loopback", () => {
  it("uses 127.0.0.1 on iOS, which shares the host network namespace", () => {
    expect(resolveApiBaseUrl("ios")).toBe(`http://127.0.0.1:${API_PORT}`);
  });

  it("uses 10.0.2.2 on Android, the emulator alias for host loopback", () => {
    expect(resolveApiBaseUrl("android")).toBe(`http://10.0.2.2:${API_PORT}`);
  });

  it.each(["ios", "android", "web", "windows", "macos"] as const)(
    "never produces a non-loopback host on %s",
    (platform) => {
      const { hostname, protocol } = new URL(resolveApiBaseUrl(platform));
      expect(["127.0.0.1", "10.0.2.2"]).toContain(hostname);
      expect(protocol).toBe("http:");
    },
  );

  it("never emits a cloud or LAN origin", () => {
    const url = resolveApiBaseUrl("ios");
    expect(url).not.toMatch(/https?:\/\/(?!127\.0\.0\.1|10\.0\.2\.2)/);
  });
});
