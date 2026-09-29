import { readFileSync } from "node:fs";
import { URL } from "node:url";
import { runInNewContext } from "node:vm";

import { describe, expect, it } from "vitest";

type Parameters = Record<string, number | boolean>;
interface Scene {
  parts: Array<{ id: string }>;
  meshes: Array<{ vertices: number[] }>;
}
interface CadModel {
  defaults: Parameters;
  kinematics: (parameters: Parameters, angle: number) => { volumeCc: number };
  buildScene: (parameters: Parameters) => Scene;
  document: (parameters: Parameters) => {
    validation: string;
    physics: Record<string, null>;
  };
  parseDocument: (text: string) => Parameters;
  toOBJ: (scene: Scene) => string;
}

const html = readFileSync(
  new URL("../../public/hydrocycle-cad.html", import.meta.url),
  "utf8",
);
const source =
  /<script id="hydrocycle-model-source">([\s\S]*?)<\/script>/.exec(html)?.[1];
if (!source) throw new Error("Published CAD document has no geometry model.");
const sandbox = { module: { exports: {} as unknown } };
runInNewContext(source, sandbox);
const model = sandbox.module.exports as CadModel;

// Verify the exact portable document shipped by Next's public asset pipeline.
describe("CAD concept document", () => {
  it("is self-contained and has no remote service calls", () => {
    expect(html).not.toMatch(/<script[^>]+src=|<link[^>]+href=/);
    expect(html).not.toMatch(/\bfetch\s*\(|new\s+(WebSocket|XMLHttpRequest)/);
    expect(html).toContain("Symbols not to scale");
  });

  it("preserves exact kinematics and the legacy discrepancy", () => {
    expect(model.kinematics(model.defaults, 0).volumeCc).toBeCloseTo(
      55.555556,
      5,
    );
    expect(model.kinematics(model.defaults, 180).volumeCc).toBeCloseTo(
      555.555556,
      5,
    );
    const checkpoint = model.kinematics(model.defaults, -10).volumeCc;
    expect(checkpoint).toBeGreaterThan(60.43);
    expect(checkpoint).toBeLessThan(60.432);
    expect(checkpoint).not.toBeCloseTo(59.354, 2);
  });

  it("constructs eight stages with finite triangles", () => {
    const scene = model.buildScene(model.defaults);
    expect(scene.parts).toHaveLength(8);
    expect(scene.parts.map((part) => part.id)).toContain("ENG-601");
    for (const mesh of scene.meshes) {
      expect(mesh.vertices.length % 18).toBe(0);
      expect(mesh.vertices.every(Number.isFinite)).toBe(true);
    }
  });

  it("keeps unknown physical quantities null after editing assumptions", () => {
    const result = model.document({ ...model.defaults, bubbleNm: 400 });
    expect(result.validation).toBe("UNVALIDATED_CONCEPT");
    expect(result.physics).toEqual({
      hydrogenMassMg: null,
      waterVaporFraction: null,
      shaftPowerW: null,
    });
  });

  it("round-trips parameters and rejects unsupported documents", () => {
    const parameters = { ...model.defaults, boreMm: 90 };
    const text = JSON.stringify(model.document(parameters));
    expect(model.parseDocument(text)).toMatchObject(parameters);
    expect(() => model.parseDocument('{"schema":"other"}')).toThrow();
  });

  it("exports geometry rather than a renamed image", () => {
    const obj = model.toOBJ(model.buildScene(model.defaults));
    expect(obj).toMatch(/^v /m);
    expect(obj).toMatch(/^f /m);
    expect(obj).toContain("# units: millimeters");
    expect(obj).toContain("NOT FOR FABRICATION");
  });
});
