import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..", "out");
const forbidden = [
  "127.0.0.1:8000",
  "127.0.0.1:8787",
  "127.0.0.1:11434",
  "/Users/donaldfilimon",
  "OPENAI_API_KEY",
  "HYDROCYCLE_OLLAMA_MODEL=",
];
const inspectedExtensions = new Set([
  ".html",
  ".js",
  ".json",
  ".map",
  ".txt",
  ".css",
]);

async function files(directory: string): Promise<string[]> {
  const entries = await readdir(directory);
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const path = join(directory, entry);
      return (await stat(path)).isDirectory() ? files(path) : [path];
    }),
  );
  return nested.flat();
}

const candidates = (await files(root)).filter((path) =>
  inspectedExtensions.has(path.slice(path.lastIndexOf("."))),
);
const findings: string[] = [];
for (const path of candidates) {
  const contents = await readFile(path, "utf8");
  for (const token of forbidden)
    if (contents.includes(token)) findings.push(`${path}: ${token}`);
}
if (findings.length > 0) {
  throw new Error(
    `Hosted artifact contains local-only data:\n${findings.join("\n")}`,
  );
}
process.stdout.write(
  `Hosted artifact inspection passed (${candidates.length} text assets).\n`,
);
